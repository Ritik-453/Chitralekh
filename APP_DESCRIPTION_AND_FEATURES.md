# Chitralekh (चित्रलेख) — Comprehensive Application Description & Feature Specification

## 1. Executive Summary & Overview

**Chitralekh (चित्रलेख)** is a modern, high-performance, full-stack personal knowledge management (PKM) and notes application engineered for students, researchers, developers, and technical writers. The application blends distraction-free **Markdown authoring**, interactive **Mermaid.js flowcharting & diagramming**, **hierarchical folder trees**, **color-coded multidimensional tagging**, **instant global full-text search**, and extensive **user customization** into a sleek, responsive dark/light interface.

### Key Value Propositions
- **Unified Knowledge Workspace**: Write technical notes, documentation, lecture summaries, and visual architecture diagrams side-by-side in a single application.
- **Visual Diagram Studio**: Native Mermaid.js rendering engine allows users to write code-driven flowcharts, sequence diagrams, class models, git graphs, and mindmaps with live SVG preview, pan/zoom canvas, and one-click SVG export.
- **Deep Organization**: Avoid digital clutter with nested folder hierarchies, customizable tag palettes, pinned notes, favorites, and archiving.
- **Productivity & Speed**: Global `⌘K` command palette / search modal, keyboard shortcuts for rich markdown formatting, and debounced auto-saving.
- **Complete Customization**: Tailor the writing experience with custom fonts (Inter, Roboto, Monospace), adjustable font sizes, line heights, split-screen editor modes, and persistent dark/light/system theme toggles.

---

## 2. System Architecture & Technology Stack

```mermaid
graph TD
    subgraph Client ["Frontend (React 18 + TypeScript + Vite)"]
        UI["Tailwind CSS + Lucide Icons UI"]
        Router["React Router v6"]
        Hooks["State & Custom Hooks (useNotes, useAuth, useEditor)"]
        MarkdownEngine["React Markdown + GFM + Rehype"]
        MermaidClient["Mermaid.js Client Engine"]
    end

    subgraph Gateway ["Reverse Proxy / Gateway"]
        Nginx["Nginx Reverse Proxy & Static Server"]
    end

    subgraph Server ["Backend (FastAPI + Python 3.12)"]
        API["FastAPI REST Endpoints (/api/v1)"]
        AuthMiddleware["JWT Bearer & OAuth2 Authentication"]
        Services["Business Logic & Flowchart Renderer"]
        ORM["SQLAlchemy 2.0 Async/Sync ORM"]
    end

    subgraph Persistence ["Data & Cache Layer"]
        MySQL[("MySQL 8.0 / PostgreSQL Database")]
        Redis[("Redis Cache & Session Store")]
    end

    UI --> Router
    Router --> Hooks
    Hooks --> MarkdownEngine
    Hooks --> MermaidClient
    Hooks -->|REST API Calls| Gateway
    Gateway --> API
    API --> AuthMiddleware
    AuthMiddleware --> Services
    Services --> ORM
    ORM --> MySQL
    Services --> Redis
```

