from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


class Base(DeclarativeBase):
    pass


def get_engine_kwargs(database_url: str) -> dict:
    """Get engine kwargs based on database type."""
    if database_url.startswith("sqlite"):
        return { 
            "connect_args": {"check_same_thread": False},
            "poolclass": NullPool,
        }
    elif database_url.startswith("mysql"):
        return {
            "connect_args": {"charset": "utf8mb4"},
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 20,
        }
    elif database_url.startswith("postgresql"):
        return {
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 20,
        }
    return {}


def normalize_db_url(url: str) -> str:
    """Ensure PostgreSQL URLs use the asyncpg driver for async SQLAlchemy."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


_async_db_url = normalize_db_url(settings.DATABASE_URL)

engine = create_async_engine(
    _async_db_url,
    echo=settings.DEBUG,
    **get_engine_kwargs(_async_db_url),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def migrate_schema(sync_conn):
            from sqlalchemy import inspect, text
            inspector = inspect(sync_conn)
            table_names = inspector.get_table_names()

            # Migrate notes table
            if "notes" in table_names:
                note_cols = [c["name"] for c in inspector.get_columns("notes")]
                if "sync_to_cloud" not in note_cols:
                    sync_conn.execute(text("ALTER TABLE notes ADD COLUMN sync_to_cloud BOOLEAN DEFAULT 1"))

            # Migrate user_preferences table
            if "user_preferences" in table_names:
                pref_cols = [c["name"] for c in inspector.get_columns("user_preferences")]
                new_cols = [
                    ("google_drive_connected", "BOOLEAN DEFAULT 0"),
                    ("google_drive_email", "VARCHAR(255)"),
                    ("google_drive_folder_name", "VARCHAR(255) DEFAULT 'NotesApp_Sync'"),
                    ("auto_cloud_sync", "BOOLEAN DEFAULT 1"),
                    ("compress_before_upload", "BOOLEAN DEFAULT 1"),
                    ("last_synced_at", "DATETIME"),
                ]
                for col_name, col_type in new_cols:
                    if col_name not in pref_cols:
                        sync_conn.execute(text(f"ALTER TABLE user_preferences ADD COLUMN {col_name} {col_type}"))

        await conn.run_sync(migrate_schema)