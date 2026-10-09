# Chitralekh (चित्रलेख) — Smart Notes & Flowcharts

A production-ready notes management and flowchart studio for students with diagrams, OCR, search, customization, and more.

> 📖 **Comprehensive Specification**: For an in-depth architectural breakdown, database models, REST API catalog, and detailed feature list, see [APP_DESCRIPTION_AND_FEATURES.md](APP_DESCRIPTION_AND_FEATURES.md).

## Features

- **Notes Management**: Create, edit, organize, and search notes
- **Document & Image Conversion (OCR)**: Extract and convert Images (OCR via Tesseract), PDFs, and Word Documents (.docx) into editable Markdown notes
- **Multiple Note Types**: Markdown, Flowcharts, Diagrams, Code, Text
- **Flowchart Editor**: Mermaid.js support with live preview, templates, and export
- **Organization**: Nested folders, tags with colors, pinning, favorites, archiving
- **Search & Filters**: Full-text search, filters by folder, tag, type, date
- **Customization**: Light/dark/system themes, fonts, editor settings, layout options
- **Table of Contents**: Auto-generated from headings
- **Version History**: Track changes and restore previous versions
- **Authentication**: Email/password + OAuth (Google, GitHub, Microsoft)
- **Responsive Design**: Works on mobile and desktop
- **Offline Support**: Service worker for offline access
- **Accessibility**: WCAG 2.1 AA compliant

## Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework
- **MySQL 8.0** - Primary database
- **SQLAlchemy 2.0** - Async ORM
- **Alembic** - Database migrations
- **Redis** - Caching and sessions
- **JWT** - Authentication tokens
- **Passlib** - Password hashing
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **React Markdown** - Markdown rendering
- **Mermaid.js** - Flowchart rendering
- **React Hot Toast** - Notifications
- **@dnd-kit** - Drag and drop

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Local development
- **GitHub Actions** - CI/CD
- **PostgreSQL** - Production database
- **Redis** - Production cache

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Ritik-453/chitrlekh.git
cd chitralekh

# Copy environment file
cp backend/.env.example backend/.env

# Edit .env with your settings
# Required: SECRET_KEY, DATABASE_URL, REDIS_URL

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/v1/docs
```

### Local Development

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
chitralekh/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── v1/       # API version 1
│   │   ├── core/         # Core configuration
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   ├── alembic/          # Database migrations
│   ├── tests/            # Tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── context/      # React context
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utilities
│   │   └── styles/       # Global styles
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=mysql+aiomysql://user:pass@localhost:3306/notes_app?charset=utf8mb4
DATABASE_URL_SYNC=mysql+pymysql://user:pass@localhost:3306/notes_app?charset=utf8mb4

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# App
DEBUG=true
ENVIRONMENT=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

## Key API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/oauth/{provider}` - OAuth login

### Notes
- `GET /api/v1/notes` - List notes (with filters)
- `POST /api/v1/notes` - Create note
- `GET /api/v1/notes/{id}` - Get note
- `PATCH /api/v1/notes/{id}` - Update note
- `DELETE /api/v1/notes/{id}` - Delete note
- `POST /api/v1/notes/{id}/pin` - Toggle pin
- `POST /api/v1/notes/{id}/favorite` - Toggle favorite
- `POST /api/v1/notes/{id}/archive` - Toggle archive
- `GET /api/v1/notes/{id}/versions` - Get versions
- `POST /api/v1/notes/{id}/versions/{version_id}/restore` - Restore version

### Folders
- `GET /api/v1/folders` - List folders (tree)
- `POST /api/v1/folders` - Create folder
- `PATCH /api/v1/folders/{id}` - Update folder
- `DELETE /api/v1/folders/{id}` - Delete folder
- `POST /api/v1/folders/reorder` - Reorder folders

### Tags
- `GET /api/v1/tags` - List tags
- `POST /api/v1/tags` - Create tag
- `PATCH /api/v1/tags/{id}` - Update tag
- `DELETE /api/v1/tags/{id}` - Delete tag

### Search
- `GET /api/v1/search/notes` - Search notes
- `GET /api/v1/search/suggestions` - Get search suggestions
- `GET /api/v1/search/stats` - Get statistics

### Flowcharts
- `POST /api/v1/flowcharts/validate` - Validate Mermaid code
- `POST /api/v1/flowcharts/render` - Render to SVG
- `POST /api/v1/flowcharts/export` - Export diagram
- `GET /api/v1/flowcharts/templates` - Get templates
- `GET /api/v1/flowcharts/themes` - Get themes

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open search |
| `⌘N` | New note |
| `⌘S` | Save note |
| `⌘B` | Bold |
| `⌘I` | Italic |
| `⌘E` | Inline code |
| `⌘1/2/3` | Heading 1/2/3 |
| `⌘Shift+8` | Bullet list |
| `⌘Shift+7` | Numbered list |
| `⌘Shift+Q` | Quote block |
| `⌘Shift+X` | Strikethrough |
| `⌘Enter` | Save note |
| `Esc` | Close modals |
| `⌘/` | Toggle preview |
| `⌘Shift+F` | Fullscreen editor |

## Deployment

### Production Checklist
- [ ] Set strong `SECRET_KEY` (32+ chars)
- [ ] Configure production `DATABASE_URL`
- [ ] Configure production `REDIS_URL`
- [ ] Set `DEBUG=false`
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure OAuth credentials
- [ ] Set up HTTPS/TLS
- [ ] Configure CORS origins
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Set up CI/CD pipeline

### Docker Production
```bash
# Build images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Testing

### Backend
```bash
cd backend
pytest --cov=app --cov-report=html
```

### Frontend
```bash
cd frontend
npm run test
npm run test:ui
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linters
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: `/help` in the app
- Issues: GitHub Issues
- Discussions: GitHub Discussions