from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models import Tag, NoteTag, Note
from app.schemas import TagCreate, TagUpdate, TagResponse, TagWithCountResponse

router = APIRouter()


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Tag).where(Tag.user_id == current_user.id, Tag.name == tag_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    
    tag = Tag(user_id=current_user.id, **tag_data.dict())
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.get("", response_model=List[TagResponse])
async def list_tags(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag)
        .where(Tag.user_id == current_user.id)
        .order_by(Tag.name)
    )
    return result.scalars().all()


@router.get("/with-counts", response_model=List[TagWithCountResponse])
async def list_tags_with_counts(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag, func.count(NoteTag.note_id).label("note_count"))
        .outerjoin(NoteTag, Tag.id == NoteTag.tag_id)
        .where(Tag.user_id == current_user.id)
        .group_by(Tag.id)
        .order_by(Tag.name)
    )
    
    tags_with_counts = []
    for tag, count in result.all():
        tags_with_counts.append(
            TagWithCountResponse(
                id=tag.id,
                user_id=tag.user_id,
                name=tag.name,
                color=tag.color,
                created_at=tag.created_at,
                note_count=count or 0,
            )
        )
    
    return tags_with_counts


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.id == str(tag_id), Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return tag


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    tag_update: TagUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.id == str(tag_id), Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    update_data = tag_update.dict(exclude_unset=True)
    
    if "name" in update_data:
        existing = await db.execute(
            select(Tag).where(
                Tag.user_id == current_user.id,
                Tag.name == update_data["name"],
                Tag.id != str(tag.id),
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Tag with this name already exists")
    
    for field, value in update_data.items():
        setattr(tag, field, value)
    
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.id == str(tag_id), Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    await db.delete(tag)
    await db.commit()
    return {"message": "Tag deleted successfully"}


@router.post("/bulk-delete")
async def bulk_delete_tags(
    tag_ids: List[str],
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tag_ids_str = [str(tid) for tid in tag_ids]
    
    result = await db.execute(
        select(Tag).where(Tag.id.in_(tag_ids_str), Tag.user_id == current_user.id)
    )
    tags = result.scalars().all()
    
    for tag in tags:
        await db.delete(tag)
    
    await db.commit()
    return {"message": f"Deleted {len(tags)} tags"}