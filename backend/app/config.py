import os
import tomllib
from functools import lru_cache
from pathlib import Path

class Settings:
    # Defaults
    DEBUG: bool = True
    PROJECT_NAME: str = "WAVER"
    HOST: str = "0.0.0.0"
    PORT: int = 18021
    CORS_ORIGINS: list = ["*"]
    
    # NetEase API Configuration
    NETEASE_API_BASE: str = "http://localhost:18012"
    
    # Storage
    STORAGE_PATH: str = "."
    SHARED_WAVES_FILE: str = "shared_waves.json"
    CHAT_MESSAGES_FILE: str = "chat_messages.json"
    
    # Database
    DB_ENABLED: bool = False
    DB_URL: str = "mysql+pymysql://root:root@mysql:3306/waver"
    DB_NAME: str = "waver"

    def __init__(self):
        # Try to load from config.toml
        # Check current directory and parent directory
        possible_paths = [
            Path("config.toml"),
            Path("../config.toml"),
            Path("/app/config.toml")
        ]
        
        config_path = None
        for path in possible_paths:
            if path.exists():
                config_path = path
                break
        
        if config_path:
            try:
                with open(config_path, "rb") as f:
                    config = tomllib.load(f)
                
                # App settings
                app_config = config.get("app", {})
                self.DEBUG = app_config.get("debug", self.DEBUG)
                self.PROJECT_NAME = app_config.get("name", self.PROJECT_NAME)
                self.HOST = app_config.get("host", self.HOST)
                self.PORT = app_config.get("port", self.PORT)
                
                # CORS
                self.CORS_ORIGINS = config.get("cors", {}).get("origins", self.CORS_ORIGINS)
                
                # NetEase
                self.NETEASE_API_BASE = config.get("netease", {}).get("api_base", self.NETEASE_API_BASE)
                
                # Storage
                storage_config = config.get("storage", {})
                self.STORAGE_PATH = storage_config.get("path", self.STORAGE_PATH)
                self.SHARED_WAVES_FILE = storage_config.get("shared_waves_file", self.SHARED_WAVES_FILE)
                self.CHAT_MESSAGES_FILE = storage_config.get("chat_messages_file", self.CHAT_MESSAGES_FILE)
                
                # Database
                db_config = config.get("database", {})
                self.DB_ENABLED = db_config.get("enabled", self.DB_ENABLED)
                self.DB_URL = db_config.get("url", self.DB_URL)
                self.DB_NAME = db_config.get("name", self.DB_NAME)
                
                print(f"Loaded configuration from {config_path.absolute()}")
            except Exception as e:
                print(f"Error loading config.toml: {e}")
        else:
            print("config.toml not found, using defaults/env vars")
            # Fallback to env vars if config file missing
            self.DEBUG = os.getenv('DEBUG', str(self.DEBUG)).lower() == 'true'
            self.PROJECT_NAME = os.getenv('PROJECT_NAME', self.PROJECT_NAME)
            self.HOST = os.getenv('HOST', self.HOST)
            self.PORT = int(os.getenv('PORT', str(self.PORT)))
            self.NETEASE_API_BASE = os.getenv('NETEASE_API_BASE', self.NETEASE_API_BASE)

@lru_cache()
def get_settings():
    return Settings()
