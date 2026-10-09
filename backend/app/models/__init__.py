import enum
from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum,
    Boolean,
    Integer,
    Index,
    UniqueConstraint,
    CHAR,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class NoteType(str, enum.Enum):
    TEXT = "text"
    MARKDOWN = "markdown"
    FLOWCHART = "flowchart"
    DIAGRAM = "diagram"
    CODE = "code"


def generate_uuid() -> str:
    return str(uuid.uuid4())


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )

    avatar_url: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
    )

    # IMPORTANT:
    # Store enum VALUES in MySQL:
    # student / teacher / admin
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            values_callable=lambda enum_class: [
                member.value for member in enum_class
            ],
        ),
        default=UserRole.STUDENT,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    email_verification_token: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )

    password_reset_token: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )

    password_reset_expires: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_login: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    notes = relationship(
        "Note",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    folders = relationship(
        "Folder",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    tags = relationship(
        "Tag",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    preferences = relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    oauth_accounts = relationship(
        "OAuthAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# REFRESH TOKEN
# ============================================================

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    token: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        index=True,
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    revoked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="refresh_tokens",
    )

    __table_args__ = (
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# OAUTH ACCOUNT
# ============================================================

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    provider_user_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    access_token: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    refresh_token: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship(
        "User",
        back_populates="oauth_accounts",
    )

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_oauth_provider_user",
        ),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# FOLDER
# ============================================================

class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    color: Mapped[str] = mapped_column(
        String(7),
        default="#6366f1",
        nullable=False,
    )

    icon: Mapped[str] = mapped_column(
        String(50),
        default="folder",
        nullable=False,
    )

    parent_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship(
        "User",
        back_populates="folders",
    )

    notes = relationship(
        "Note",
        back_populates="folder",
        cascade="all, delete-orphan",
    )

    # Self-referencing relationship
    parent = relationship(
        "Folder",
        remote_side=[id],
        back_populates="children",
    )

    children = relationship(
        "Folder",
        back_populates="parent",
        cascade="all, delete-orphan",
        single_parent=True,
    )

    __table_args__ = (
        Index(
            "ix_folders_user_parent",
            "user_id",
            "parent_id",
        ),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# TAG
# ============================================================

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    color: Mapped[str] = mapped_column(
        String(7),
        default="#22c55e",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    owner = relationship(
        "User",
        back_populates="tags",
    )

    notes = relationship(
        "NoteTag",
        back_populates="tag",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            name="uq_user_tag_name",
        ),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# NOTE
# ============================================================

class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    folder_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    content_html: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    note_type: Mapped[NoteType] = mapped_column(
        Enum(
            NoteType,
            values_callable=lambda enum_class: [
                member.value for member in enum_class
            ],
        ),
        default=NoteType.MARKDOWN,
        nullable=False,
    )

    is_pinned: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    sync_to_cloud: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    word_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    reading_time: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    last_edited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship(
        "User",
        back_populates="notes",
    )

    folder = relationship(
        "Folder",
        back_populates="notes",
    )

    tags = relationship(
        "NoteTag",
        back_populates="note",
        cascade="all, delete-orphan",
    )

    versions = relationship(
        "NoteVersion",
        back_populates="note",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_notes_user_folder",
            "user_id",
            "folder_id",
        ),
        Index(
            "ix_notes_user_pinned",
            "user_id",
            "is_pinned",
        ),
        Index(
            "ix_notes_user_updated",
            "user_id",
            "updated_at",
        ),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# NOTE TAG
# ============================================================

class NoteTag(Base):
    __tablename__ = "note_tags"

    note_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("notes.id", ondelete="CASCADE"),
        primary_key=True,
    )

    tag_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    note = relationship(
        "Note",
        back_populates="tags",
    )

    tag = relationship(
        "Tag",
        back_populates="notes",
    )

    __table_args__ = (
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# NOTE VERSION
# ============================================================

class NoteVersion(Base):
    __tablename__ = "note_versions"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    note_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    content_html: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    change_summary: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    note = relationship(
        "Note",
        back_populates="versions",
    )

    __table_args__ = (
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# USER PREFERENCES
# ============================================================

class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    theme: Mapped[str] = mapped_column(
        String(20),
        default="system",
        nullable=False,
    )

    font_family: Mapped[str] = mapped_column(
        String(100),
        default="Inter",
        nullable=False,
    )

    font_size: Mapped[int] = mapped_column(
        Integer,
        default=16,
        nullable=False,
    )

    line_height: Mapped[float] = mapped_column(
        default=1.6,
        nullable=False,
    )

    editor_mode: Mapped[str] = mapped_column(
        String(20),
        default="split",
        nullable=False,
    )

    auto_save: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    auto_save_interval: Mapped[int] = mapped_column(
        Integer,
        default=5000,
        nullable=False,
    )

    show_line_numbers: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    word_wrap: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    vim_mode: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    sidebar_width: Mapped[int] = mapped_column(
        Integer,
        default=280,
        nullable=False,
    )

    show_toolbar: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    show_status_bar: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
    )

    date_format: Mapped[str] = mapped_column(
        String(20),
        default="YYYY-MM-DD",
        nullable=False,
    )

    time_format: Mapped[str] = mapped_column(
        String(10),
        default="24h",
        nullable=False,
    )

    notifications_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    email_notifications: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    google_drive_connected: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    google_drive_email: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )

    google_drive_folder_name: Mapped[str] = mapped_column(
        String(255),
        default="NotesApp_Sync",
        nullable=False,
    )

    auto_cloud_sync: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    compress_before_upload: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship(
        "User",
        back_populates="preferences",
    )

    __table_args__ = (
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
        },
    )


# ============================================================
# CENTRAL REPOSITORY ITEM (ACADEMIC / BATCH NOTE ARCHIVE)
# ============================================================

class CentralRepositoryItem(Base):
    __tablename__ = "central_repo_items"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    content_html: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    institution: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    department: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    course_code: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    course_name: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    batch: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    semester: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
    )

    note_type: Mapped[NoteType] = mapped_column(
        Enum(
            NoteType,
            values_callable=lambda enum_class: [
                member.value for member in enum_class
            ],
        ),
        default=NoteType.MARKDOWN,
        nullable=False,
    )

    original_file_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
    )

    original_file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )

    original_file_type: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
    )

    current_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    downloads_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    views_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    likes_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    creator = relationship(
        "User",
        foreign_keys=[user_id],
    )

    versions = relationship(
        "CentralRepositoryVersion",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="desc(CentralRepositoryVersion.version_number)",
    )

    __table_args__ = (
        Index("ix_central_repo_inst_dept", "institution", "department"),
        Index("ix_central_repo_batch", "batch"),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )


# ============================================================
# CENTRAL REPOSITORY VERSION (PASS-DOWN HERITAGE & UPDATERS)
# ============================================================

class CentralRepositoryVersion(Base):
    __tablename__ = "central_repo_versions"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=generate_uuid,
    )

    item_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("central_repo_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    content_html: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    updater_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    updater_batch: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    change_summary: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )

    original_file_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    item = relationship(
        "CentralRepositoryItem",
        back_populates="versions",
    )

    updater = relationship(
        "User",
        foreign_keys=[user_id],
    )

    __table_args__ = (
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
            "extend_existing": True,
        },
    )