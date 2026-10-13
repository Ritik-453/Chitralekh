import math
import os
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy import select, func, or_, desc, asc, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_active_user, get_optional_user
from app.models import (
    User,
    Note,
    NoteType,
    CentralRepositoryItem,
    CentralRepositoryVersion,
)
from app.schemas import (
    CentralRepoItemCreate,
    CentralRepoItemResponse,
    CentralRepoItemListResponse,
    CentralRepoVersionCreate,
    CentralRepoVersionResponse,
    CentralRepoMetaCreate,
    CentralRepoMetaResponse,
    NoteResponse,
)

router = APIRouter()


@router.get("", response_model=CentralRepoItemListResponse)
async def list_central_repo_items(
    search: Optional[str] = Query(None),
    institution: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    course_code: Optional[str] = Query(None),
    batch: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    note_type: Optional[str] = Query(None),
    sort_by: str = Query("updated_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    List and search academic notes in the Central Repository.
    Supports filtering by institution, department, course code, student batch, and full-text keyword search.
    """
    query = select(CentralRepositoryItem).options(
        selectinload(CentralRepositoryItem.creator),
        selectinload(CentralRepositoryItem.versions),
    )
    count_query = select(func.count(CentralRepositoryItem.id))

    filters = []

    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                CentralRepositoryItem.title.ilike(term),
                CentralRepositoryItem.description.ilike(term),
                CentralRepositoryItem.content.ilike(term),
                CentralRepositoryItem.course_code.ilike(term),
                CentralRepositoryItem.course_name.ilike(term),
                CentralRepositoryItem.institution.ilike(term),
                CentralRepositoryItem.department.ilike(term),
            )
        )

    if institution and institution.strip():
        filters.append(CentralRepositoryItem.institution.ilike(f"%{institution.strip()}%"))

    if department and department.strip():
        filters.append(CentralRepositoryItem.department.ilike(f"%{department.strip()}%"))

    if course_code and course_code.strip():
        filters.append(CentralRepositoryItem.course_code.ilike(f"%{course_code.strip()}%"))

    if batch and batch.strip():
        filters.append(CentralRepositoryItem.batch.ilike(f"%{batch.strip()}%"))

    if semester and semester.strip():
        filters.append(CentralRepositoryItem.semester == semester.strip())

    if note_type and note_type.strip():
        try:
            filters.append(CentralRepositoryItem.note_type == NoteType(note_type))
        except ValueError:
            pass

    if filters:
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)

    # Sort
    sort_attr = getattr(CentralRepositoryItem, sort_by, CentralRepositoryItem.updated_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_attr))
    else:
        query = query.order_by(desc(sort_attr))

    # Total count
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    # Transform into response schema with creator name
    response_items = []
    for item in items:
        resp = CentralRepoItemResponse(
            id=item.id,
            user_id=item.user_id,
            title=item.title,
            description=item.description,
            content=item.content,
            institution=item.institution,
            department=item.department,
            course_code=item.course_code,
            course_name=item.course_name,
            batch=item.batch,
            semester=item.semester,
            note_type=item.note_type.value if hasattr(item.note_type, "value") else str(item.note_type),
            current_version=item.current_version,
            downloads_count=item.downloads_count,
            views_count=item.views_count,
            likes_count=item.likes_count,
            original_file_url=item.original_file_url,
            original_file_name=item.original_file_name,
            original_file_type=item.original_file_type,
            created_at=item.created_at,
            updated_at=item.updated_at,
            creator_name=item.creator.full_name or item.creator.email if item.creator else "Anonymous Student",
            versions=[
                CentralRepoVersionResponse(
                    id=v.id,
                    item_id=v.item_id,
                    user_id=v.user_id,
                    version_number=v.version_number,
                    title=v.title,
                    content=v.content,
                    content_html=v.content_html,
                    updater_name=v.updater_name,
                    updater_batch=v.updater_batch,
                    change_summary=v.change_summary,
                    original_file_url=v.original_file_url,
                    created_at=v.created_at,
                )
                for v in (item.versions or [])
            ],
        )
        response_items.append(resp)

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return CentralRepoItemListResponse(
        items=response_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def load_custom_metadata() -> dict:
    import json
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "central_repo_custom_meta.json"))
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"institutions": [], "departments": [], "batches": [], "semesters": [], "courses": []}


def save_custom_metadata(data: dict):
    import json
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "central_repo_custom_meta.json"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("/meta", response_model=CentralRepoMetaResponse)
async def get_central_repo_metadata(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get distinct list of institutions, departments, courses, batches, and semesters present in the repository
    along with user-added custom metadata to populate filter dropdowns and quick-select badges.
    """
    inst_result = await db.execute(
        select(distinct(CentralRepositoryItem.institution))
        .where(CentralRepositoryItem.institution.isnot(None))
        .order_by(CentralRepositoryItem.institution)
    )
    institutions = [r for (r,) in inst_result.all() if r]

    dept_result = await db.execute(
        select(distinct(CentralRepositoryItem.department))
        .where(CentralRepositoryItem.department.isnot(None))
        .order_by(CentralRepositoryItem.department)
    )
    departments = [r for (r,) in dept_result.all() if r]

    batch_result = await db.execute(
        select(distinct(CentralRepositoryItem.batch))
        .where(CentralRepositoryItem.batch.isnot(None))
        .order_by(CentralRepositoryItem.batch)
    )
    batches = [r for (r,) in batch_result.all() if r]

    courses_result = await db.execute(
        select(CentralRepositoryItem.course_code, CentralRepositoryItem.course_name)
        .where(or_(CentralRepositoryItem.course_code.isnot(None), CentralRepositoryItem.course_name.isnot(None)))
        .distinct()
    )
    courses = []
    seen = set()
    for code, name in courses_result.all():
        key = f"{code or ''}-{name or ''}"
        if key not in seen:
            seen.add(key)
            courses.append({"code": code or "", "name": name or ""})

    # Default fallback suggestions
    if not institutions:
        institutions = ["MIT", "Stanford University", "Imperial College", "Delhi University", "IIT Delhi", "UC Berkeley"]
    if not departments:
        departments = ["Computer Science", "Electrical Engineering", "Physics", "Mechanical Engineering", "Mathematics", "Biotechnology"]
    if not batches:
        batches = ["Batch 2023-2027", "Batch 2024-2028", "Batch 2025-2029", "Class of 2024", "Class of 2025"]

    default_semesters = [
        "Semester 1", "Semester 2", "Semester 3", "Semester 4",
        "Semester 5", "Semester 6", "Semester 7", "Semester 8",
        "Year 1 (Annual)", "Year 2 (Annual)", "Year 3 (Annual)", "Year 4 (Annual)",
        "Trimester 1", "Trimester 2", "Trimester 3",
    ]

    # Merge custom user-added metadata
    custom = load_custom_metadata()
    for item in custom.get("institutions", []):
        if item and item not in institutions:
            institutions.append(item)
    for item in custom.get("departments", []):
        if item and item not in departments:
            departments.append(item)
    for item in custom.get("batches", []):
        if item and item not in batches:
            batches.append(item)
    
    semesters = list(default_semesters)
    for item in custom.get("semesters", []):
        if item and item not in semesters:
            semesters.append(item)

    for item in custom.get("courses", []):
        key = f"{item.get('code', '')}-{item.get('name', '')}"
        if key not in seen:
            seen.add(key)
            courses.append(item)

    return CentralRepoMetaResponse(
        institutions=sorted(institutions),
        departments=sorted(departments),
        courses=courses,
        batches=sorted(batches),
        semesters=semesters,
    )


@router.post("/meta", response_model=CentralRepoMetaResponse)
async def add_central_repo_metadata(
    data: CentralRepoMetaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Register a new institution, department, batch, course, or semester/yearly entry.
    Immediately available to all users across filters and upload pickers.
    """
    category = data.category.lower().strip()
    val = data.value.strip()
    if not val:
        raise HTTPException(status_code=400, detail="Value cannot be empty")

    key_map = {
        "institution": "institutions",
        "institutions": "institutions",
        "department": "departments",
        "departments": "departments",
        "batch": "batches",
        "batches": "batches",
        "semester": "semesters",
        "semesters": "semesters",
        "yearly": "semesters",
        "course": "courses",
        "courses": "courses",
    }
    target_key = key_map.get(category, "institutions")
    custom = load_custom_metadata()

    if target_key == "courses":
        if not any(c.get("name", "").lower() == val.lower() or c.get("code", "").lower() == (data.code or val).lower() for c in custom.get("courses", [])):
            custom.setdefault("courses", []).append({"name": val, "code": data.code or val})
    else:
        existing = [x.lower() for x in custom.get(target_key, [])]
        if val.lower() not in existing:
            custom.setdefault(target_key, []).append(val)

    save_custom_metadata(custom)
    return await get_central_repo_metadata(db=db, current_user=current_user)


@router.get("/{item_id}", response_model=CentralRepoItemResponse)
async def get_central_repo_item(
    item_id: str,
    increment_view: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get a single Central Repository document with its complete version history and updater lineage.
    Increments view counter.
    """
    result = await db.execute(
        select(CentralRepositoryItem)
        .options(
            selectinload(CentralRepositoryItem.creator),
            selectinload(CentralRepositoryItem.versions),
        )
        .where(CentralRepositoryItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Central repository item not found")

    if increment_view:
        item.views_count += 1
        await db.commit()
        await db.refresh(item)

    return CentralRepoItemResponse(
        id=item.id,
        user_id=item.user_id,
        title=item.title,
        description=item.description,
        content=item.content,
        institution=item.institution,
        department=item.department,
        course_code=item.course_code,
        course_name=item.course_name,
        batch=item.batch,
        semester=item.semester,
        note_type=item.note_type.value if hasattr(item.note_type, "value") else str(item.note_type),
        current_version=item.current_version,
        downloads_count=item.downloads_count,
        views_count=item.views_count,
        likes_count=item.likes_count,
        original_file_url=item.original_file_url,
        original_file_name=item.original_file_name,
        original_file_type=item.original_file_type,
        created_at=item.created_at,
        updated_at=item.updated_at,
        creator_name=item.creator.full_name or item.creator.email if item.creator else "Anonymous Student",
        versions=[
            CentralRepoVersionResponse(
                id=v.id,
                item_id=v.item_id,
                user_id=v.user_id,
                version_number=v.version_number,
                title=v.title,
                content=v.content,
                content_html=v.content_html,
                updater_name=v.updater_name,
                updater_batch=v.updater_batch,
                change_summary=v.change_summary,
                original_file_url=v.original_file_url,
                created_at=v.created_at,
            )
            for v in (item.versions or [])
        ],
    )


@router.post("", response_model=CentralRepoItemResponse, status_code=status.HTTP_201_CREATED)
async def create_central_repo_item(
    item_in: CentralRepoItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Publish a note or document to the Central Repository for institutional and next-batch sharing.
    Creates Version 1 in the heritage timeline.
    """
    note_type = NoteType.MARKDOWN
    try:
        note_type = NoteType(item_in.note_type)
    except ValueError:
        pass

    creator_name = current_user.full_name or current_user.email.split("@")[0]

    item = CentralRepositoryItem(
        user_id=current_user.id,
        title=item_in.title,
        description=item_in.description,
        content=item_in.content,
        institution=item_in.institution,
        department=item_in.department,
        course_code=item_in.course_code,
        course_name=item_in.course_name,
        batch=item_in.batch,
        semester=item_in.semester,
        note_type=note_type,
        original_file_url=item_in.original_file_url,
        original_file_name=item_in.original_file_name,
        original_file_type=item_in.original_file_type,
        current_version=1,
    )
    db.add(item)
    await db.flush()

    # Initial Version 1
    v1 = CentralRepositoryVersion(
        item_id=item.id,
        user_id=current_user.id,
        version_number=1,
        title=item.title,
        content=item.content,
        updater_name=creator_name,
        updater_batch=item.batch,
        change_summary=item_in.initial_change_summary or "Initial upload to central repository",
        original_file_url=item.original_file_url,
    )
    db.add(v1)

    await db.commit()
    await db.refresh(item)

    return await get_central_repo_item(item.id, increment_view=False, db=db, current_user=current_user)


@router.post("/{item_id}/version", response_model=CentralRepoItemResponse)
async def contribute_next_batch_version(
    item_id: str,
    version_in: CentralRepoVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Contribute an updated version to a Central Repository note.
    Designed for the next batch / junior students to enhance notes, add new chapters, or correct errors,
    while recording the updater's name, batch, and change summary.
    """
    result = await db.execute(
        select(CentralRepositoryItem).where(CentralRepositoryItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Central repository item not found")

    new_version_num = item.current_version + 1

    new_version = CentralRepositoryVersion(
        item_id=item.id,
        user_id=current_user.id,
        version_number=new_version_num,
        title=version_in.title,
        content=version_in.content,
        updater_name=version_in.updater_name or current_user.full_name or "Student Contributor",
        updater_batch=version_in.updater_batch,
        change_summary=version_in.change_summary,
        original_file_url=version_in.original_file_url or item.original_file_url,
    )
    db.add(new_version)

    # Update current head of item
    item.current_version = new_version_num
    item.title = version_in.title
    item.content = version_in.content
    item.updated_at = datetime.now(timezone.utc)
    if version_in.original_file_url:
        item.original_file_url = version_in.original_file_url

    await db.commit()
    await db.refresh(item)

    return await get_central_repo_item(item.id, increment_view=False, db=db, current_user=current_user)


@router.post("/{item_id}/fork", response_model=NoteResponse)
async def fork_repo_item_to_personal_notes(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    'Fork / Save to My Notes': Clones this repository document into the student's personal notes collection
    so they can read, annotate, and keep a personal copy on their device.
    Increments the repository item's download count.
    """
    result = await db.execute(
        select(CentralRepositoryItem).where(CentralRepositoryItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Central repository item not found")

    # Increment download counter
    item.downloads_count += 1

    # Create new personal note
    words = len(item.content.split()) if item.content else 0
    reading_time = max(1, (words + 199) // 200)

    # Add reference header in markdown content
    repo_header = (
        f"> 🎓 **From Central Repository**\n"
        f"> **Institution:** {item.institution} • **Department:** {item.department}\n"
        f"> **Course:** {item.course_code or ''} {item.course_name or ''} • **Batch:** {item.batch}\n"
        f"> **Version:** v{item.current_version}\n\n"
    )
    full_content = f"{repo_header}{item.content}"

    new_note = Note(
        user_id=current_user.id,
        title=f"{item.title} (From Repo)",
        content=full_content,
        note_type=item.note_type,
        word_count=len(full_content.split()),
        reading_time=reading_time,
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    # Return refreshed note with relationships loaded
    note_resp = await db.execute(
        select(Note)
        .options(
            selectinload(Note.tags),
            selectinload(Note.folder),
        )
        .where(Note.id == new_note.id)
    )
    return note_resp.scalar_one()


@router.post("/{item_id}/like")
async def toggle_like_repo_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Upvote / like a repository note."""
    result = await db.execute(
        select(CentralRepositoryItem).where(CentralRepositoryItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.likes_count += 1
    await db.commit()
    return {"status": "liked", "likes_count": item.likes_count}


@router.post("/{item_id}/download")
async def register_download(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Increment the download count for a note."""
    result = await db.execute(
        select(CentralRepositoryItem).where(CentralRepositoryItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.downloads_count += 1
    await db.commit()
    return {"status": "success", "downloads_count": item.downloads_count}


@router.post("/upload-attachment")
async def upload_attachment_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    Directly upload an attachment (handwritten note image, diagram, PDF, docx)
    to static /uploads storage for saving in original format or embedding in Markdown.
    Applies image compression to WebP when images are uploaded, conserving Cloudflare R2 / Server storage.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")

    original_size = len(file_bytes)
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    content_type = file.content_type or "application/octet-stream"
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)

    # If it is an image, compress to WebP
    if content_type.startswith("image/"):
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
                file_bytes = buf.getvalue()
                safe_name = os.path.splitext(safe_name)[0] + ".webp"
                content_type = "image/webp"
        except Exception:
            pass

    stored_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"
    stored_path = os.path.join(uploads_dir, stored_name)

    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    saved_percent = round((1 - len(file_bytes) / original_size) * 100) if original_size > 0 else 0

    return {
        "file_url": f"/uploads/{stored_name}",
        "file_name": safe_name,
        "file_size": len(file_bytes),
        "original_size": original_size,
        "savings_percent": max(0, saved_percent),
        "content_type": content_type,
    }
