from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models import Folder, Note
from app.schemas import (
    FolderCreate,
    FolderUpdate,
    FolderResponse,
    FolderSimpleResponse,
    FolderTree,
)

router = APIRouter()


async def build_folder_tree(db: AsyncSession, user_id, parent_id=None) -> List[FolderTree]:
    stmt = select(Folder).where(
        Folder.user_id == user_id,
        Folder.parent_id == parent_id,
    ).order_by(Folder.sort_order, Folder.name)
    
    result = await db.execute(stmt)
    folders = result.scalars().all()
    
    trees = []
    for folder in folders:
        note_count_result = await db.execute(
            select(func.count(Note.id)).where(Note.folder_id == folder.id)
        )
        note_count = note_count_result.scalar() or 0
        
        children = await build_folder_tree(db, user_id, folder.id)
        
        folder_dict = folder.__dict__.copy()
        folder_dict["note_count"] = note_count
        folder_dict["children"] = children
        trees.append(FolderTree(**folder_dict))
    
    return trees


@router.post("", response_model=FolderSimpleResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_data: FolderCreate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if folder_data.parent_id:
        parent = await db.get(Folder, folder_data.parent_id)
        if not parent or parent.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Parent folder not found")
    
    folder = Folder(
        user_id=current_user.id,
        **folder_data.dict(),
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.get("", response_model=List[FolderTree])
async def list_folders(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await build_folder_tree(db, current_user.id)


@router.get("/flat", response_model=List[FolderSimpleResponse])
async def list_folders_flat(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.sort_order, Folder.name)
    )
    return result.scalars().all()


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    result = await db.execute(
        select(Folder)
        .options(selectinload(Folder.children))
        .where(Folder.id == UUID(folder_id), Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return folder


@router.patch("/{folder_id}", response_model=FolderSimpleResponse)
async def update_folder(
    folder_id: str,
    folder_update: FolderUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    result = await db.execute(
        select(Folder).where(Folder.id == UUID(folder_id), Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    update_data = folder_update.dict(exclude_unset=True)
    
    if "parent_id" in update_data and update_data["parent_id"]:
        if update_data["parent_id"] == folder.id:
            raise HTTPException(status_code=400, detail="Cannot set folder as its own parent")
        
        parent = await db.get(Folder, update_data["parent_id"])
        if not parent or parent.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        
        current = parent
        while current.parent_id:
            if current.parent_id == folder.id:
                raise HTTPException(status_code=400, detail="Cannot create circular reference")
            current = await db.get(Folder, current.parent_id)
    
    for field, value in update_data.items():
        setattr(folder, field, value)
    
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: str,
    move_notes_to: Optional[str] = Query(None),
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    result = await db.execute(
        select(Folder).where(Folder.id == UUID(folder_id), Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if move_notes_to:
        target_folder = await db.get(Folder, UUID(move_notes_to))
        if not target_folder or target_folder.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Target folder not found")
        
        await db.execute(
            Note.__table__.update()
            .where(Note.folder_id == folder.id)
            .values(folder_id=target_folder.id)
        )
    
    await db.delete(folder)
    await db.commit()
    return {"message": "Folder deleted successfully"}


@router.post("/reorder")
async def reorder_folders(
    folder_orders: List[dict],
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    for item in folder_orders:
        folder_id = UUID(item["id"])
        sort_order = item["sort_order"]
        parent_id = UUID(item["parent_id"]) if item.get("parent_id") else None
        
        folder = await db.get(Folder, folder_id)
        if folder and folder.user_id == current_user.id:
            folder.sort_order = sort_order
            folder.parent_id = parent_id
    
    await db.commit()
    return {"message": "Folders reordered successfully"}