### Frontend Technology Stack
- **Library & Language**: [React 18](https://react.dev/) with [TypeScript 5.x](https://www.typescriptlang.org/) for complete end-to-end type safety.
- **Build System**: [Vite](https://vitejs.dev/) delivering instantaneous Hot Module Replacement (HMR) and optimized tree-shaken production bundles.
- **Styling & Design System**: [Tailwind CSS 3.x](https://tailwindcss.com/) customized with bespoke HSL color palettes, dark mode tokens, fluid typography, custom scrollbars, and glassmorphic card elements.
- **Icons**: [Lucide React](https://lucide.dev/) providing an extensive suite of clean, lightweight SVG vector icons.
- **Markdown Rendering**:
  - `react-markdown`: Core AST-based Markdown parser and React renderer.
  - `remark-gfm`: GitHub Flavored Markdown plugin supporting tables, strikethrough, autolinks, and task lists.
  - `rehype-raw` & `rehype-sanitize`: Safe rendering of embedded HTML elements with robust XSS sanitization.
  - `rehype-slug` & `rehype-autolink-headings`: Automated slug generation and anchor linking for table of contents navigation.
- **Diagramming & Flowcharts**: [Mermaid.js](https://mermaid.js.org/) client-side engine with SVG manipulation, pan/zoom controls, and live validation.
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/) providing animated, accessible, deduplicated toast alerts.
- **Drag and Drop**: `@dnd-kit` integration for flexible element reordering.

### Backend Technology Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+) asynchronous web framework utilizing ASGI standard (`uvicorn`).
- **Data Validation & Schemas**: [Pydantic v2](https://docs.pydantic.dev/) with type-checked request/response models.
- **Database & ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) supporting both asynchronous execution (`asyncpg` / `aiomysql` / `aiosqlite`) and synchronous sessions (`pymysql` / `psycopg2`).
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/) for automated schema version tracking and migrations.
- **Authentication & Cryptography**:
  - `passlib` with `bcrypt` password hashing.
  - `python-jose` for JSON Web Token (JWT) encoding, decoding, and HMAC-SHA256 signature verification.
- **Caching & Ephemeral Storage**: [Redis](https://redis.io/) for session tokens, rate limiting, and fast search caching.

---

## 3. Comprehensive Feature Catalog

### 3.1. Authentication & Security
- **Email & Password Registration**: Account registration with validation for email formatting, name length, and password complexity.
- **JWT Token Authentication**:
  - Short-lived Access Tokens (30 minutes default) for stateless API authorization.
  - Long-lived Refresh Tokens (7 days default) with database-tracked revocation records (`refresh_tokens` table) to support seamless token rotation and instant multi-device logout.
- **OAuth2 Social Sign-In**: Integration hooks for Google and GitHub OAuth authentication.
- **Role-Based Permissions**: User roles (`student`, `teacher`, `admin`) to support multi-user institutions and classroom management.
- **Remember Me Support**: Configurable persistent session duration for frictionless sign-in across browser sessions.
- **Password Security**: Bcrypt-hashed password storage; password reset and email verification token workflows.

### 3.2. Dynamic Dashboard
- **Productivity Metric Cards**:
  - **Total Notes**: Live counter of all active documents.
  - **Total Words**: Real-time aggregation of words authored across the entire knowledge base.
  - **Estimated Reading Time**: Aggregated reading duration computed across notes using standard reading speeds (200 WPM).
  - **Folders Count**: Total count of active top-level and nested organizational folders.
- **Quick Action Triggers**:
  - **+ New Note**: 1-click launcher for Markdown note editor.
  - **+ New Flowchart**: 1-click launcher for the Mermaid visual diagram studio.
  - **+ New Folder**: Modal trigger to create categorized directories.
- **Recent Notes Stream**:
  - Real-time list of most recently modified notes.
  - Displays note title, text snippet, note type badge (Markdown, Flowchart, Text, Code), assigned tags, and humanized relative timestamps (e.g., "about 2 hours ago").
  - Direct navigation to note editor.
- **Theme & Navigation Header**:
  - Instant toggle between Light Mode and Dark Mode.
  - Global Search button with keyboard shortcut indicator (`⌘K`).
  - Notification indicator and user profile avatar with dropdown menu.

### 3.3. Advanced Markdown Note Editor
- **Rich Formatting Toolbar**:
  - **Headings**: H1 (`Ctrl+1`), H2 (`Ctrl+2`), H3 (`Ctrl+3`).
  - **Text Styling**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Strikethrough (`Ctrl+Shift+X`), Inline Code (`Ctrl+E`).
  - **Lists & Blocks**: Unordered bullet list (`Ctrl+Shift+8`), Numbered list (`Ctrl+Shift+7`), Blockquotes (`Ctrl+Shift+Q`), Horizontal rule (`---`).
  - **Rich Embeds**: Insert hyperlinks (`Ctrl+K`), Markdown images (`Ctrl+Shift+I`), Markdown tables with sample column headers.
  - **History**: Full Undo (`Ctrl+Z`) and Redo (`Ctrl+Shift+Z`) support.
- **Multi-Mode Display**:
  - **Edit Mode**: Distraction-free full-width code/markdown textarea.
  - **Preview Mode**: Clean rendered HTML with syntax highlighting and styled typography.
  - **Split Mode**: Side-by-side editing and live preview updating in real-time as you type.
- **Distraction-Free Fullscreen Mode**: Expand editor to occupy 100% of viewport with a single click or shortcut (`Ctrl+Shift+F`).
- **Dynamic Table of Contents (TOC)**:
  - Automatically parses document headings in real-time.
  - Displays hierarchical tree of sections in a collapsible flyout.
  - Smooth-scrolls to the corresponding section header when clicked.
- **Live Status Bar**:
  - **Word Counter**: Tracks active document word count.
  - **Line Counter**: Current number of text lines.
  - **Reading Time**: Live estimation of time needed to read document.
  - **Autosave Status Indicator**: Visual cue displaying `Saving...` or `Saved` with relative timestamp.
- **Debounced Autosave Engine**: Automatically saves document changes after 3 seconds of inactivity, preventing accidental data loss without flooding backend API endpoints.
- **Metadata Management**:
  - Inline title editing.
  - Assign to existing folder or change folder categorization.
  - Multi-select color-coded tags with inline creation modal.
  - Quick action toggles: Pin (`Star`), Favorite (`Bookmark`), Archive, and Delete.

### 3.4. Flowchart & Visual Diagram Studio
- **Mermaid.js Diagramming Engine**: Write declarative text syntax and generate vector diagrams instantaneously.
- **Supported Diagram Types**:
  - **Flowcharts**: Top-to-Bottom (`TD`), Left-to-Right (`LR`) workflows, decision trees, conditionals, subgraphs.
  - **Sequence Diagrams**: Actor-to-system interactions, asynchronous messages, activations, loops.
  - **Class Diagrams**: Object-oriented models with attributes, visibility markers, methods, inheritance, and cardinality.
  - **State Diagrams**: State transitions, composite states, forks, joins.
  - **Entity-Relationship (ER) Diagrams**: Database schemas, foreign keys, cardinality mappings.
  - **Gantt Charts**: Project roadmaps, tasks, timelines, milestones.
  - **Git Graphs**: Branching workflows, merge commits, tags (`gitGraph`).
  - **Mindmaps**: Hierarchical brainstorming structures.
  - **Pie Charts**: Statistical data breakdown.
- **Curated Diagram Templates**: Built-in template selector providing boilerplate code for:
  - Data Processing Flowchart
  - API Interaction Sequence Diagram
  - Object-Oriented Class Hierarchy
  - Student Study Plan Mindmap
  - Git Flow Branching Strategy
- **Interactive Canvas Controls**:
  - Real-time SVG rendering.
  - Zoom in, Zoom out, and Reset view controls.
  - Pan and canvas drag support.
- **One-Click Vector Export**: Export diagrams directly as standalone `.svg` or `.png` images.
- **Live Syntax Validation**: Validates Mermaid syntax on the fly and surfaces informative syntax error badges.

### 3.5. Document Conversion & Image OCR to Text (Importing External Media)
Users are not limited to manually typing notes. The application includes a multi-format document parser and Optical Character Recognition (OCR) engine that converts uploaded media and documents into clean, structured Markdown notes:
- **Optical Character Recognition (OCR) for Images**:
  - Supports `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff`.
  - Integrates **Tesseract OCR (v5.5)** via `pytesseract` and `Pillow`.
  - Preprocesses images (grayscale/RGB conversion, contrast normalization) to extract legible text from handwritten notes, textbook pages, whiteboard photos, slides, and receipts.
- **PDF Text & Section Extraction**:
  - Supports `.pdf` documents using `pypdf`.
  - Extracts text page-by-page, appending structured page markers (e.g. `### Page 1\n...`) and section dividers for multi-page documents.
- **Microsoft Word (`.docx`) Structured Parsing**:
  - Uses `python-docx` to extract text while maintaining semantic structure:
    - Heading 1, 2, and 3 are automatically converted to Markdown headers (`#`, `##`, `###`).
    - Bullet and numbered lists are converted to `- item` and `1. item`.
    - Document tables are translated into clean Markdown tables (`| Col 1 | Col 2 |`).
- **Flexible Import & Insertion Modes**:
  - **Create As New Note**: Automatically derives title from document headers or filename, initializes version 1, and creates the note.
  - **Replace Note Content**: Replaces current editor contents with the converted document text.
  - **Append to Active Note**: Inserts the converted text at the end of the current note with spacing.
  - **Direct Text Preview & Editing**: Allows users to review, edit, or copy the converted text before applying.
- **Dashboard & Editor Integration**:
  - Accessible via 1-click **"Convert & OCR to Text"** card on the Dashboard.
  - Accessible via **"Import Document / OCR"** (`Upload` icon) in the Markdown Editor toolbar and options menu.

### 3.6. Hierarchical Organization & Taxonomy
- **Nested Folder Tree (`FolderTree`)**:
  - Multi-level parent-child folder structures.
  - Custom folder accent colors and custom folder icons.
  - Live note count badges per folder.
  - Expand / Collapse folder nodes with persistent state.
  - Dedicated Folder View pages displaying notes housed within specific folders.
- **Color-Coded Tags System (`TagList`)**:
  - Tags with user-defined hex colors (e.g., `#22c55e`, `#6366f1`, `#ec4899`).
  - Filter notes instantly by selecting tags in sidebar or editor.
  - Tag creation modal with color picker and name validation.
  - Dedicated Tag View pages showing all notes tagged with specific labels.
- **Smart Filter Collections**:
  - **All Notes**: Unfiltered view of active notes with grid/list view toggle.
  - **Pinned Notes**: Highlights priority notes at the top of note lists and dashboard.
  - **Favorites**: Bookmarked notes for fast, 1-click reference.
  - **Archived Notes**: Declutter active workspace by archiving completed notes without permanently deleting them.
  - **Trash / Deletion**: Safe deletion workflow with cascading relationship handling.

### 3.6. Global Search & Multi-Filter Engine
- **Command Palette / Modal (`⌘K` / `Ctrl+K`)**:
  - Accessible globally from any screen.
  - Instant keyboard navigation (Arrow keys, Enter to open, Esc to dismiss).
- **Full-Text Matching**:
  - Searches note titles, Markdown content, and tag names simultaneously.
  - Live debounced query execution for fast, smooth performance.
- **Multi-Criteria Filter Controls**:
  - Filter by Note Type: Markdown, Flowchart, Plain Text, Code.
  - Filter by Folder: Select specific directory.
  - Filter by Tag: Multi-tag intersection filtering.
  - Filter by Status: Pinned, Favorite, Archived.
  - Filter by Date: Creation and modification date ranges.
  - Sort Order: Sort by Last Updated (Newest/Oldest), Creation Date, Title (A-Z / Z-A).
- **Search Statistics & Suggestions**:
  - Endpoint `/api/v1/search/suggestions` delivers fast autocomplete suggestions.
  - Endpoint `/api/v1/search/stats` returns knowledge base analytics by type and category.

### 3.7. Version History & Audit Trail
- **Automated Snapshot Creation**: Whenever note content is updated, a snapshot is captured in the `note_versions` table.
- **Version Tracking**: Records version number, change summaries, content differences, and precise UTC timestamps.
- **Version Revert**: 1-click restore mechanism (`POST /api/v1/notes/{id}/versions/{version_id}/restore`) to instantly revert a note to any previous point in time.

### 3.8. User Preferences & Personalization
- **Theme Selection**:
  - **Dark Mode**: Sleek slate/indigo color palette (`#0f172a` / `#1e293b`) tailored for low-light environments.
  - **Light Mode**: Crisp, high-contrast light theme with subtle borders and shadows.
  - **System Default**: Automatically synchronizes with OS-level theme preferences.
- **Typography & Editor Controls**:
  - **Font Family**: Inter, Roboto, Fira Code, System Monospace.
  - **Font Size**: Adjustable slider (12px to 24px).
  - **Line Height**: Configurable line spacing (1.2 to 2.2).
  - **Tab Size**: Customizable tab spacing (2 or 4 spaces).
  - **Line Numbers**: Toggle line numbers display in editor.
  - **Word Wrap**: Enable or disable soft text wrapping.
  - **Vim Mode**: Optional Vim keybindings for power users.
- **Layout Preferences**:
  - Default Editor Mode: Split, Edit-Only, or Preview-Only.
  - Sidebar Width: Configurable width slider with collapsible drawer mode.
  - Toggle Toolbar & Status Bar visibility.
- **Data Portability**:
  - Export all notes to JSON or Markdown archives.
  - Import notes backups.
  - Account deletion and data wiping controls.

---

## 4. Keyboard Shortcuts Quick Reference

| Shortcut | Scope | Action |
|---|---|---|
| `⌘K` / `Ctrl+K` | Global | Open global search / command palette |
| `⌘N` / `Ctrl+Alt+N` | Global | Create a new note |
| `⌘S` / `Ctrl+S` | Editor | Save active note immediately |
| `Ctrl+1` / `Ctrl+2` / `Ctrl+3` | Editor | Apply Heading 1, 2, or 3 |
| `Ctrl+B` | Editor | Toggle Bold text (`**text**`) |
| `Ctrl+I` | Editor | Toggle Italic text (`*text*`) |
| `Ctrl+Shift+X` | Editor | Toggle Strikethrough (`~~text~~`) |
| `Ctrl+E` | Editor | Toggle Inline Code (`code`) |
| `Ctrl+Shift+8` | Editor | Insert Unordered Bullet List (`- `) |
| `Ctrl+Shift+7` | Editor | Insert Numbered List (`1. `) |
| `Ctrl+Shift+Q` | Editor | Insert Blockquote (`> `) |
| `Ctrl+Shift+I` | Editor | Insert Markdown Image (`![alt](url)`) |
| `Ctrl+Shift+F` | Editor | Toggle Distraction-Free Fullscreen Editor |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Editor | Undo / Redo text edits |
| `Esc` | Global | Close modals, search palette, or dropdowns |

---

## 5. Database Schema & Relational Models

```mermaid
erDiagram
    User ||--o{ Note : "owns"
    User ||--o{ Folder : "owns"
    User ||--o{ Tag : "owns"
    User ||--o| UserPreferences : "has"
    User ||--o{ RefreshToken : "has"
    User ||--o{ OAuthAccount : "has"

    Folder ||--o{ Note : "contains"
    Folder ||--o{ Folder : "subfolders"

    Note ||--o{ NoteTag : "tagged with"
    Tag ||--o{ NoteTag : "applied to"

    Note ||--o{ NoteVersion : "revisions"
```

### Table Definitions

#### `users`
- `id`: `CHAR(36)` UUID Primary Key
- `email`: `VARCHAR(255)` Unique, Indexed
- `hashed_password`: `VARCHAR(255)`
- `full_name`: `VARCHAR(255)`
- `avatar_url`: `VARCHAR(500)`
- `role`: `ENUM('student', 'teacher', 'admin')`
- `is_active`: `BOOLEAN`
- `is_verified`: `BOOLEAN`
- `last_login`: `DATETIME`
- `created_at`, `updated_at`: `DATETIME`

#### `notes`
- `id`: `CHAR(36)` UUID Primary Key
- `user_id`: `CHAR(36)` Foreign Key -> `users.id` (CASCADE)
- `folder_id`: `CHAR(36)` Foreign Key -> `folders.id` (SET NULL)
- `title`: `VARCHAR(500)`
- `content`: `TEXT` (Raw Markdown / Mermaid code)
- `content_html`: `TEXT` (Rendered cache)
- `note_type`: `ENUM('text', 'markdown', 'flowchart', 'diagram', 'code')`
- `is_pinned`, `is_archived`, `is_favorite`: `BOOLEAN`
- `word_count`: `INTEGER`
- `reading_time`: `INTEGER` (Minutes)
- `version`: `INTEGER`
- `last_edited_at`: `DATETIME`
- `created_at`, `updated_at`: `DATETIME`

#### `folders`
- `id`: `CHAR(36)` UUID Primary Key
- `user_id`: `CHAR(36)` Foreign Key -> `users.id` (CASCADE)
- `parent_id`: `CHAR(36)` Self-referencing Foreign Key -> `folders.id` (CASCADE)
- `name`: `VARCHAR(255)`
- `description`: `TEXT`
- `color`: `VARCHAR(7)` (Hex code)
- `icon`: `VARCHAR(50)` (Lucide icon identifier)
- `sort_order`: `INTEGER`
- `created_at`, `updated_at`: `DATETIME`

#### `tags`
- `id`: `CHAR(36)` UUID Primary Key
- `user_id`: `CHAR(36)` Foreign Key -> `users.id` (CASCADE)
- `name`: `VARCHAR(100)`
- `color`: `VARCHAR(7)` (Hex code)
- `created_at`: `DATETIME`
- *Constraint*: `UNIQUE(user_id, name)`

#### `note_tags` (Junction Table)
- `note_id`: `CHAR(36)` Foreign Key -> `notes.id` (CASCADE)
- `tag_id`: `CHAR(36)` Foreign Key -> `tags.id` (CASCADE)
- `created_at`: `DATETIME`
- *Primary Key*: `(note_id, tag_id)`

#### `note_versions`
- `id`: `CHAR(36)` UUID Primary Key
- `note_id`: `CHAR(36)` Foreign Key -> `notes.id` (CASCADE)
- `title`: `VARCHAR(500)`
- `content`: `TEXT`
- `content_html`: `TEXT`
- `version`: `INTEGER`
- `change_summary`: `VARCHAR(500)`
- `created_at`: `DATETIME`

#### `user_preferences`
- `user_id`: `CHAR(36)` Primary Key, Foreign Key -> `users.id` (CASCADE)
- `theme`: `VARCHAR(20)` (`dark`, `light`, `system`)
- `font_family`: `VARCHAR(100)`
- `font_size`: `INTEGER`
- `line_height`: `FLOAT`
- `editor_mode`: `VARCHAR(20)` (`split`, `edit`, `preview`)
- `auto_save`: `BOOLEAN`
- `auto_save_interval`: `INTEGER` (ms)
- `show_line_numbers`, `word_wrap`, `vim_mode`: `BOOLEAN`
- `sidebar_width`: `INTEGER` (px)
- `show_toolbar`, `show_status_bar`: `BOOLEAN`
- `language`, `date_format`, `time_format`: `VARCHAR`
- `notifications_enabled`, `email_notifications`: `BOOLEAN`

---

## 6. REST API Endpoint Catalog

All routes are versioned under `/api/v1` and protected via JWT Bearer authentication unless noted.

### Authentication Endpoints (`/api/v1/auth`)
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user account | Public |
| `POST` | `/auth/login` | Authenticate with credentials, returns JWT tokens | Public |
| `POST` | `/auth/refresh` | Exchange valid refresh token for a new access token | Public |
| `POST` | `/auth/logout` | Revoke active refresh token | Authenticated |
| `GET` | `/auth/me` | Fetch active user profile and roles | Authenticated |
| `GET` | `/auth/oauth/{provider}` | Initiate OAuth sign-in (Google/GitHub) | Public |
| `GET` | `/auth/oauth/{provider}/callback` | Process OAuth provider redirect callback | Public |

### Notes Endpoints (`/api/v1/notes`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/notes` | Retrieve paginated notes with optional filters (folder, tag, type, dates) |
| `POST` | `/notes` | Create a new note |
| `GET` | `/notes/{id}` | Retrieve note details by ID |
| `PATCH` | `/notes/{id}` | Update note title, content, folder, or tags |
| `DELETE` | `/notes/{id}` | Delete a note permanently |
| `POST` | `/notes/{id}/pin` | Toggle pinned status |
| `POST` | `/notes/{id}/favorite` | Toggle favorite status |
| `POST` | `/notes/{id}/archive` | Toggle archived status |
| `GET` | `/notes/{id}/versions` | Retrieve version history list for note |
| `POST` | `/notes/{id}/versions/{v_id}/restore` | Revert note to specified historical version |
| `POST` | `/notes/convert-file` | Parse image (OCR), PDF, or DOCX and return structured Markdown text |
| `POST` | `/notes/import-file` | Directly convert and persist an uploaded file as a new Note |

### Folders Endpoints (`/api/v1/folders`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/folders` | Get full hierarchical folder tree |
| `POST` | `/folders` | Create a new folder (root or nested subfolder) |
| `GET` | `/folders/{id}` | Get folder details and subfolder list |
| `PATCH` | `/folders/{id}` | Update folder name, color, icon, or parent |
| `DELETE` | `/folders/{id}` | Delete folder (with recursive cascade) |
| `POST` | `/folders/reorder` | Update custom sorting order of folders |

### Tags Endpoints (`/api/v1/tags`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/tags` | List all user tags |
| `GET` | `/tags/with-counts` | List all tags along with current note counts |
| `POST` | `/tags` | Create a new color-coded tag |
| `PATCH` | `/tags/{id}` | Update tag name or color |
| `DELETE` | `/tags/{id}` | Delete tag and detach from all notes |

### Flowchart Endpoints (`/api/v1/flowcharts`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/flowcharts/validate` | Validate Mermaid diagram syntax |
| `POST` | `/flowcharts/render` | Render Mermaid code to SVG on server |
| `POST` | `/flowcharts/export` | Export diagram to standalone SVG or PNG |
| `GET` | `/flowcharts/templates` | Retrieve library of boilerplate diagram templates |
| `GET` | `/flowcharts/themes` | Retrieve theme definitions for diagrams |

### Search & Analytics Endpoints (`/api/v1/search`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/search/notes` | Full-text debounced query across titles & bodies |
| `GET` | `/search/suggestions` | Fast title & tag autocomplete suggestions |
| `GET` | `/search/stats` | Aggregate stats: word counts, reading time, notes by type |
| `GET` | `/search/tags` | Fast search across tags |
| `GET` | `/search/folders` | Fast search across folder names |

### User Preferences Endpoints (`/api/v1/preferences`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/preferences` | Retrieve user preferences (theme, fonts, editor mode) |
| `PATCH` | `/preferences` | Update user preferences |

---

## 7. Application Directory Structure

```
chitralekh/
├── backend/
│   ├── alembic/                  # Database migration scripts & env
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py           # Dependency injection (Auth, DB session)
│   │   │   └── v1/               # Version 1 API routers
│   │   │       ├── auth.py       # Authentication & OAuth routes
│   │   │       ├── flowcharts.py # Mermaid validation, templates, exports
│   │   │       ├── folders.py    # Folder hierarchy & reordering
│   │   │       ├── notes.py      # Note CRUD, versions, pin/favorite/archive
│   │   │       ├── preferences.py# User preferences & editor settings
│   │   │       ├── search.py     # Global full-text search & suggestions
│   │   │       ├── tags.py       # Tag CRUD & with-counts endpoint
│   │   │       └── users.py      # User account endpoints
│   │   ├── core/
│   │   │   ├── config.py         # App configuration & environment parsing
│   │   │   ├── database.py       # SQLAlchemy engine & session factories
│   │   │   └── security.py       # Password hashing & JWT generation
│   │   ├── models/               # SQLAlchemy ORM declarative models
│   │   ├── schemas/              # Pydantic v2 schemas for requests/responses
│   │   ├── services/             # Business logic & background utilities
│   │   └── main.py               # FastAPI application factory & middleware
│   ├── tests/                    # Pytest test suite (19 unit/integration tests)
│   ├── Dockerfile                # Backend production container configuration
│   └── requirements.txt          # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── FolderTree.tsx    # Nested folder hierarchy navigation
│   │   │   ├── Header.tsx        # Top navbar with search trigger & theme toggle
│   │   │   ├── SearchModal.tsx   # Global ⌘K search & filter modal
│   │   │   ├── Sidebar.tsx       # Main navigation drawer & collections
│   │   │   └── TagList.tsx       # Tag badges & tag management modal
│   │   ├── pages/                # Route view components
│   │   │   ├── DashboardPage.tsx     # Overview metrics, stats, recent notes
│   │   │   ├── NoteEditorPage.tsx    # Rich Markdown editor with TOC & split view
│   │   │   ├── FlowchartEditorPage.tsx # Mermaid visual diagram studio
│   │   │   ├── NotesListPage.tsx     # Filterable list & grid notes gallery
│   │   │   ├── PinnedNotesPage.tsx   # Priority pinned notes view
│   │   │   ├── FavoritesNotesPage.tsx# Starred favorites view
│   │   │   ├── ArchivedNotesPage.tsx # Archive management view
│   │   │   ├── FolderNotesPage.tsx   # Notes scoped to specific folder
│   │   │   ├── TagNotesPage.tsx      # Notes filtered by specific tag
│   │   │   ├── LoginPage.tsx         # User authentication form
│   │   │   ├── RegisterPage.tsx      # Account creation form
│   │   │   ├── ProfilePage.tsx       # User profile details
│   │   │   ├── SettingsPage.tsx      # Preferences, theme, editor configuration
│   │   │   └── HelpPage.tsx          # Documentation & keyboard shortcut cheat sheet
│   │   ├── hooks/                # Custom React hooks (useNotes, useAuth, useEditor)
│   │   ├── services/api.ts       # Axios client with JWT interceptors
│   │   ├── types/                # TypeScript interfaces & types
│   │   ├── utils/                # Slugify, formatting, TOC extraction utilities
│   │   ├── App.tsx               # Main layout wrapper & router definitions
│   │   └── main.tsx              # React DOM entrypoint
│   ├── package.json              # NPM dependencies & scripts
│   ├── tsconfig.json             # TypeScript compiler settings
│   ├── vite.config.ts            # Vite build configuration
│   └── tailwind.config.js        # Tailwind design tokens & plugins
│
├── nginx/                        # Nginx reverse proxy configuration
├── docker-compose.yml            # Local dev multi-container composition
├── docker-compose.prod.yml       # Production container composition
├── README.md                     # Quick-start documentation
└── APP_DESCRIPTION_AND_FEATURES.md # (This file) Comprehensive specification
```

---

## 8. Deployment & Environment Setup

### Environment Configuration

#### Backend (`backend/.env`)
```env
# Database Settings (Supports MySQL, PostgreSQL, or SQLite)
DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/notes_app?charset=utf8mb4
DATABASE_URL_SYNC=mysql+pymysql://root:password@localhost:3306/notes_app?charset=utf8mb4

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# Security & Tokens
SECRET_KEY=your-super-secret-key-at-least-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Allowed Origins
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","http://127.0.0.1:5173"]

# Application Runtime
DEBUG=true
ENVIRONMENT=development
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

### Running Locally

```bash
# 1. Start Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Frontend
cd ../frontend
npm install
npm run dev
```

### Running with Docker Compose

```bash
# Build and run backend, frontend, database, and redis
docker-compose up --build -d
```

Frontend will be accessible at `http://localhost:5173` and the Backend API documentation at `http://localhost:8000/api/v1/docs`.
