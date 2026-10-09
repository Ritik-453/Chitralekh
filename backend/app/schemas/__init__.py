from datetime import datetime
from typing import Optional, List, Dict, Any
import pydantic
from pydantic import BaseModel, EmailStr, Field
import uuid

PV2 = int(pydantic.__version__.split(".")[0]) >= 2
COLOR_REGEX = r"^#[0-9A-Fa-f]{6}$"


def _color_field(default=...):
    if PV2:
        return Field(default, pattern=COLOR_REGEX)
    return Field(default, regex=COLOR_REGEX)


def _tags_validator():
    if PV2:
        from pydantic import field_validator
        return field_validator("tags", mode="before")
    else:
        from pydantic import validator
        return validator("tags", pre=True, allow_reuse=True)


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(UserBase):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    role: str
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class UserWithPreferences(UserResponse):
    preferences: Optional["UserPreferencesResponse"] = None


class RefreshTokenCreate(BaseModel):
    refresh_token: str


class OAuthProvider(str):
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"


class OAuthAccountCreate(BaseModel):
    provider: str
    provider_user_id: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None


class OAuthAccountResponse(BaseModel):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    provider: str
    provider_user_id: str
    created_at: datetime


class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = _color_field("#6366f1")
    icon: str = Field(default="folder", max_length=50)
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = _color_field(None)
    icon: Optional[str] = Field(None, max_length=50)
    parent_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None


class FolderSimpleResponse(FolderBase):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class FolderResponse(FolderSimpleResponse):
    children: List["FolderResponse"] = []


class FolderTree(FolderResponse):
    note_count: int = 0


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = _color_field("#22c55e")


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = _color_field(None)


class TagResponse(TagBase):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime


class TagWithCountResponse(TagResponse):
    note_count: int = 0


class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = None
    note_type: str = "markdown"
    folder_id: Optional[uuid.UUID] = None
    sync_to_cloud: bool = True


class NoteCreate(NoteBase):
    tags: Optional[List[uuid.UUID]] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    note_type: Optional[str] = None
    folder_id: Optional[uuid.UUID] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_favorite: Optional[bool] = None
    sync_to_cloud: Optional[bool] = None
    tags: Optional[List[uuid.UUID]] = None


class NoteVersionCreate(BaseModel):
    change_summary: Optional[str] = None


class NoteVersionResponse(BaseModel):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    note_id: uuid.UUID
    title: str
    content: Optional[str] = None
    content_html: Optional[str] = None
    version: int
    change_summary: Optional[str] = None
    created_at: datetime


class NoteResponse(NoteBase):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    user_id: uuid.UUID
    content_html: Optional[str] = None
    is_pinned: bool
    is_archived: bool
    is_favorite: bool
    sync_to_cloud: bool = True
    word_count: int
    reading_time: int
    version: int
    last_edited_at: datetime
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse] = []
    folder: Optional[FolderResponse] = None

    @_tags_validator()
    def _extract_tags(cls, v):
        if isinstance(v, (list, set, tuple)):
            return [getattr(item, "tag", item) for item in v if item is not None]
        return v


class NoteListResponse(BaseModel):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: uuid.UUID
    title: str
    content: Optional[str] = None
    note_type: str
    is_pinned: bool
    is_archived: bool
    is_favorite: bool
    sync_to_cloud: bool = True
    word_count: int
    reading_time: int
    updated_at: datetime
    tags: List[TagResponse] = []
    folder: Optional[FolderResponse] = None

    @_tags_validator()
    def _extract_tags(cls, v):
        if isinstance(v, (list, set, tuple)):
            return [getattr(item, "tag", item) for item in v if item is not None]
        return v


class NoteSearchParams(BaseModel):
    query: Optional[str] = None
    folder_id: Optional[uuid.UUID] = None
    tag_ids: Optional[List[uuid.UUID]] = None
    note_type: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_favorite: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sort_by: str = "updated_at"
    sort_order: str = "desc"
    page: int = 1
    page_size: int = 20


