import os
import uuid
import re
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc, distinct, update
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_active_user, CommonQueryParams
from app.models import Note, Folder, Tag, NoteTag, NoteVersion, NoteType
from app.services.document_converter import convert_file_to_markdown
from app.schemas import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteListResponse,
    NoteSearchParams,
    PaginatedResponse,
    NoteVersionCreate,
    NoteVersionResponse,
    FileConvertResponse,
)

router = APIRouter()


def calculate_word_count(content: str) -> int:
    if not content:
        return 0
    return len(content.split())


def calculate_reading_time(word_count: int) -> int:
    return max(1, round(word_count / 200))


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_data: NoteCreate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if note_data.folder_id:
        folder = await db.get(Folder, note_data.folder_id)
        if not folder or folder.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    tags = []
    if note_data.tags:
        tag_ids = [str(tid) for tid in note_data.tags]
        result = await db.execute(
            select(Tag).where(
                Tag.id.in_(tag_ids),
                Tag.user_id == str(current_user.id),
            )
        )
        tags = result.scalars().all()
    
    word_count = calculate_word_count(note_data.content or "")
    reading_time = calculate_reading_time(word_count)
    
    note = Note(
        user_id=current_user.id,
        folder_id=note_data.folder_id,
        title=note_data.title,
        content=note_data.content,
        note_type=NoteType(note_data.note_type),
        sync_to_cloud=note_data.sync_to_cloud,
        word_count=word_count,
        reading_time=reading_time,
        last_edited_at=datetime.now(timezone.utc),
    )
    db.add(note)
    await db.flush()
    
    for tag in tags:
        db.add(NoteTag(note_id=note.id, tag_id=tag.id))
    
    version = NoteVersion(
        note_id=note.id,
        title=note.title,
        content=note.content,
        version=1,
        change_summary="Initial creation",
    )
    db.add(version)
    
    await db.commit()
    await db.refresh(note)
    
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.tags).selectinload(NoteTag.tag), selectinload(Note.folder))
        .where(Note.id == note.id)
    )
    return result.scalar_one()


@router.get("", response_model=PaginatedResponse)
async def list_notes(
    request: Request,
    query: Optional[str] = None,
    folder_id: Optional[str] = None,
    tag_ids: Optional[List[str]] = Query(None),
    note_type: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    is_favorite: Optional[bool] = None,
    sync_to_cloud: Optional[bool] = None,
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
    
    stmt = select(Note).where(Note.user_id == current_user.id)
    count_stmt = select(func.count(distinct(Note.id))).where(Note.user_id == current_user.id)
    
    if query:
        search_filter = or_(
            Note.title.ilike(f"%{query}%"),
            Note.content.ilike(f"%{query}%"),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    
    if folder_id:
        folder_uuid = UUID(folder_id)
        stmt = stmt.where(Note.folder_id == folder_uuid)
        count_stmt = count_stmt.where(Note.folder_id == folder_uuid)
    
    # Collect all tag IDs from query params (tag_ids, tag_ids[], or comma-separated)
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
        stmt = stmt.join(NoteTag).where(NoteTag.tag_id.in_(clean_tag_ids)).distinct()
        count_stmt = count_stmt.join(NoteTag).where(NoteTag.tag_id.in_(clean_tag_ids))
    
    if note_type:
        stmt = stmt.where(Note.note_type == NoteType(note_type))
        count_stmt = count_stmt.where(Note.note_type == NoteType(note_type))
    
    if is_pinned is not None:
        stmt = stmt.where(Note.is_pinned == is_pinned)
        count_stmt = count_stmt.where(Note.is_pinned == is_pinned)
    
    if is_archived is not None:
        stmt = stmt.where(Note.is_archived == is_archived)
        count_stmt = count_stmt.where(Note.is_archived == is_archived)
    
    if is_favorite is not None:
        stmt = stmt.where(Note.is_favorite == is_favorite)
        count_stmt = count_stmt.where(Note.is_favorite == is_favorite)
    
    if sync_to_cloud is not None:
        stmt = stmt.where(Note.sync_to_cloud == sync_to_cloud)
        count_stmt = count_stmt.where(Note.sync_to_cloud == sync_to_cloud)
    
    if date_from:
        stmt = stmt.where(Note.created_at >= date_from)
        count_stmt = count_stmt.where(Note.created_at >= date_from)
    
    if date_to:
        stmt = stmt.where(Note.created_at <= date_to)
        count_stmt = count_stmt.where(Note.created_at <= date_to)
    
    sort_column = getattr(Note, sort_by, Note.updated_at)
    if sort_order == "desc":
        stmt = stmt.order_by(desc(sort_column))
    else:
        stmt = stmt.order_by(asc(sort_column))
    
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    stmt = stmt.options(
        selectinload(Note.tags).selectinload(NoteTag.tag),
        selectinload(Note.folder),
    ).offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(stmt)
    notes = result.scalars().all()
    
    return PaginatedResponse(
        items=notes,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/recent", response_model=List[NoteListResponse])
async def get_recent_notes(
    limit: int = 10,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.tags).selectinload(NoteTag.tag), selectinload(Note.folder))
        .where(Note.user_id == current_user.id, Note.is_archived == False)
        .order_by(desc(Note.updated_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/pinned", response_model=List[NoteListResponse])
async def get_pinned_notes(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.tags).selectinload(NoteTag.tag), selectinload(Note.folder))
        .where(Note.user_id == current_user.id, Note.is_pinned == True, Note.is_archived == False)
        .order_by(desc(Note.updated_at))
    )
    return result.scalars().all()


@router.get("/favorites", response_model=List[NoteListResponse])
async def get_favorite_notes(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.tags).selectinload(NoteTag.tag), selectinload(Note.folder))
        .where(Note.user_id == current_user.id, Note.is_favorite == True, Note.is_archived == False)
        .order_by(desc(Note.updated_at))
    )
    return result.scalars().all()


