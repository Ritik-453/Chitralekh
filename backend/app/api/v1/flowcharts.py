from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_active_user, get_optional_user
from app.models import Note, NoteType
from app.schemas import FlowchartData, FlowchartExport

router = APIRouter()


class FlowchartValidateRequest(BaseModel):
    code: str


class FlowchartValidateResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    ast: Optional[dict] = None


@router.post("/validate", response_model=FlowchartValidateResponse)
async def validate_flowchart(
    request: FlowchartValidateRequest,
    current_user = Depends(get_optional_user),
):
    try:
        import mermaid
        ast = mermaid.parse(request.code)
        return FlowchartValidateResponse(valid=True, ast=ast)
    except ImportError:
        valid_starters = ["flowchart", "graph", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "gantt", "pie", "gitGraph", "mindmap", "timeline", "quadrantChart"]
        first_line = request.code.strip().split("\n")[0].strip() if request.code.strip() else ""
        is_valid = any(first_line.startswith(s) for s in valid_starters)
        if is_valid:
            return FlowchartValidateResponse(valid=True)
        return FlowchartValidateResponse(valid=False, error=f"Diagram should begin with a valid mermaid header such as flowchart, graph, sequenceDiagram, etc.")
    except Exception as e:
        return FlowchartValidateResponse(valid=False, error=str(e))


@router.post("/render")
async def render_flowchart(
    data: FlowchartData,
    current_user = Depends(get_optional_user),
):
    try:
        import mermaid
        from mermaid import Mermaid
        
        mmd = Mermaid(data.code)
        svg = mmd.to_svg()
        
        return {"svg": svg}
    except ImportError:
        import html
        escaped_code = html.escape(data.code)
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="#1e293b" rx="8"/><foreignObject x="20" y="20" width="560" height="260"><pre xmlns="http://www.w3.org/1999/xhtml" style="color: #f8fafc; font-family: monospace; font-size: 13px; white-space: pre-wrap;">{escaped_code}</pre></foreignObject></svg>'
        return {"svg": svg}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to render flowchart: {str(e)}")


@router.post("/export")
async def export_flowchart(
    data: FlowchartExport,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    note_id = getattr(data, 'note_id', None)
    
    if not note_id:
        raise HTTPException(status_code=400, detail="Note ID required")
    
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.note_type != NoteType.FLOWCHART:
        raise HTTPException(status_code=400, detail="Note is not a flowchart")
    
    try:
        import mermaid
        from mermaid import Mermaid
        
        mmd = Mermaid(note.content or "")
        
        if data.format == "svg":
            output = mmd.to_svg()
            media_type = "image/svg+xml"
        elif data.format == "png":
            output = mmd.to_png()
            media_type = "image/png"
        elif data.format == "pdf":
            output = mmd.to_pdf()
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
        
        from fastapi.responses import Response
        return Response(content=output, media_type=media_type)
    except ImportError:
        import html
        from fastapi.responses import Response
        escaped_code = html.escape(note.content or "")
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="#1e293b" rx="8"/><foreignObject x="20" y="20" width="560" height="260"><pre xmlns="http://www.w3.org/1999/xhtml" style="color: #f8fafc; font-family: monospace; font-size: 13px; white-space: pre-wrap;">{escaped_code}</pre></foreignObject></svg>'
        return Response(content=svg, media_type="image/svg+xml")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to export flowchart: {str(e)}")


@router.get("/templates")
async def get_flowchart_templates():
    templates = [
        {
            "id": "flowchart-basic",
            "name": "Basic Flowchart",
            "description": "Simple flowchart with decision nodes",
            "code": """flowchart TD
    A[Start] --> B{Decision?}
    B -- Yes --> C[Action 1]
    B -- No --> D[Action 2]
    C --> E[End]
    D --> E""",
            "category": "basic",
        },
        {
            "id": "flowchart-process",
            "name": "Process Flow",
            "description": "Multi-step process with parallel paths",
            "code": """flowchart TD
    A[Start Process] --> B[Input Data]
    B --> C{Validate?}
    C -- Valid --> D[Process Data]
    C -- Invalid --> E[Log Error]
    E --> B
    D --> F{Complete?}
    F -- Yes --> G[Output Result]
    F -- No --> D
    G --> H[End]""",
            "category": "process",
        },
        {
            "id": "sequence-diagram",
            "name": "Sequence Diagram",
            "description": "API interaction sequence",
            "code": """sequenceDiagram
    participant Client
    participant API
    participant Database
    
    Client->>API: GET /notes
    API->>Database: SELECT * FROM notes
    Database-->>API: Return notes
    API-->>Client: 200 OK + notes""",
            "category": "sequence",
        },
        {
            "id": "class-diagram",
            "name": "Class Diagram",
            "description": "Object-oriented class structure",
            "code": """classDiagram
    class User {
        +id: UUID
        +email: String
        +fullName: String
        +login()
        +logout()
    }
    class Note {
        +id: UUID
        +title: String
        +content: String
        +create()
        +update()
        +delete()
    }
    class Folder {
        +id: UUID
        +name: String
        +addNote()
        +removeNote()
    }
    User "1" -- "*" Note
    User "1" -- "*" Folder""",
            "category": "class",
        },
        {
            "id": "mindmap",
            "name": "Mindmap",
            "description": "Hierarchical mind map",
            "code": """mindmap
    root((Study Plan))
        Math
            Algebra
            Calculus
            Statistics
        Science
            Physics
            Chemistry
            Biology
        Languages
            English
            Spanish
            Programming
                Python
                JavaScript""",
            "category": "mindmap",
        },
        {
            "id": "git-flow",
            "name": "Git Flow",
            "description": "Git branching strategy",
            "code": """gitGraph
    commit
    branch develop
    checkout develop
    commit
    branch feature
    checkout feature
    commit
    commit
    checkout develop
    merge feature
    commit
    branch release
    checkout release
    commit
    checkout main
    merge release
    checkout develop
    merge release""",
            "category": "git",
        },
    ]
    return {"templates": templates}


@router.get("/themes")
async def get_flowchart_themes():
    themes = [
        {"id": "default", "name": "Default", "css": ""},
        {"id": "dark", "name": "Dark", "css": "background-color: #1e1e1e; color: #d4d4d4;"},
        {"id": "forest", "name": "Forest", "css": "background-color: #f0f8f0; color: #2e4a2e;"},
        {"id": "neutral", "name": "Neutral", "css": "background-color: #f5f5f5; color: #333;"},
    ]
    return {"themes": themes}