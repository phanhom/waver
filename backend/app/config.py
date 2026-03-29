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
    
    # AI Settings
    AI_ENABLED: bool = False
    AI_API_BASE: str = "https://api.openai.com/v1"
    AI_API_KEY: str = ""
    AI_MODEL_NAME: str = "gpt-3.5-turbo"
    AI_MODERATION_PROMPT: str = "You are a chat moderator. If the following message contains illegal, offensive, or harmful content, output 'BLOCK'. Otherwise, output 'PASS'. Only output one of these two words. Message: "

    # Rate limiting (limits library via middleware + socket chat window)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_API_QPS: int = 20
    RATE_LIMIT_CHAT_QPS: int = 5

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
                
                ai_config = config.get("ai", {})
                self.AI_ENABLED = ai_config.get("enabled", self.AI_ENABLED)
                self.AI_API_BASE = ai_config.get("api_base", self.AI_API_BASE)
                self.AI_API_KEY = ai_config.get("api_key", self.AI_API_KEY)
                self.AI_MODEL_NAME = ai_config.get("model_name", self.AI_MODEL_NAME)
                self.AI_MODERATION_PROMPT = ai_config.get("moderation_prompt", self.AI_MODERATION_PROMPT)

                rl = config.get("rate_limit", {})
                self.RATE_LIMIT_ENABLED = rl.get("enabled", self.RATE_LIMIT_ENABLED)
                self.RATE_LIMIT_API_QPS = int(rl.get("api_qps", self.RATE_LIMIT_API_QPS))
                self.RATE_LIMIT_CHAT_QPS = int(rl.get("chat_qps", self.RATE_LIMIT_CHAT_QPS))
                
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

        # AI moderation (optional env override for Docker / secrets)
        if os.getenv('AI_ENABLED') is not None:
            self.AI_ENABLED = os.getenv('AI_ENABLED', '').lower() in ('1', 'true', 'yes')
        if os.getenv('AI_API_BASE'):
            self.AI_API_BASE = os.getenv('AI_API_BASE')
        if os.getenv('AI_API_KEY'):
            self.AI_API_KEY = os.getenv('AI_API_KEY')
        if os.getenv('AI_MODEL_NAME'):
            self.AI_MODEL_NAME = os.getenv('AI_MODEL_NAME')

        if os.getenv('RATE_LIMIT_ENABLED') is not None:
            self.RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', '').lower() in ('1', 'true', 'yes')
        if os.getenv('RATE_LIMIT_API_QPS'):
            self.RATE_LIMIT_API_QPS = int(os.getenv('RATE_LIMIT_API_QPS'))
        if os.getenv('RATE_LIMIT_CHAT_QPS'):
            self.RATE_LIMIT_CHAT_QPS = int(os.getenv('RATE_LIMIT_CHAT_QPS'))

@lru_cache()
def get_settings():
    return Settings()
