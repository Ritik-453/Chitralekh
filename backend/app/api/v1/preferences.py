from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models import UserPreferences
from app.schemas import UserPreferencesUpdate, UserPreferencesResponse

router = APIRouter()


@router.get("", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    preferences = result.scalar_one_or_none()
    
    if not preferences:
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)
        await db.commit()
        await db.refresh(preferences)
    
    return preferences


@router.patch("", response_model=UserPreferencesResponse)
async def update_preferences(
    prefs_update: UserPreferencesUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    preferences = result.scalar_one_or_none()
    
    if not preferences:
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)
    
    update_data = prefs_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)
    
    await db.commit()
    await db.refresh(preferences)
    return preferences


@router.post("/reset")
async def reset_preferences(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    preferences = result.scalar_one_or_none()
    
    if preferences:
        await db.delete(preferences)
        await db.commit()
    
    new_preferences = UserPreferences(user_id=current_user.id)
    db.add(new_preferences)
    await db.commit()
    await db.refresh(new_preferences)
    return new_preferences


@router.get("/storage-paths")
async def get_storage_paths(
    current_user = Depends(get_current_active_user),
):
    import os
    import platform

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    db_filename = "notes_app.db"
    db_path = os.path.abspath(os.path.join(base_dir, db_filename))
    uploads_dir = os.path.abspath(os.path.join(base_dir, "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)

    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    uploads_size = 0
    uploads_count = 0
    if os.path.exists(uploads_dir):
        for root, _, files in os.walk(uploads_dir):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    uploads_size += os.path.getsize(fp)
                    uploads_count += 1
                except Exception:
                    pass

    return {
        "database_path": db_path,
        "database_filename": db_filename,
        "database_exists": os.path.exists(db_path),
        "database_size_bytes": db_size,
        "uploads_path": uploads_dir,
        "uploads_exists": os.path.exists(uploads_dir),
        "uploads_size_bytes": uploads_size,
        "uploads_file_count": uploads_count,
        "os_name": platform.system(),
        "platform_release": platform.release(),
    }