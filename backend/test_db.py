import asyncio
from sqlalchemy import text
from app.core.database import engine


async def test_connection():
    try:
        async with engine.connect() as connection:
            dialect_name = engine.dialect.name
            if dialect_name == "sqlite":
                result = await connection.execute(text("SELECT sqlite_version()"))
                version = result.scalar()
                print(f"DIALECT: sqlite")
                print(f"SQLITE VERSION: {version}")
                print("[SUCCESS] SQLite connection successful!")
            else:
                result = await connection.execute(text("SELECT DATABASE(), VERSION()"))
                row = result.fetchone()
                print("DATABASE:", row[0])
                print("VERSION:", row[1])
                print(f"[SUCCESS] {dialect_name.upper()} connection successful!")

    except Exception as e:
        print("[FAILED] Database connection failed!")
        print(type(e).__name__)
        print(e)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_connection())