import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import music
from .config import get_settings
from .database import init_db, SessionLocal
from .models import SharedWave, ChatMessage, Comment, Like
from sqlalchemy import desc, or_
import os
import json

settings = get_settings()

# Initialize Database
if settings.DB_ENABLED:
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

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, app)

# Include routers
app.include_router(music.router, prefix="/api")

# File path for persistent storage (fallback)
STORAGE_FILE = os.path.join(settings.STORAGE_PATH, settings.SHARED_WAVES_FILE)
CHAT_STORAGE_FILE = os.path.join(settings.STORAGE_PATH, settings.CHAT_MESSAGES_FILE)

# Helper to get DB session
def get_db_session():
    if settings.DB_ENABLED:
        return SessionLocal()
    return None

# Helper to load shared waves (from DB or file)
def load_shared_waves():
    if settings.DB_ENABLED:
        db = get_db_session()
        try:
            waves = db.query(SharedWave).order_by(desc(SharedWave.timestamp)).limit(50).all()
            return [w.to_dict() for w in waves]
        except Exception as e:
            print(f"Error loading waves from DB: {e}")
            return []
        finally:
            db.close()
    else:
        # Fallback to file
        try:
            if os.path.exists(STORAGE_FILE):
                with open(STORAGE_FILE, "r") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading shared waves from file: {e}")
        return []

# Helper to load chat messages (from DB or file)
def load_chat_messages():
    if settings.DB_ENABLED:
        db = get_db_session()
        try:
            # Chat messages are usually displayed oldest to newest, but we want the last 200
            # So we query last 200 (desc timestamp) and then reverse them
            messages = db.query(ChatMessage).order_by(desc(ChatMessage.timestamp)).limit(200).all()
            return [m.to_dict() for m in reversed(messages)]
        except Exception as e:
            print(f"Error loading chat from DB: {e}")
            return []
        finally:
            db.close()
    else:
        # Fallback to file
        try:
            if os.path.exists(CHAT_STORAGE_FILE):
                with open(CHAT_STORAGE_FILE, "r") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading chat messages from file: {e}")
        return []

# Other in-memory stores
rooms = {} 
active_listeners = {} # sid -> {user, song, state, last_updated}
room_states = {} # room -> {sid, song, state, time}

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
    
    # Add to active listeners if not already present
    if "waver_official" not in active_listeners:
        active_listeners["waver_official"] = official_user
        await sio.emit('active_listeners_list', list(active_listeners.values()))

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Don't remove official user even if disconnected
    if sid in active_listeners and sid != "waver_official":
        del active_listeners[sid]
        await sio.emit('active_listeners_list', list(active_listeners.values()))

@sio.event
async def report_listening(sid, data):
    # data: {user: {...}, song: {...}, state: 'playing'/'paused', followingSid: string | null}
    active_listeners[sid] = {
        **data,
        "sid": sid
    }
    # Broadcast the pulse of active users
    await sio.emit('active_listeners_list', list(active_listeners.values()))

@sio.event
async def broadcast_wave(sid, data):
    # data: {playlist: {...}, tracks: [...], user: {...}}
    wave_entry = {
        **data,
        "timestamp": data.get("timestamp", "")
    }
    
    if settings.DB_ENABLED:
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
            # This is a bit heavy, maybe do it periodically or async, but for now it's fine
            count = db.query(SharedWave).count()
            if count > 50:
                # Delete oldest
                oldest = db.query(SharedWave).order_by(SharedWave.timestamp).first()
                if oldest:
                    db.delete(oldest)
                    db.commit()
            
            # Update wave_entry with ID from DB
            wave_entry = new_wave.to_dict()
            
        except Exception as e:
            print(f"Error saving wave to DB: {e}")
            db.rollback()
        finally:
            db.close()
    else:
        # Fallback to file
        shared_waves = load_shared_waves()
        shared_waves.insert(0, wave_entry)
        if len(shared_waves) > 50:
            shared_waves.pop()
        try:
            with open(STORAGE_FILE, "w") as f:
                json.dump(shared_waves, f, indent=2)
        except Exception as e:
            print(f"Error saving shared waves to file: {e}")
    
    # Broadcast to everyone
    await sio.emit('wave_shared', wave_entry)
    print(f"Wave shared by {sid}: {data.get('playlist', {}).get('name') or data.get('song', {}).get('name')}")

