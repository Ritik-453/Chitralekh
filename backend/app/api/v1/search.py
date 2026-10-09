from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text, distinct
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models import Note, Folder, Tag, NoteTag
from app.schemas import NoteListResponse, PaginatedResponse

router = APIRouter()


@router.get("/notes", response_model=PaginatedResponse)
async def search_notes(
    request: Request,
    q: Optional[str] = Query(None, min_length=1, description="Search query"),
    folder_id: Optional[str] = None,
    tag_ids: Optional[List[str]] = Query(None),
    note_type: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    is_favorite: Optional[bool] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    
    base_stmt = select(Note).where(Note.user_id == current_user.id)
    count_stmt = select(func.count(distinct(Note.id))).where(Note.user_id == current_user.id)
    
    if q:
        search_conditions = or_(
            Note.title.ilike(f"%{q}%"),
            Note.content.ilike(f"%{q}%"),
        )
        base_stmt = base_stmt.where(search_conditions)
        count_stmt = count_stmt.where(search_conditions)
    
    if folder_id:
        folder_uuid = UUID(folder_id)
        base_stmt = base_stmt.where(Note.folder_id == folder_uuid)
        count_stmt = count_stmt.where(Note.folder_id == folder_uuid)
    
    collected_tag_ids = []
    if tag_ids:
        collected_tag_ids.extend(tag_ids)
    collected_tag_ids.extend(request.query_params.getlist("tag_ids[]"))
    collected_tag_ids.extend(request.query_params.getlist("tag_ids"))

    clean_tag_ids = []
    for tid in collected_tag_ids:
        for sub_id in str(tid).split(","):
            s = sub_id.strip()
            if s and s not in clean_tag_ids:
                clean_tag_ids.append(s)
    
    if clean_tag_ids:
        base_stmt = base_stmt.join(NoteTag).where(NoteTag.tag_id.in_(clean_tag_ids)).distinct()
        count_stmt = count_stmt.join(NoteTag).where(NoteTag.tag_id.in_(clean_tag_ids))
    
    if note_type:
        base_stmt = base_stmt.where(Note.note_type == note_type)
        count_stmt = count_stmt.where(Note.note_type == note_type)
    
    if is_pinned is not None:
        base_stmt = base_stmt.where(Note.is_pinned == is_pinned)
        count_stmt = count_stmt.where(Note.is_pinned == is_pinned)
    
    if is_archived is not None:
        base_stmt = base_stmt.where(Note.is_archived == is_archived)
        count_stmt = count_stmt.where(Note.is_archived == is_archived)
    
    if is_favorite is not None:
        base_stmt = base_stmt.where(Note.is_favorite == is_favorite)
        count_stmt = count_stmt.where(Note.is_favorite == is_favorite)
    
    if date_from:
        base_stmt = base_stmt.where(Note.created_at >= date_from)
        count_stmt = count_stmt.where(Note.created_at >= date_from)
    
    if date_to:
        base_stmt = base_stmt.where(Note.created_at <= date_to)
        count_stmt = count_stmt.where(Note.created_at <= date_to)
    
    sort_column = getattr(Note, sort_by, Note.updated_at)
    if sort_order == "desc":
        base_stmt = base_stmt.order_by(sort_column.desc())
    else:
        base_stmt = base_stmt.order_by(sort_column.asc())
    
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    base_stmt = base_stmt.options(
        selectinload(Note.tags).selectinload(NoteTag.tag),
        selectinload(Note.folder),
    ).offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(base_stmt)
    notes = result.scalars().all()
    
    return PaginatedResponse(
        items=notes,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = 10,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note.title, Note.id)
        .where(
            Note.user_id == current_user.id,
            or_(
                Note.title.ilike(f"%{q}%"),
                Note.content.ilike(f"%{q}%"),
            ),
            Note.is_archived == False,
        )
        .order_by(Note.updated_at.desc())
        .limit(limit)
    )
    
    suggestions = [{"title": title, "id": str(id)} for title, id in result.all()]
    return {"suggestions": suggestions}


@router.get("/tags")
async def search_tags(
    q: Optional[str] = Query(None, min_length=1),
    limit: int = 20,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Tag).where(Tag.user_id == current_user.id)
    
    if q:
        stmt = stmt.where(Tag.name.ilike(f"%{q}%"))
    
    stmt = stmt.order_by(Tag.name).limit(limit)
    result = await db.execute(stmt)
    tags = result.scalars().all()
    
    return {"tags": tags}


@router.get("/folders")
async def search_folders(
    q: Optional[str] = Query(None, min_length=1),
    limit: int = 20,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Folder).where(Folder.user_id == current_user.id)
    
    if q:
        stmt = stmt.where(Folder.name.ilike(f"%{q}%"))
    
    stmt = stmt.order_by(Folder.name).limit(limit)
    result = await db.execute(stmt)
    folders = result.scalars().all()
    
    return {"folders": folders}


@router.get("/stats")
async def get_search_stats(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    total_notes = await db.execute(
        select(func.count(Note.id)).where(Note.user_id == current_user.id)
    )
    total_notes = total_notes.scalar() or 0
    
    total_words = await db.execute(
        select(func.sum(Note.word_count)).where(Note.user_id == current_user.id)
    )
    total_words = total_words.scalar() or 0
    
    total_reading_time = await db.execute(
        select(func.sum(Note.reading_time)).where(Note.user_id == current_user.id)
    )
    total_reading_time = total_reading_time.scalar() or 0
    
    notes_by_type = await db.execute(
        select(Note.note_type, func.count(Note.id))
        .where(Note.user_id == current_user.id)
        .group_by(Note.note_type)
    )
    notes_by_type = {str(k): v for k, v in notes_by_type.all()}
    
    notes_by_folder = await db.execute(
        select(Folder.name, func.count(Note.id))
        .join(Folder, Note.folder_id == Folder.id, isouter=True)
        .where(Note.user_id == current_user.id)
        .group_by(Folder.id, Folder.name)
    )
    notes_by_folder = {k or "No Folder": v for k, v in notes_by_folder.all()}
    
    pinned_count = await db.execute(
        select(func.count(Note.id))
        .where(Note.user_id == current_user.id, Note.is_pinned == True)
    )
    pinned_count = pinned_count.scalar() or 0
    
    archived_count = await db.execute(
        select(func.count(Note.id))
        .where(Note.user_id == current_user.id, Note.is_archived == True)
    )
    archived_count = archived_count.scalar() or 0
    
    favorite_count = await db.execute(
        select(func.count(Note.id))
        .where(Note.user_id == current_user.id, Note.is_favorite == True)
    )
    favorite_count = favorite_count.scalar() or 0
    
    return {
        "total_notes": total_notes,
        "total_words": total_words,
        "total_reading_time_minutes": total_reading_time,
        "notes_by_type": notes_by_type,
        "notes_by_folder": notes_by_folder,
        "pinned_count": pinned_count,
        "archived_count": archived_count,
        "favorite_count": favorite_count,
    }