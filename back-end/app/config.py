import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_NAME = "GerenciadorPedidos"
DEFAULT_DATABASE_HOST = "localhost"
DEFAULT_DATABASE_PORT = 3306
DEFAULT_DATABASE_USER = "gerenciador"
DEFAULT_LOW_STOCK_LIMIT = 10
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5500",
    "http://127.0.0.1:5500",
)

load_dotenv(BACKEND_ROOT / ".env")


def _read_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    normalized_value = value.strip().lower()
    if normalized_value in {"true", "1", "yes", "on"}:
        return True
    if normalized_value in {"false", "0", "no", "off"}:
        return False
    raise ValueError(f"A variável {name} deve conter um valor booleano válido.")


def _read_origins() -> tuple[str, ...]:
    configured_origins = os.getenv("CORS_ORIGINS")
    if configured_origins is None:
        return DEFAULT_CORS_ORIGINS

    return tuple(
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    )


@dataclass(frozen=True)
class Settings:
    database_host: str = os.getenv("DB_HOST", DEFAULT_DATABASE_HOST)
    database_port: int = int(
        os.getenv("DB_PORT", str(DEFAULT_DATABASE_PORT))
    )
    database_name: str = os.getenv("MYSQL_DATABASE", DEFAULT_DATABASE_NAME)
    database_user: str = os.getenv("MYSQL_USER", DEFAULT_DATABASE_USER)
    database_password: str = os.getenv("MYSQL_PASSWORD", "")
    cors_origins: tuple[str, ...] = _read_origins()
    cors_allow_credentials: bool = _read_bool("CORS_ALLOW_CREDENTIALS", False)
    low_stock_limit: int = int(
        os.getenv("LOW_STOCK_LIMIT", str(DEFAULT_LOW_STOCK_LIMIT))
    )


settings = Settings()