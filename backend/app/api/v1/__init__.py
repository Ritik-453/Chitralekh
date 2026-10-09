from fastapi import APIRouter

from app.api.v1 import auth, users, notes, folders, tags, preferences, flowcharts, search, central_repository, sync

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(folders.router, prefix="/folders", tags=["folders"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(flowcharts.router, prefix="/flowcharts", tags=["flowcharts"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(central_repository.router, prefix="/central-repository", tags=["central-repository"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])