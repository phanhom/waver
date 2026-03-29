import logging
import os

# Ensure app loggers (e.g. app.services.ai) show INFO on the console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import music
from .config import get_settings
from .database import init_db, SessionLocal
from .models import SharedWave, ChatMessage, Comment
from sqlalchemy import desc
from .services.ai import ai_service
from .rate_limiting import ApiRateLimitMiddleware, allow_chat_message

settings = get_settings()

# Initialize Database
init_db()

# Create FastAPI app
app = FastAPI(title=settings.PROJECT_NAME)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    ApiRateLimitMiddleware,
    enabled=settings.RATE_LIMIT_ENABLED,
    api_qps=settings.RATE_LIMIT_API_QPS,
)

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, app)

# Include routers
app.include_router(music.router, prefix="/api")

# Ensure storage directory exists
if not os.path.exists(settings.STORAGE_PATH):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    print(f"Created storage directory: {settings.STORAGE_PATH}")

# Helper to get DB session
def get_db_session():
    return SessionLocal()

# Helper to load shared waves from DB
def load_shared_waves():
    db = get_db_session()
    try:
        waves = db.query(SharedWave).order_by(desc(SharedWave.timestamp)).limit(50).all()
        return [w.to_dict() for w in waves]
    except Exception as e:
        print(f"Error loading waves from DB: {e}")
        return []
    finally:
        db.close()

# Helper to load chat messages from DB
def load_chat_messages():
    db = get_db_session()
    try:
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.visible_to_all == 1)
            .filter(ChatMessage.moderation_status == "pass")
            .order_by(desc(ChatMessage.timestamp))
            .limit(200)
            .all()
        )
        return [m.to_dict() for m in reversed(messages)]
    except Exception as e:
        print(f"Error loading chat from DB: {e}")
        return []
    finally:
        db.close()

# In-memory stores
active_listeners = {}  # sid -> {user, song, state, last_updated}
room_states = {}  # room -> {sid, song, state, time}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    # Send history to new connection
    waves = load_shared_waves()
    await sio.emit('shared_waves_history', waves, to=sid)
    
    await sio.emit('active_listeners_list', list(active_listeners.values()), to=sid)
    
    # Send chat history to new connection
    messages = load_chat_messages()
    await sio.emit('chat_history', messages, to=sid)
    
    # Add official WAVER user to active listeners
    official_user = {
        "user": {
            "userId": "waver_official",
            "name": "WAVER",
            "avatar": "/icon.svg"
        },
        "song": {
            "id": "464728417",
            "name": "By the Sleepy Lagoon",
            "artist": "Eric Coates",
            "albumArt": "https://picsum.photos/id/1000/200/200"
        },
        "state": "playing",
        "sid": "waver_official"
    }
    
    if "waver_official" not in active_listeners:
        active_listeners["waver_official"] = official_user
        await sio.emit('active_listeners_list', list(active_listeners.values()))

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in active_listeners and sid != "waver_official":
        del active_listeners[sid]
        await sio.emit('active_listeners_list', list(active_listeners.values()))

@sio.event
async def report_listening(sid, data):
    active_listeners[sid] = {
        **data,
        "sid": sid
    }
    await sio.emit('active_listeners_list', list(active_listeners.values()))

@sio.event
async def broadcast_wave(sid, data):
    wave_entry = {
        **data,
        "timestamp": data.get("timestamp", "")
    }
    
    db = get_db_session()
    try:
        new_wave = SharedWave(
            user_id=str(data.get('user', {}).get('userId')),
            user_data=data.get('user'),
            song_id=str(data.get('song', {}).get('id')) if data.get('song') else None,
            song_data=data.get('song'),
            playlist_id=str(data.get('playlist', {}).get('id')) if data.get('playlist') else None,
            playlist_data=data.get('playlist'),
            timestamp=wave_entry['timestamp'],
            likes_data=[],
            like_count=0
        )
        db.add(new_wave)
        db.commit()
        db.refresh(new_wave)
        
        # Cleanup old waves (keep 50)
        count = db.query(SharedWave).count()
        if count > 50:
            oldest = db.query(SharedWave).order_by(SharedWave.timestamp).first()
            if oldest:
                db.delete(oldest)
                db.commit()
        
        wave_entry = new_wave.to_dict()
        
    except Exception as e:
        print(f"Error saving wave to DB: {e}")
        db.rollback()
    finally:
        db.close()
    
    await sio.emit('wave_shared', wave_entry)
    print(f"Wave shared by {sid}: {data.get('playlist', {}).get('name') or data.get('song', {}).get('name')}")

