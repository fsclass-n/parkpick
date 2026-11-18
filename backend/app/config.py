import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
load_dotenv(ROOT_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    app_env = os.getenv("APP_ENV", "development")
    jwt_secret_key = os.getenv("JWT_SECRET_KEY") or "dev-only-jwt-secret"
    jwt_expire_minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
    admin_secret_key = os.getenv("ADMIN_SECRET_KEY", "")
    admin_email = os.getenv("ADMIN_EMAIL", "")
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    database_url = os.getenv("DATABASE_URL") or f"sqlite:///{(BACKEND_DIR / 'storage' / 'parkpick.db').as_posix()}"
    cors_origins = [o.strip() for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,https://parkpick.netlify.app,https://parkpick.onrender.com"
    ).split(",") if o.strip()]
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
    simulator_enabled = _bool("SIMULATOR_ENABLED", True)
    simulator_interval_sec = float(os.getenv("SIMULATOR_INTERVAL_SEC", "3"))
    gemini_api_key = os.getenv("GEMINI_API_KEY", "")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    ai_ingest_token = os.getenv("AI_INGEST_TOKEN", "")
    oauth = {
        provider: {
            "client_id": os.getenv(f"{provider.upper()}_CLIENT_ID", ""),
            "client_secret": os.getenv(f"{provider.upper()}_CLIENT_SECRET", ""),
        }
        for provider in ("google", "naver", "kakao")
    }


settings = Settings()