@sio.event
async def cancel_wave(sid, data):
    # data: {playlistId: string, songId: string, userId: string}
    
    if settings.DB_ENABLED:
        db = get_db_session()
        try:
            # Find the wave
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
            
        # Broadcast updated list
        waves = load_shared_waves()
        await sio.emit('shared_waves_history', waves)
    else:
        # Fallback to file
        shared_waves = load_shared_waves()
        shared_waves = [w for w in shared_waves if 
                        not (w.get('user', {}).get('userId') == data.get('userId') and 
                             ((w.get('playlist') and w.get('playlist').get('id') == data.get('playlistId')) or 
                              (w.get('song') and w.get('song').get('id') == data.get('songId'))))]
        try:
            with open(STORAGE_FILE, "w") as f:
                json.dump(shared_waves, f, indent=2)
        except Exception as e:
            print(f"Error saving shared waves to file: {e}")
        await sio.emit('shared_waves_history', shared_waves)
        
    print(f"Wave canceled by {sid}: playlist={data.get('playlistId')}, song={data.get('songId')}")

@sio.event
async def join_room(sid, data):
    room = (data or {}).get('room', 'ocean')
    await sio.enter_room(sid, room)
    if room in room_states:
        await sio.emit('state_updated', room_states[room], to=sid)

@sio.event
async def update_state(sid, data):
    # data: {room: 'ocean', song: {...}, time: 123, state: 'playing'}
    room = data.get('room', 'ocean')
    payload = {**data, 'sid': sid}
    room_states[room] = payload
    await sio.emit('state_updated', payload, room=room, skip_sid=sid)

@sio.event
async def chat_message(sid, data):
    # data: {user: {...}, message: string, timestamp: string}
    
    if settings.DB_ENABLED:
        db = get_db_session()
        try:
            new_msg = ChatMessage(
                user_id=str(data.get('user', {}).get('userId')),
                user_data=data.get('user'),
                message=data.get('message'),
                timestamp=data.get('timestamp')
            )
            db.add(new_msg)
            db.commit()
            
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
        finally:
            db.close()
    else:
        # Fallback to file
        chat_messages = load_chat_messages()
        chat_messages.append(data)
        if len(chat_messages) > 200:
            chat_messages.pop(0)
        try:
            with open(CHAT_STORAGE_FILE, "w") as f:
                json.dump(chat_messages, f, indent=2)
        except Exception as e:
            print(f"Error saving chat messages to file: {e}")
    
    # Broadcast to everyone
    await sio.emit('chat_message', data)
    print(f"Chat message from {sid}: {data.get('user', {}).get('nickname')}: {data.get('message')}")

@sio.event
async def get_chat_history(sid):
    # Send chat history to the requesting client
    messages = load_chat_messages()
    await sio.emit('chat_history', messages, to=sid)
    print(f"Sent chat history to {sid}")

