from typing import Optional, AsyncGenerator
from fastapi import Depends, HTTPException, status, Header, Cookie, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2AuthorizationCodeBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token, verify_token_type
from app.models import User, RefreshToken

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if not payload or not verify_token_type(token, "access"):
        raise credentials_exception
    
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise credentials_exception
    
    return user


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_token(token)
        if not payload or not verify_token_type(token, "access"):
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return None
        return user
    except Exception:
        return None


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
    authorization: Optional[str] = Header(default=None),
) -> RefreshToken:
    raw_token = refresh_token_cookie
    if not raw_token and authorization:
        if authorization.startswith("Bearer "):
            raw_token = authorization[7:].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        try:
            body = await request.json()
            if isinstance(body, dict):
                raw_token = body.get("refresh_token")
        except Exception:
            pass

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    payload = decode_token(raw_token)
    if not payload or not verify_token_type(raw_token, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == raw_token,
            RefreshToken.revoked == False,
        )
    )
    refresh_token = result.scalar_one_or_none()
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )
    
    return refresh_token


async def get_optional_refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
    authorization: Optional[str] = Header(default=None),
) -> Optional[RefreshToken]:
    try:
        return await get_refresh_token(request, db, refresh_token_cookie, authorization)
    except HTTPException:
        return None


class CommonQueryParams:
    def __init__(
        self,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
    ):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), 100)
        self.sort_by = sort_by
        self.sort_order = sort_order.lower()
        self.offset = (self.page - 1) * self.page_size