class PaginatedResponse(BaseModel):
    items: List[NoteListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserPreferencesBase(BaseModel):
    theme: str = "system"
    font_family: str = "Inter"
    font_size: int = 16
    line_height: float = 1.6
    editor_mode: str = "split"
    auto_save: bool = True
    auto_save_interval: int = 5000
    show_line_numbers: bool = False
    word_wrap: bool = True
    vim_mode: bool = False
    sidebar_width: int = 280
    show_toolbar: bool = True
    show_status_bar: bool = True
    language: str = "en"
    date_format: str = "YYYY-MM-DD"
    time_format: str = "24h"
    notifications_enabled: bool = True
    email_notifications: bool = False
    google_drive_connected: bool = False
    google_drive_email: Optional[str] = None
    google_drive_folder_name: str = "NotesApp_Sync"
    auto_cloud_sync: bool = True
    compress_before_upload: bool = True
    last_synced_at: Optional[datetime] = None


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    font_family: Optional[str] = None
    font_size: Optional[int] = None
    line_height: Optional[float] = None
    editor_mode: Optional[str] = None
    auto_save: Optional[bool] = None
    auto_save_interval: Optional[int] = None
    show_line_numbers: Optional[bool] = None
    word_wrap: Optional[bool] = None
    vim_mode: Optional[bool] = None
    sidebar_width: Optional[int] = None
    show_toolbar: Optional[bool] = None
    show_status_bar: Optional[bool] = None
    language: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    google_drive_connected: Optional[bool] = None
    google_drive_email: Optional[str] = None
    google_drive_folder_name: Optional[str] = None
    auto_cloud_sync: Optional[bool] = None
    compress_before_upload: Optional[bool] = None
    last_synced_at: Optional[datetime] = None


class UserPreferencesResponse(UserPreferencesBase):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class FlowchartData(BaseModel):
    code: str
    theme: str = "default"
    direction: str = "TD"


class FlowchartExport(BaseModel):
    note_id: Optional[str] = None
    format: str = "svg"
    theme: str = "default"


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    redis: str


class ErrorResponse(BaseModel):
    error: bool
    message: str
    error_code: Optional[str] = None


class FileConvertResponse(BaseModel):
    filename: str
    extension: str
    file_type: str
    text: str
    suggested_title: str
    word_count: int
    reading_time: int
    metadata: Dict[str, Any] = {}
    file_url: Optional[str] = None
    data_url: Optional[str] = None
    file_size: Optional[int] = None
    page_images: Optional[List[Dict[str, Any]]] = None


# ============================================================
# CENTRAL REPOSITORY SCHEMAS
# ============================================================

class CentralRepoVersionResponse(BaseModel):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: str
    item_id: str
    user_id: Optional[str] = None
    version_number: int
    title: str
    content: str
    content_html: Optional[str] = None
    updater_name: str
    updater_batch: str
    change_summary: Optional[str] = None
    original_file_url: Optional[str] = None
    created_at: datetime


class CentralRepoItemBase(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    content: str
    institution: str = Field(..., max_length=255)
    department: str = Field(..., max_length=255)
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    batch: str = Field(..., max_length=100)
    semester: Optional[str] = None
    note_type: str = "markdown"


class CentralRepoItemCreate(CentralRepoItemBase):
    original_file_url: Optional[str] = None
    original_file_name: Optional[str] = None
    original_file_type: Optional[str] = None
    initial_change_summary: Optional[str] = "Initial upload to central repository"


class CentralRepoVersionCreate(BaseModel):
    title: str
    content: str
    updater_name: str
    updater_batch: str
    change_summary: str = Field(..., min_length=3, max_length=1000)
    original_file_url: Optional[str] = None


class CentralRepoItemResponse(CentralRepoItemBase):
    class Config:
        if PV2:
            from_attributes = True
        else:
            orm_mode = True

    id: str
    user_id: str
    current_version: int
    downloads_count: int
    views_count: int
    likes_count: int
    original_file_url: Optional[str] = None
    original_file_name: Optional[str] = None
    original_file_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    versions: List[CentralRepoVersionResponse] = []


class CentralRepoItemListResponse(BaseModel):
    items: List[CentralRepoItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CentralRepoMetaCreate(BaseModel):
    category: str  # "institution", "department", "batch", "semester", "course"
    value: str
    code: Optional[str] = None  # for courses


class CentralRepoMetaResponse(BaseModel):
    institutions: List[str]
    departments: List[str]
    courses: List[Dict[str, str]]
    batches: List[str]
    semesters: List[str] = []


if hasattr(FolderResponse, "model_rebuild"):
    FolderResponse.model_rebuild()
    FolderTree.model_rebuild()
    UserWithPreferences.model_rebuild()
    CentralRepoItemResponse.model_rebuild()
else:
    FolderResponse.update_forward_refs()
    FolderTree.update_forward_refs()
    UserWithPreferences.update_forward_refs()
    CentralRepoItemResponse.update_forward_refs()