@router.post("/convert-file", response_model=FileConvertResponse)
async def convert_file_endpoint(
    file: UploadFile = File(...),
    mode: Optional[str] = Form("auto"),
    current_user = Depends(get_current_active_user),
):
    """
    Convert an uploaded document (PDF, Word DOCX) or image (OCR via Tesseract) into structured Markdown text.
    Mode: "auto", "handwritten", or "printed".
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")
    
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    # 25 MB max file size limit
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")
    
    try:
        result = convert_file_to_markdown(file_bytes, file.filename, mode=mode or "auto")
        return FileConvertResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File conversion failed: {str(e)}")


@router.post("/upload-image")
async def upload_image_endpoint(
    file: UploadFile = File(...),
    current_user = Depends(get_current_active_user),
):
    """
    Directly upload an image (clipboard paste, drag-and-drop, or file picker)
    to static /uploads storage and return the URL for direct markdown line insertion.
    Applies WebP compression to reduce disk space and speed up syncing.
    """
    if not file.filename:
        file.filename = "pasted_image.png"

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")

    original_size = len(file_bytes)
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    base_name = os.path.splitext(safe_name)[0]
    stored_name = f"img_{uuid.uuid4().hex[:12]}_{base_name}.webp"
    
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)
    stored_path = os.path.join(uploads_dir, stored_name)

    # Convert/compress to WebP
    final_bytes = file_bytes
    try:
        import io
        from PIL import Image
        with Image.open(io.BytesIO(file_bytes)) as im:
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            if max(im.size) > 2560:
                im.thumbnail((2560, 2560), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="WEBP", quality=82, method=4)
            final_bytes = buf.getvalue()
    except Exception:
        # Fallback to saving original if conversion fails
        stored_name = f"img_{uuid.uuid4().hex[:12]}_{safe_name}"
        stored_path = os.path.join(uploads_dir, stored_name)

    with open(stored_path, "wb") as f:
        f.write(final_bytes)

    saved_percent = round((1 - len(final_bytes) / original_size) * 100) if original_size > 0 else 0

    return {
        "url": f"/uploads/{stored_name}",
        "filename": file.filename,
        "size": len(final_bytes),
        "original_size": original_size,
        "savings_percent": max(0, saved_percent),
    }


@router.post("/import-file", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def import_file_as_note(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    mode: Optional[str] = Form("auto"),
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Directly import an uploaded document or image (OCR) into a newly created Note.
    Mode: "auto", "handwritten", or "printed".
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")
    
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")
    
    try:
        conv = convert_file_to_markdown(file_bytes, file.filename, mode=mode or "auto")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File conversion failed: {str(e)}")
    
    # Validate folder if provided
    if folder_id:
        folder = await db.get(Folder, folder_id)
        if not folder or str(folder.user_id) != str(current_user.id):
            folder_id = None
    
    note = Note(
        user_id=current_user.id,
        folder_id=folder_id,
        title=conv["suggested_title"],
        content=conv["text"],
        note_type=NoteType.MARKDOWN,
        word_count=conv["word_count"],
        reading_time=conv["reading_time"],
    )
    db.add(note)
    await db.flush()
    
    initial_version = NoteVersion(
        note_id=note.id,
        title=note.title,
        content=note.content,
        version=1,
        change_summary=f"Imported from {conv['filename']} ({conv['file_type'].upper()})",
    )
    db.add(initial_version)
    
    await db.commit()
    
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.tags).selectinload(NoteTag.tag), selectinload(Note.folder))
        .where(Note.id == note.id)
    )
    return result.scalar_one()


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Use string comparison for UUID stored as CHAR(36) with hyphens
    result = await db.execute(
        select(Note)
        .options(
            selectinload(Note.tags).selectinload(NoteTag.tag),
            selectinload(Note.folder),
        )
        .where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return note


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note)
        .options(
            selectinload(Note.tags).selectinload(NoteTag.tag),
            selectinload(Note.folder),
        )
        .where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_update.dict(exclude_unset=True)
    tags = update_data.pop("tags", None)
    
    old_content = note.content
    old_title = note.title
    
    for field, value in update_data.items():
        if field == "note_type" and value:
            value = NoteType(value)
        setattr(note, field, value)
    
    if note.content != old_content or note.title != old_title:
        note.version += 1
        note.last_edited_at = datetime.now(timezone.utc)
        note.word_count = calculate_word_count(note.content or "")
        note.reading_time = calculate_reading_time(note.word_count)
        
        version = NoteVersion(
            note_id=note.id,
            title=note.title,
            content=note.content,
            version=note.version,
            change_summary=f"Updated note (v{note.version})",
        )
        db.add(version)
    
    if tags is not None:
        await db.execute(
            NoteTag.__table__.delete().where(NoteTag.note_id == note.id)
        )
        if tags:
            tag_ids = [str(tid) for tid in tags]
            tag_result = await db.execute(
                select(Tag).where(Tag.id.in_(tag_ids), Tag.user_id == str(current_user.id))
            )
            valid_tags = tag_result.scalars().all()
            for tag in valid_tags:
                db.add(NoteTag(note_id=str(note.id), tag_id=str(tag.id)))
    
    await db.commit()
    await db.refresh(note)
    
    result = await db.execute(
        select(Note)
        .options(
            selectinload(Note.tags).selectinload(NoteTag.tag),
            selectinload(Note.folder),
        )
        .where(Note.id == note.id)
    )
    return result.scalar_one()


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    await db.delete(note)
    await db.commit()
    return {"message": "Note deleted successfully"}


@router.post("/{note_id}/pin")
async def pin_note(
    note_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_pinned = not note.is_pinned
    await db.commit()
    return {"is_pinned": note.is_pinned}


@router.post("/{note_id}/favorite")
async def toggle_favorite(
    note_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_favorite = not note.is_favorite
    await db.commit()
    return {"is_favorite": note.is_favorite}


@router.post("/{note_id}/archive")
async def archive_note(
    note_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_archived = not note.is_archived
    await db.commit()
    return {"is_archived": note.is_archived}


@router.get("/{note_id}/versions", response_model=List[NoteVersionResponse])
async def get_note_versions(
    note_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    note_result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = note_result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    result = await db.execute(
        select(NoteVersion)
        .where(NoteVersion.note_id == note_id)
        .order_by(desc(NoteVersion.version))
    )
    return result.scalars().all()


@router.post("/{note_id}/versions/{version_id}/restore", response_model=NoteResponse)
async def restore_note_version(
    note_id: str,
    version_id: str,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    note_result = await db.execute(
        select(Note)
        .options(
            selectinload(Note.tags).selectinload(NoteTag.tag),
            selectinload(Note.folder),
        )
        .where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = note_result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    version_result = await db.execute(
        select(NoteVersion).where(
            NoteVersion.id == version_id,
            NoteVersion.note_id == note_id,
        )
    )
    version = version_result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    note.title = version.title
    note.content = version.content
    note.content_html = version.content_html
    note.version += 1
    note.last_edited_at = datetime.now(timezone.utc)
    note.word_count = calculate_word_count(note.content or "")
    note.reading_time = calculate_reading_time(note.word_count)
    
    new_version = NoteVersion(
        note_id=note.id,
        title=note.title,
        content=note.content,
        content_html=note.content_html,
        version=note.version,
        change_summary=f"Restored from version {version.version}",
    )
    db.add(new_version)
    
    await db.commit()
    await db.refresh(note)
    return note


from pydantic import BaseModel as PyBaseModel

class BulkSyncToggleRequest(PyBaseModel):
    note_ids: List[str]
    sync_to_cloud: bool


@router.post("/bulk-sync-toggle")
async def bulk_sync_toggle(
    data: BulkSyncToggleRequest,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not data.note_ids:
        return {"updated_count": 0, "sync_to_cloud": data.sync_to_cloud}
    
    stmt = (
        update(Note)
        .where(Note.id.in_(data.note_ids), Note.user_id == current_user.id)
        .values(sync_to_cloud=data.sync_to_cloud, updated_at=datetime.now(timezone.utc))
    )
    res = await db.execute(stmt)
    await db.commit()
    return {"updated_count": res.rowcount or len(data.note_ids), "sync_to_cloud": data.sync_to_cloud}