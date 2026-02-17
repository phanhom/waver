from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()

# Create engine only if DB is enabled
engine = None
SessionLocal = None

if settings.DB_ENABLED:
    try:
        # pool_recycle is important for MySQL to avoid connection timeouts
        engine = create_engine(
            settings.DB_URL, 
            pool_recycle=3600,
            pool_pre_ping=True
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
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
