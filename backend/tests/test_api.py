import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
import tempfile
import os

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models import User, Note, Folder, Tag, NoteType, UserPreferences
from app.core.security import get_password_hash, create_access_token
from sqlalchemy import select
import uuid


# Use a temporary file-based SQLite database for testing
# NullPool creates a new connection for each request, allowing proper transaction isolation
temp_db_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
temp_db_file.close()
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{temp_db_file.name}"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)

TestingSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Clean up temp file after test
    try:
        os.unlink(temp_db_file.name)
    except:
        pass


@pytest.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def test_user(db_session):
    user = User(
        email=f"test{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    prefs = UserPreferences(user_id=user.id)
    db_session.add(prefs)
    await db_session.commit()
    
    return user


@pytest.fixture
async def auth_headers(test_user):
    access_token = create_access_token(data={"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


class TestAuth:
    async def test_register(self, client):
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "newuser@example.com", "password": "password123", "full_name": "New User"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data

    async def test_login(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": test_user.email, "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_get_me(self, client, auth_headers, test_user):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email

    async def test_refresh_token_and_logout(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            data={"username": test_user.email, "password": "testpassword123"},
        )
        assert login_resp.status_code == 200
        refresh_token = login_resp.json()["refresh_token"]

        # Test refresh via header
        refresh_resp = await client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        assert refresh_resp.status_code == 200
        assert "access_token" in refresh_resp.json()
        new_refresh_token = refresh_resp.json()["refresh_token"]

        # Test refresh via cookie
        refresh_cookie_resp = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": new_refresh_token},
        )
        assert refresh_cookie_resp.status_code == 200
        assert "access_token" in refresh_cookie_resp.json()

        # Test logout
        logout_resp = await client.post(
            "/api/v1/auth/logout",
            cookies={"refresh_token": refresh_cookie_resp.json()["refresh_token"]},
        )
        assert logout_resp.status_code == 200
        assert logout_resp.json()["message"] == "Successfully logged out"


class TestNotes:
    async def test_create_note(self, client, auth_headers):
        response = await client.post(
            "/api/v1/notes",
            json={"title": "Test Note", "content": "Test content", "note_type": "markdown"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Test Note"
        assert data["content"] == "Test content"

    async def test_list_notes(self, client, auth_headers, test_user, db_session):
        note = Note(
            user_id=test_user.id,
            title="Test Note",
            content="Test content",
            note_type=NoteType.MARKDOWN,
        )
        db_session.add(note)
        await db_session.commit()

        response = await client.get("/api/v1/notes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_get_note(self, client, auth_headers, test_user):
        # Create note via API
        create_response = await client.post(
            "/api/v1/notes",
            json={"title": "Test Note", "content": "Test content", "note_type": "markdown"},
            headers=auth_headers,
        )
        assert create_response.status_code == 201
        note_id = create_response.json()["id"]
        
        response = await client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Note"
        assert data["user_id"] == str(test_user.id)

    async def test_update_note(self, client, auth_headers, test_user):
        # Create note via API
        create_response = await client.post(
            "/api/v1/notes",
            json={"title": "Original Title", "content": "Original content", "note_type": "markdown"},
            headers=auth_headers,
        )
        assert create_response.status_code == 201
        note_id = create_response.json()["id"]
        
        response = await client.patch(
            f"/api/v1/notes/{note_id}",
            json={"title": "Updated Title", "content": "Updated content"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["version"] == 2

    async def test_delete_note(self, client, auth_headers, test_user):
        # Create note via API
        create_response = await client.post(
            "/api/v1/notes",
            json={"title": "Test Note", "content": "Test content", "note_type": "markdown"},
            headers=auth_headers,
        )
        assert create_response.status_code == 201
        note_id = create_response.json()["id"]
        
        response = await client.delete(f"/api/v1/notes/{note_id}", headers=auth_headers)
        assert response.status_code == 200

        response = await client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
        assert response.status_code == 404


class TestFolders:
    async def test_create_folder(self, client, auth_headers):
        response = await client.post(
            "/api/v1/folders",
            json={"name": "Test Folder", "color": "#ff0000"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Folder"
        assert data["color"] == "#ff0000"

    async def test_list_folders(self, client, auth_headers, test_user, db_session):
        folder = Folder(
            user_id=test_user.id,
            name="Test Folder",
            color="#ff0000",
        )
        db_session.add(folder)
        await db_session.commit()

        response = await client.get("/api/v1/folders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1


class TestTags:
    async def test_create_tag(self, client, auth_headers):
        response = await client.post(
            "/api/v1/tags",
            json={"name": "test-tag", "color": "#00ff00"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "test-tag"
        assert data["color"] == "#00ff00"

    async def test_list_tags(self, client, auth_headers, test_user, db_session):
        tag = Tag(
            user_id=test_user.id,
            name="test-tag",
            color="#00ff00",
        )
        db_session.add(tag)
        await db_session.commit()

        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1


class TestSearch:
    async def test_search_notes(self, client, auth_headers, test_user, db_session):
        note1 = Note(
            user_id=test_user.id,
            title="Python Tutorial",
            content="Learn Python programming",
            note_type=NoteType.MARKDOWN,
        )
        note2 = Note(
            user_id=test_user.id,
            title="JavaScript Guide",
            content="Learn JavaScript",
            note_type=NoteType.MARKDOWN,
        )
        db_session.add_all([note1, note2])
        await db_session.commit()

        response = await client.get("/api/v1/search/notes?q=Python", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Python Tutorial"


class TestPreferences:
    async def test_get_preferences(self, client, auth_headers):
        response = await client.get("/api/v1/preferences", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "theme" in data

    async def test_update_preferences(self, client, auth_headers):
        response = await client.patch(
            "/api/v1/preferences",
            json={"theme": "dark", "font_size": 18},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        assert data["font_size"] == 18


class TestFlowcharts:
    async def test_flowchart_validate(self, client, auth_headers):
        response = await client.post(
            "/api/v1/flowcharts/validate",
            json={"code": "flowchart TD\nA-->B"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["valid"] is True

    async def test_flowchart_render(self, client, auth_headers):
        response = await client.post(
            "/api/v1/flowcharts/render",
            json={"code": "flowchart TD\nA-->B", "theme": "default", "direction": "TD"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "svg" in response.json()


class TestNotesWithTags:
    async def test_note_with_tags_serialization(self, client, auth_headers):
        tag_resp = await client.post(
            "/api/v1/tags",
            json={"name": "python-tag", "color": "#10b981"},
            headers=auth_headers,
        )
        assert tag_resp.status_code == 201
        tag_id = tag_resp.json()["id"]

        note_resp = await client.post(
            "/api/v1/notes",
            json={
                "title": "Tagged Note",
                "content": "Content with tags",
                "note_type": "markdown",
                "tags": [tag_id],
            },
            headers=auth_headers,
        )
        assert note_resp.status_code == 201
        note_data = note_resp.json()
        assert len(note_data["tags"]) == 1
        assert note_data["tags"][0]["name"] == "python-tag"

        list_resp = await client.get("/api/v1/notes", headers=auth_headers)
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        tagged = [item for item in items if item["id"] == note_data["id"]]
        assert len(tagged) == 1
        assert len(tagged[0]["tags"]) == 1
        assert tagged[0]["tags"][0]["name"] == "python-tag"

    async def test_filter_notes_by_tag(self, client, auth_headers):
        # Create 2 tags
        tag1 = (await client.post("/api/v1/tags", json={"name": "tag-alpha", "color": "#111111"}, headers=auth_headers)).json()
        tag2 = (await client.post("/api/v1/tags", json={"name": "tag-beta", "color": "#222222"}, headers=auth_headers)).json()

        # Create note with tag1
        note1 = (await client.post("/api/v1/notes", json={"title": "Note 1", "content": "Alpha content", "note_type": "markdown", "tags": [tag1["id"]]}, headers=auth_headers)).json()
        # Create note with tag2
        note2 = (await client.post("/api/v1/notes", json={"title": "Note 2", "content": "Beta content", "note_type": "markdown", "tags": [tag2["id"]]}, headers=auth_headers)).json()

        # Filter by tag1
        resp1 = await client.get(f"/api/v1/notes?tag_ids={tag1['id']}", headers=auth_headers)
        assert resp1.status_code == 200
        items1 = resp1.json()["items"]
        assert any(n["id"] == note1["id"] for n in items1)
        assert not any(n["id"] == note2["id"] for n in items1)

        # Filter by tag2
        resp2 = await client.get(f"/api/v1/notes?tag_ids={tag2['id']}", headers=auth_headers)
        assert resp2.status_code == 200
        items2 = resp2.json()["items"]
        assert any(n["id"] == note2["id"] for n in items2)
        assert not any(n["id"] == note1["id"] for n in items2)


class TestFileConversion:
    async def test_convert_text_file(self, client, auth_headers):
        file_content = b"# Imported Markdown Note\n\nThis is a test content from an imported file."
        files = {"file": ("test_import.md", file_content, "text/markdown")}
        response = await client.post(
            "/api/v1/notes/convert-file",
            files=files,
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["file_type"] == "text"
        assert "Imported Markdown Note" in data["text"]
        assert data["suggested_title"] == "Imported Markdown Note"

    async def test_convert_docx_file(self, client, auth_headers):
        import io, docx
        doc = docx.Document()
        doc.add_heading("Docx Note Title", level=1)
        doc.add_paragraph("Paragraph from word document.")
        buf = io.BytesIO()
        doc.save(buf)
        files = {"file": ("lecture.docx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        response = await client.post(
            "/api/v1/notes/convert-file",
            files=files,
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["file_type"] == "docx"
        assert "# Docx Note Title" in data["text"]
        assert "Paragraph from word document." in data["text"]

    async def test_convert_handwritten_mode_image(self, client, auth_headers):
        import io
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (400, 150), color="white")
        draw = ImageDraw.Draw(img)
        draw.text((20, 50), "Hello Handwritten", fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        files = {"file": ("notes.png", buf.getvalue(), "image/png")}
        data = {"mode": "handwritten"}
        response = await client.post(
            "/api/v1/notes/convert-file",
            files=files,
            data=data,
            headers=auth_headers,
        )
        assert response.status_code == 200
        res = response.json()
        assert res["file_type"] == "image"
        assert "Hello" in res["text"] or "Handwritten" in res["text"] or len(res["text"]) > 0

    async def test_import_file_as_note(self, client, auth_headers):
        file_content = b"# Direct Imported Note\n\nDirectly converted and saved."
        files = {"file": ("direct_note.txt", file_content, "text/plain")}
        response = await client.post(
            "/api/v1/notes/import-file",
            files=files,
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Direct Imported Note"
        assert "Directly converted and saved." in data["content"]
        assert data["note_type"] == "markdown"


class TestCentralRepository:
    async def test_create_and_get_central_repo_item(self, client, auth_headers):
        payload = {
            "title": "Data Structures & Algorithms Comprehensive Guide",
            "description": "Complete lecture notes covering trees, graphs, and dynamic programming.",
            "content": "# DSA Notes\n\n## Binary Search Trees\nBalanced BST operations...",
            "institution": "Stanford University",
            "department": "Computer Science",
            "course_code": "CS106B",
            "course_name": "Programming Abstractions",
            "batch": "Batch 2024-2028",
            "semester": "Semester 2",
            "note_type": "markdown",
            "initial_change_summary": "Initial notes passed down from Batch 2024",
        }
        res = await client.post("/api/v1/central-repository", json=payload, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == payload["title"]
        assert data["current_version"] == 1
        assert len(data["versions"]) == 1
        assert data["versions"][0]["updater_batch"] == "Batch 2024-2028"

        # Fetch item
        get_res = await client.get(f"/api/v1/central-repository/{data['id']}", headers=auth_headers)
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["views_count"] >= 1

    async def test_contribute_next_batch_version(self, client, auth_headers):
        # Create item
        item = (await client.post("/api/v1/central-repository", json={
            "title": "Physics II Electromagnetism",
            "content": "Maxwell equations unit 1",
            "institution": "MIT",
            "department": "Physics",
            "batch": "Batch 2023",
            "course_code": "PHYS802",
        }, headers=auth_headers)).json()

        # Next batch student updates it
        update_payload = {
            "title": "Physics II Electromagnetism (Updated 2025)",
            "content": "Maxwell equations unit 1 and unit 2 with solved examples",
            "updater_name": "Junior Student Alex",
            "updater_batch": "Batch 2025",
            "change_summary": "Added Unit 2 radiation formulas and resolved past exam questions.",
        }
        ver_res = await client.post(
            f"/api/v1/central-repository/{item['id']}/version",
            json=update_payload,
            headers=auth_headers,
        )
        assert ver_res.status_code == 200
        ver_data = ver_res.json()
        assert ver_data["current_version"] == 2
        assert len(ver_data["versions"]) == 2
        assert ver_data["versions"][0]["version_number"] == 2
        assert ver_data["versions"][0]["updater_name"] == "Junior Student Alex"
        assert ver_data["versions"][0]["updater_batch"] == "Batch 2025"

    async def test_fork_repo_item_to_personal_notes(self, client, auth_headers):
        item = (await client.post("/api/v1/central-repository", json={
            "title": "Operating Systems Virtual Memory",
            "content": "Paging and TLB architecture notes",
            "institution": "IIT Delhi",
            "department": "Computer Science",
            "batch": "Batch 2024",
            "course_code": "COL331",
        }, headers=auth_headers)).json()

        fork_res = await client.post(f"/api/v1/central-repository/{item['id']}/fork", headers=auth_headers)
        assert fork_res.status_code == 200
        forked_note = fork_res.json()
        assert "Operating Systems" in forked_note["title"]
        assert "Paging and TLB" in forked_note["content"]
        assert "Central Repository" in forked_note["content"]

    async def test_central_repo_meta_and_filters(self, client, auth_headers):
        meta_res = await client.get("/api/v1/central-repository/meta", headers=auth_headers)
        assert meta_res.status_code == 200
        meta = meta_res.json()
        assert "institutions" in meta
        assert "departments" in meta
        assert "batches" in meta

        list_res = await client.get("/api/v1/central-repository?institution=MIT", headers=auth_headers)
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        assert all("MIT" in it["institution"] for it in items)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])