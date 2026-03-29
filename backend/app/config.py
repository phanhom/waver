import os
import tomllib
from functools import lru_cache
from pathlib import Path


def _project_root_for_data() -> Path:
    """
    本地开发：仓库根目录（与 backend/、frontend/ 同级），数据在 <repo>/.waver。
    Docker 镜像内只有 backend 代码：根目录为 /app，数据在 /app/.waver（与 compose 挂载一致）。
    可用环境变量 WAVER_PROJECT_ROOT 覆盖。
    """
    if os.getenv("WAVER_PROJECT_ROOT"):
        return Path(os.getenv("WAVER_PROJECT_ROOT")).expanduser().resolve()
    here = Path(__file__).resolve().parent  # .../app
    backend_root = here.parent  # .../backend 或 /app
    parent = backend_root.parent
    if parent != backend_root and (parent / "frontend").is_dir():
        return parent
    return backend_root


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
    AI_TIMEOUT_SECONDS: float = 12.0
    AI_FAIL_OPEN: bool = False
    AI_TRUST_ENV: bool = False

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
                self.AI_TIMEOUT_SECONDS = float(ai_config.get("timeout_seconds", self.AI_TIMEOUT_SECONDS))
                self.AI_FAIL_OPEN = bool(ai_config.get("fail_open", self.AI_FAIL_OPEN))
                self.AI_TRUST_ENV = bool(ai_config.get("trust_env", self.AI_TRUST_ENV))

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
        if os.getenv('AI_TIMEOUT_SECONDS'):
            self.AI_TIMEOUT_SECONDS = float(os.getenv('AI_TIMEOUT_SECONDS'))
        if os.getenv('AI_FAIL_OPEN') is not None:
            self.AI_FAIL_OPEN = os.getenv('AI_FAIL_OPEN', '').lower() in ('1', 'true', 'yes')
        if os.getenv('AI_TRUST_ENV') is not None:
            self.AI_TRUST_ENV = os.getenv('AI_TRUST_ENV', '').lower() in ('1', 'true', 'yes')

        if os.getenv('RATE_LIMIT_ENABLED') is not None:
            self.RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', '').lower() in ('1', 'true', 'yes')
        if os.getenv('RATE_LIMIT_API_QPS'):
            self.RATE_LIMIT_API_QPS = int(os.getenv('RATE_LIMIT_API_QPS'))
        if os.getenv('RATE_LIMIT_CHAT_QPS'):
            self.RATE_LIMIT_CHAT_QPS = int(os.getenv('RATE_LIMIT_CHAT_QPS'))

        self._resolve_storage_paths()

    def _resolve_storage_paths(self) -> None:
        """统一数据目录，避免「在 backend 下启动」时落到 backend/.waver，与 Docker 挂载的仓库根 .waver 不一致。"""
        root = _project_root_for_data()
        if os.getenv("WAVER_DATA_DIR"):
            self.STORAGE_PATH = str(Path(os.getenv("WAVER_DATA_DIR")).expanduser().resolve())
            if self.DB_URL.startswith("sqlite:///"):
                self.DB_URL = f"sqlite:///{Path(self.STORAGE_PATH) / f'{self.DB_NAME}.db'}"
            print(f"WAVER_DATA_DIR: data directory {self.STORAGE_PATH}")
            return

        raw = self.STORAGE_PATH
        p = Path(raw)
        self.STORAGE_PATH = str(p.resolve() if p.is_absolute() else (root / raw).resolve())

        if self.DB_URL.startswith("sqlite:///"):
            rest = self.DB_URL[len("sqlite:///") :]
            dbp = Path(rest)
            if dbp.is_absolute():
                self.DB_URL = f"sqlite:///{dbp}"
            else:
                self.DB_URL = f"sqlite:///{(root / rest).resolve()}"
        print(f"Data directory: {self.STORAGE_PATH}")
        print(f"Database URL: {self.DB_URL}")


@lru_cache()
def get_settings():
    return Settings()