@sio.event
async def cancel_wave(sid, data):
    db = get_db_session()
    try:
        query = db.query(SharedWave).filter(SharedWave.user_id == str(data.get('userId')))
        
        if data.get('playlistId'):
            query = query.filter(SharedWave.playlist_id == str(data.get('playlistId')))
        elif data.get('songId'):
            query = query.filter(SharedWave.song_id == str(data.get('songId')))
        
        wave_to_delete = query.first()
        if wave_to_delete:
            db.delete(wave_to_delete)
            db.commit()
    except Exception as e:
        print(f"Error deleting wave from DB: {e}")
        db.rollback()
    finally:
        db.close()
        
    waves = load_shared_waves()
    await sio.emit('shared_waves_history', waves)
    print(f"Wave canceled by {sid}: playlist={data.get('playlistId')}, song={data.get('songId')}")

@sio.event
async def join_room(sid, data):
    room = (data or {}).get('room', 'ocean')
    await sio.enter_room(sid, room)
    if room in room_states:
        await sio.emit('state_updated', room_states[room], to=sid)

@sio.event
async def update_state(sid, data):
    room = data.get('room', 'ocean')
    payload = {**data, 'sid': sid}
    room_states[room] = payload
    await sio.emit('state_updated', payload, room=room, skip_sid=sid)

@sio.event
async def chat_message(sid, data):
    if settings.RATE_LIMIT_ENABLED and not allow_chat_message(sid, settings.RATE_LIMIT_CHAT_QPS):
        await sio.emit('chat_error', {'message': '发送过于频繁，请稍后再试。'}, to=sid)
        return

    message_text = (data.get('message') or '').strip()
    if not message_text:
        return
    
    # 1. Length limit check (200 chars)
    if len(message_text) > 200:
        print(f"Chat message from {sid} blocked: too long ({len(message_text)} chars)")
        return

    # 2. Persist first (pending), then moderate asynchronously.
    message_row = None
    db = get_db_session()
    try:
        message_row = ChatMessage(
            user_id=str(data.get('user', {}).get('userId')),
            user_data=data.get('user'),
            message=message_text,
            timestamp=data.get('timestamp'),
            moderation_status='pending',
            visible_to_all=0,
        )
        db.add(message_row)
        db.commit()
        db.refresh(message_row)
        
        # Cleanup old messages (keep 200)
        count = db.query(ChatMessage).count()
        if count > 200:
            oldest = db.query(ChatMessage).order_by(ChatMessage.timestamp).first()
            if oldest:
                db.delete(oldest)
                db.commit()
    except Exception as e:
        print(f"Error saving chat to DB: {e}")
        db.rollback()
        await sio.emit('chat_error', {'message': '消息写入失败，请重试。'}, to=sid)
        return
    finally:
        db.close()

    pending_payload = message_row.to_dict()
    pending_payload["ownerOnly"] = True
    await sio.emit('chat_message_status', pending_payload, to=sid)
    print(f"Chat pending from {sid}: {data.get('user', {}).get('nickname')}: {message_text}")

    # 3. Run AI moderation. Update status and visibility.
    is_allowed = await ai_service.moderate_content(message_text)
    db = get_db_session()
    try:
        row = db.query(ChatMessage).filter(ChatMessage.id == message_row.id).first()
        if not row:
            return

        if is_allowed:
            row.moderation_status = 'pass'
            row.visible_to_all = 1
            db.commit()
            db.refresh(row)

            pass_payload = row.to_dict()
            pass_payload["ownerOnly"] = False
            await sio.emit('chat_message', pass_payload)
            print(f"Chat PASS from {sid}: {data.get('user', {}).get('nickname')}: {message_text}")
        else:
            row.moderation_status = 'block'
            row.visible_to_all = 0
            row.moderation_note = 'blocked_by_ai'
            db.commit()
            db.refresh(row)

            block_payload = row.to_dict()
            block_payload["ownerOnly"] = True
            await sio.emit('chat_message_status', block_payload, to=sid)
            await sio.emit('chat_error', {'message': '您的消息包含违规内容，已被系统拦截。'}, to=sid)
            print(f"Chat BLOCK from {sid}: {data.get('user', {}).get('nickname')}: {message_text}")
    except Exception as e:
        print(f"Error updating chat moderation result: {e}")
        db.rollback()
    finally:
        db.close()