@sio.event
async def like_wave(sid, data):
    # data: {waveId, playlistId, songId, user}
    wave_id = data.get('waveId')
    playlist_id = data.get('playlistId')
    song_id = data.get('songId')
    user = data.get('user')
    user_id = user.get('userId')
    
    updated_wave = None
    
    if settings.DB_ENABLED:
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
                    wave.likes_data = list(likes) # Reassign to trigger update
                    wave.like_count = len(likes)
                    db.commit()
                    db.refresh(wave)
                    updated_wave = wave.to_dict()
        except Exception as e:
            print(f"Error liking wave in DB: {e}")
            db.rollback()
        finally:
            db.close()
    else:
        # Fallback to file
        shared_waves = load_shared_waves()
        for wave in shared_waves:
            if (wave_id and wave.get('id') == wave_id) or \
               (playlist_id and wave.get('playlist', {}).get('id') == playlist_id) or \
               (song_id and wave.get('song', {}).get('id') == song_id):
                
                already_liked = any(like.get('userId') == user_id for like in wave.get('likes', []))
                if not already_liked:
                    if 'likes' not in wave:
                        wave['likes'] = []
                    wave['likes'].append({
                        'userId': user_id,
                        'user': user
                    })
                    wave['likeCount'] = len(wave['likes'])
                    updated_wave = wave
                    
                    try:
                        with open(STORAGE_FILE, "w") as f:
                            json.dump(shared_waves, f, indent=2)
                    except Exception as e:
                        print(f"Error saving shared waves to file: {e}")
                break
    
    if updated_wave:
        await sio.emit('wave_liked', updated_wave)
        print(f"Wave liked by {sid}: {user.get('nickname')}")

@sio.event
async def unlike_wave(sid, data):
    # data: {waveId, playlistId, songId, userId}
    wave_id = data.get('waveId')
    playlist_id = data.get('playlistId')
    song_id = data.get('songId')
    user_id = data.get('userId')
    
    updated_wave = None
    
    if settings.DB_ENABLED:
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
    else:
        # Fallback to file
        shared_waves = load_shared_waves()
        for wave in shared_waves:
            if (wave_id and wave.get('id') == wave_id) or \
               (playlist_id and wave.get('playlist', {}).get('id') == playlist_id) or \
               (song_id and wave.get('song', {}).get('id') == song_id):
                
                original_like_count = len(wave.get('likes', []))
                if 'likes' in wave:
                    wave['likes'] = [like for like in wave['likes'] if like.get('userId') != user_id]
                
                wave['likeCount'] = len(wave.get('likes', []))
                
                if wave['likeCount'] != original_like_count:
                    updated_wave = wave
                    try:
                        with open(STORAGE_FILE, "w") as f:
                            json.dump(shared_waves, f, indent=2)
                    except Exception as e:
                        print(f"Error saving shared waves to file: {e}")
                break

    if updated_wave:
        await sio.emit('wave_unliked', updated_wave)
        print(f"Wave unliked by {sid}: userId={user_id}")

@sio.event
async def add_comment(sid, data):
    # data: {resourceId, resourceType, content, user, timestamp}
    if settings.DB_ENABLED:
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
            
            # Broadcast the new comment to everyone (or just the room if we had rooms for resources)
            # For now, broadcast to everyone, client filters by resourceId
            await sio.emit('comment_added', new_comment.to_dict())
            print(f"Comment added by {sid} on {data.get('resourceType')} {data.get('resourceId')}")
        except Exception as e:
            print(f"Error saving comment to DB: {e}")
            db.rollback()
        finally:
            db.close()
    else:
        # Fallback not implemented for comments as it requires complex file structure
        print("Comments require database to be enabled")

@sio.event
async def get_comments(sid, data):
    # data: {resourceId, resourceType}
    resource_id = str(data.get('resourceId'))
    resource_type = data.get('resourceType')
    
    if settings.DB_ENABLED:
        db = get_db_session()
        try:
            comments = db.query(Comment).filter(
                Comment.resource_id == resource_id,
                Comment.resource_type == resource_type
            ).order_by(desc(Comment.timestamp)).all()
            
            # Return oldest to newest usually for comments? Or newest first?
            # Let's return newest first as queried, client can reverse if needed
            result = [c.to_dict() for c in comments]
            await sio.emit('comments_loaded', {'resourceId': resource_id, 'comments': result}, to=sid)
        except Exception as e:
            print(f"Error loading comments from DB: {e}")
        finally:
            db.close()
    else:
        await sio.emit('comments_loaded', {'resourceId': resource_id, 'comments': []}, to=sid)

if __name__ == "__main__":
    # Use regular FastAPI app instead of Socket.IO app for now
    uvicorn.run("app.main:sio_app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
