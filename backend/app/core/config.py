try:
    from pydantic_settings import BaseSettings
    from pydantic import AnyHttpUrl, EmailStr
    PV2 = True
except Exception:
    from pydantic import BaseSettings, AnyHttpUrl, EmailStr
    PV2 = False
from typing import List, Optional
import secrets
import os


def _cors_validator(name: str):
    # Return a decorator compatible with pydantic v1 `validator` or v2 `field_validator`.
    if PV2:
        from pydantic import field_validator 
        return field_validator(name, mode="before")
    else:
        from pydantic import validator
        return validator(name, pre=True, allow_reuse=True)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Chitralekh"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"
    DATABASE_URL_SYNC: str = "sqlite:///:memory:"
    REDIS_URL: str = "redis://localhost:6379/0"

    BACKEND_CORS_ORIGINS: List[str] = []

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: EmailStr = "noreply@notesapp.com"

    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    @_cors_validator("BACKEND_CORS_ORIGINS")
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(i).strip() for i in parsed if str(i).strip()]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(i).strip() for i in v if str(i).strip()]
        return v

    if PV2:
        model_config = {
            "case_sensitive": True,
            "env_file": ".env",
            "extra": "allow",
        }
    else:
        class Config:
            case_sensitive = True
            env_file = ".env"
            extra = "allow"


## Map common environment variable names to the expected settings names so
## deployments that set `CORS_ORIGINS`, `APP_NAME`, or `APP_VERSION` still work.
if os.environ.get("CORS_ORIGINS") and not os.environ.get("BACKEND_CORS_ORIGINS"):
    os.environ["BACKEND_CORS_ORIGINS"] = os.environ["CORS_ORIGINS"]
if os.environ.get("APP_NAME") and not os.environ.get("PROJECT_NAME"):
    os.environ["PROJECT_NAME"] = os.environ["APP_NAME"]
if os.environ.get("APP_VERSION") and not os.environ.get("VERSION"):
    os.environ["VERSION"] = os.environ["APP_VERSION"]

settings = Settings()