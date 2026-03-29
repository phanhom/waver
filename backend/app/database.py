from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings
import os

settings = get_settings()

# Create engine only if DB is enabled
engine = None
SessionLocal = None

if settings.DB_ENABLED:
    try:
        # Ensure storage directory exists
        storage_dir = os.path.dirname(settings.DB_URL.replace("sqlite:///", ""))
        if storage_dir and not os.path.exists(storage_dir):
            os.makedirs(storage_dir, exist_ok=True)
            print(f"Created storage directory: {storage_dir}")
        
        # Check if using SQLite
        is_sqlite = settings.DB_URL.startswith("sqlite")
        
        if is_sqlite:
            # SQLite specific settings
            engine = create_engine(
                settings.DB_URL,
                connect_args={"check_same_thread": False}  # Required for SQLite
            )
        else:
            # MySQL settings
            engine = create_engine(
                settings.DB_URL, 
                pool_recycle=3600,
                pool_pre_ping=True
            )
        
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        print(f"Database engine created: {settings.DB_URL}")
    except Exception as e:
        print(f"Error creating database engine: {e}")

Base = declarative_base()

def get_db():
    if SessionLocal is None:
        return None
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    if engine is not None:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized")