@sio.event
async def get_chat_history(sid):
    messages = load_chat_messages()
    await sio.emit('chat_history', messages, to=sid)
    print(f"Sent chat history to {sid}")

@sio.event
async def like_wave(sid, data):
    wave_id = data.get('waveId')
    playlist_id = data.get('playlistId')
    song_id = data.get('songId')
    user = data.get('user')
    user_id = user.get('userId')
    
    updated_wave = None
    db = get_db_session()
    try:
        query = db.query(SharedWave)
        if wave_id:
            query = query.filter(SharedWave.id == wave_id)
        elif playlist_id:
            query = query.filter(SharedWave.playlist_id == str(playlist_id))
        elif song_id:
            query = query.filter(SharedWave.song_id == str(song_id))
        
        wave = query.first()
        if wave:
            likes = wave.likes_data or []
            already_liked = any(like.get('userId') == user_id for like in likes)
            
            if not already_liked:
                likes.append({
                    'userId': user_id,
                    'user': user
                })
                wave.likes_data = list(likes)
                wave.like_count = len(likes)
                db.commit()
                db.refresh(wave)
                updated_wave = wave.to_dict()
    except Exception as e:
        print(f"Error liking wave in DB: {e}")
        db.rollback()
    finally:
        db.close()
    
    if updated_wave:
        await sio.emit('wave_liked', updated_wave)
        print(f"Wave liked by {sid}: {user.get('nickname')}")

@sio.event
async def unlike_wave(sid, data):
    wave_id = data.get('waveId')
    playlist_id = data.get('playlistId')
    song_id = data.get('songId')
    user_id = data.get('userId')
    
    updated_wave = None
    db = get_db_session()
    try:
        query = db.query(SharedWave)
        if wave_id:
            query = query.filter(SharedWave.id == wave_id)
        elif playlist_id:
            query = query.filter(SharedWave.playlist_id == str(playlist_id))
        elif song_id:
            query = query.filter(SharedWave.song_id == str(song_id))
        
        wave = query.first()
        if wave:
            likes = wave.likes_data or []
            original_count = len(likes)
            new_likes = [like for like in likes if like.get('userId') != user_id]
            
            if len(new_likes) != original_count:
                wave.likes_data = list(new_likes)
                wave.like_count = len(new_likes)
                db.commit()
                db.refresh(wave)
                updated_wave = wave.to_dict()
    except Exception as e:
        print(f"Error unliking wave in DB: {e}")
        db.rollback()
    finally:
        db.close()

    if updated_wave:
        await sio.emit('wave_unliked', updated_wave)
        print(f"Wave unliked by {sid}: userId={user_id}")

@sio.event
async def add_comment(sid, data):
    db = get_db_session()
    try:
        new_comment = Comment(
            resource_id=str(data.get('resourceId')),
            resource_type=data.get('resourceType'),
            user_id=str(data.get('user', {}).get('userId')),
            user_data=data.get('user'),
            content=data.get('content'),
            timestamp=data.get('timestamp')
        )
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)
        
        await sio.emit('comment_added', new_comment.to_dict())
        print(f"Comment added by {sid} on {data.get('resourceType')} {data.get('resourceId')}")
    except Exception as e:
        print(f"Error saving comment to DB: {e}")
        db.rollback()
    finally:
        db.close()

@sio.event
async def get_comments(sid, data):
    resource_id = str(data.get('resourceId'))
    resource_type = data.get('resourceType')
    
    db = get_db_session()
    try:
        comments = db.query(Comment).filter(
            Comment.resource_id == resource_id,
            Comment.resource_type == resource_type
        ).order_by(desc(Comment.timestamp)).all()
        
        result = [c.to_dict() for c in comments]
        await sio.emit('comments_loaded', {'resourceId': resource_id, 'comments': result}, to=sid)
    except Exception as e:
        print(f"Error loading comments from DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    uvicorn.run("app.main:sio_app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
