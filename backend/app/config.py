import os
import tomllib
from functools import lru_cache
from pathlib import Path

class Settings:
    DEBUG: bool = True
    PROJECT_NAME: str = "WAVER"
    HOST: str = "0.0.0.0"
    PORT: int = 19001
    CORS_ORIGINS: list = ["*"]
    
    NETEASE_API_BASE: str = "http://localhost:19002"
    
    STORAGE_PATH: str = ".waver"
    
    DB_ENABLED: bool = True
    DB_URL: str = "sqlite:///./.waver/waver.db"
    DB_NAME: str = "waver"

    def __init__(self):
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
                
                app_config = config.get("app", {})
                self.DEBUG = app_config.get("debug", self.DEBUG)
                self.PROJECT_NAME = app_config.get("name", self.PROJECT_NAME)
                self.HOST = app_config.get("host", self.HOST)
                self.PORT = app_config.get("port", self.PORT)
                
                self.CORS_ORIGINS = config.get("cors", {}).get("origins", self.CORS_ORIGINS)
                
                self.NETEASE_API_BASE = config.get("netease", {}).get("api_base", self.NETEASE_API_BASE)
                
                self.STORAGE_PATH = config.get("storage", {}).get("path", self.STORAGE_PATH)
                
                db_config = config.get("database", {})
                self.DB_ENABLED = db_config.get("enabled", self.DB_ENABLED)
                self.DB_URL = db_config.get("url", self.DB_URL)
                self.DB_NAME = db_config.get("name", self.DB_NAME)
                
                print(f"Loaded configuration from {config_path.absolute()}")
            except Exception as e:
                print(f"Error loading config.toml: {e}")
        
        # Environment variables override (for Docker)
        if os.getenv('NETEASE_API_BASE'):
            self.NETEASE_API_BASE = os.getenv('NETEASE_API_BASE')
            print(f"NETEASE_API_BASE overridden by env: {self.NETEASE_API_BASE}")
        
        if os.getenv('DEBUG'):
            self.DEBUG = os.getenv('DEBUG').lower() == 'true'
        if os.getenv('HOST'):
            self.HOST = os.getenv('HOST')
        if os.getenv('PORT'):
            self.PORT = int(os.getenv('PORT'))

@lru_cache()
def get_settings():
    return Settings()
