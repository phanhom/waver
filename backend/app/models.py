from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.sql import func
from .database import Base
import datetime

class SharedWave(Base):
    __tablename__ = "shared_waves"

    id = Column(Integer, primary_key=True, index=True)
    
    # Store user.userId for quick lookup
    user_id = Column(String(255), index=True) 
    # Store full user object as JSON
    user_data = Column(JSON) 
    
    # Song info
    song_id = Column(String(255), index=True, nullable=True)
    song_data = Column(JSON, nullable=True)
    
    # Playlist info
    playlist_id = Column(String(255), index=True, nullable=True)
    playlist_data = Column(JSON, nullable=True)
    
    # Timestamp
    # We store as string to preserve exact client format if needed, 
    # or we could use DateTime. For flexibility with existing frontend, 
    # let's use String for now, but index it.
    timestamp = Column(String(64), index=True)
    
    # Likes
    likes_data = Column(JSON, default=list) # Store list of likes
    like_count = Column(Integer, default=0)
    
    def to_dict(self):
        return {
            "id": str(self.id), # Convert int ID to string for frontend
            "user": self.user_data,
            "song": self.song_data,
            "playlist": self.playlist_data,
            "timestamp": self.timestamp,
            "likes": self.likes_data or [],
            "likeCount": self.like_count
        }

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), index=True)
    user_data = Column(JSON)
    message = Column(Text)
    timestamp = Column(String(64), index=True)
    
    def to_dict(self):
        return {
            "user": self.user_data,
            "message": self.message,
            "timestamp": self.timestamp
        }

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    
    # The ID of the resource being commented on (song_id or playlist_id)
    resource_id = Column(String(255), index=True)
    # Type of resource: 'song' or 'playlist'
    resource_type = Column(String(50), index=True)
    
    # User who made the comment
    user_id = Column(String(255), index=True)
    user_data = Column(JSON)
    
    content = Column(Text)
    timestamp = Column(String(64))
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "resourceId": self.resource_id,
            "resourceType": self.resource_type,
            "user": self.user_data,
            "content": self.content,
            "timestamp": self.timestamp
        }

class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    
    # The ID of the resource being liked (song_id or playlist_id)
    resource_id = Column(String(255), index=True)
    # Type of resource: 'song' or 'playlist'
    resource_type = Column(String(50), index=True)
    
    # User who liked
    user_id = Column(String(255), index=True)
    user_data = Column(JSON)
    
    timestamp = Column(String(64))
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "resourceId": self.resource_id,
            "resourceType": self.resource_type,
            "user": self.user_data,
            "timestamp": self.timestamp
        }
