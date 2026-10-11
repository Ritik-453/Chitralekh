from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import httpx
import os

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.api.deps import get_current_user, get_refresh_token, get_optional_refresh_token
from app.models import User, RefreshToken, OAuthAccount
from app.schemas import (
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
    UserPasswordUpdate,
    RefreshTokenCreate,
    OAuthAccountCreate,
    OAuthAccountResponse,
    ErrorResponse,
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        is_verified=settings.DEBUG,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    from app.models import UserPreferences
    prefs = UserPreferences(user_id=user.id)
    db.add(prefs)
    await db.commit()
    
    return user


@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})
    
    rt = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    refresh_token: RefreshToken = Depends(get_refresh_token),
    db: AsyncSession = Depends(get_db),
):
    refresh_token.revoked = True
    
    user = await db.get(User, refresh_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    new_access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})
    
    new_rt = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    await db.commit()
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    return Token(access_token=new_access_token, refresh_token=new_refresh_token)


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: Optional[RefreshToken] = Depends(get_optional_refresh_token),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        refresh_token.revoked = True
        await db.commit()
    
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/password")
async def change_password(
    password_update: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(password_update.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    
    current_user.hashed_password = get_password_hash(password_update.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(current_user)
    await db.commit()
    return {"message": "Account deleted successfully"}


def get_oauth_redirect_uri(request: Request, provider: str) -> str:
    base = os.environ.get("RENDER_EXTERNAL_URL") or str(request.base_url).rstrip('/')
    if base.startswith("http://") and "localhost" not in base:
        base = "https://" + base[len("http://"):]
    return f"{base}{settings.API_V1_STR}/auth/oauth/{provider}/callback"


@router.get("/oauth/{provider}")
async def oauth_login(provider: str, request: Request):
    if provider not in ["google", "github", "microsoft"]:
        raise HTTPException(status_code=400, detail="Unsupported OAuth provider")
    
    client_id_map = {
        "google": settings.GOOGLE_CLIENT_ID,
        "github": settings.GITHUB_CLIENT_ID,
        "microsoft": settings.MICROSOFT_CLIENT_ID,
    }
    
    client_id = client_id_map.get(provider)
    if not client_id:
        raise HTTPException(
            status_code=400,
            detail=f"{provider} OAuth not configured. Please set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET in environment variables, or sign in with email/password."
        )
    
    cb_url = get_oauth_redirect_uri(request, provider)
    redirect_url_map = {
        "google": f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={cb_url}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent",
        "github": f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={cb_url}&scope=read:user%20user:email",
        "microsoft": f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={client_id}&redirect_uri={cb_url}&response_type=code&scope=openid%20email%20profile%20offline_access",
    }
    
    return RedirectResponse(url=redirect_url_map[provider])


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if provider not in ["google", "github", "microsoft"]:
        raise HTTPException(status_code=400, detail="Unsupported OAuth provider")
    
    client_id_map = {
        "google": settings.GOOGLE_CLIENT_ID,
        "github": settings.GITHUB_CLIENT_ID,
        "microsoft": settings.MICROSOFT_CLIENT_ID,
    }
    client_secret_map = {
        "google": settings.GOOGLE_CLIENT_SECRET,
        "github": settings.GITHUB_CLIENT_SECRET,
        "microsoft": settings.MICROSOFT_CLIENT_SECRET,
    }
    
    client_id = client_id_map.get(provider)
    client_secret = client_secret_map.get(provider)
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail=f"{provider} OAuth not configured")
    
    token_url_map = {
        "google": "https://oauth2.googleapis.com/token",
        "github": "https://github.com/login/oauth/access_token",
        "microsoft": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    }
    
    user_info_url_map = {
        "google": "https://www.googleapis.com/oauth2/v2/userinfo",
        "github": "https://api.github.com/user",
        "microsoft": "https://graph.microsoft.com/v1.0/me",
    }
    
    cb_url = get_oauth_redirect_uri(request, provider)
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            token_url_map[provider],
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": cb_url,
            },
            headers={"Accept": "application/json"},
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        
        user_response = await client.get(
            user_info_url_map[provider],
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_data = user_response.json()
        
        if provider == "google":
            provider_user_id = user_data["id"]
            email = user_data["email"]
            full_name = user_data.get("name")
            avatar_url = user_data.get("picture")
        elif provider == "github":
            provider_user_id = str(user_data["id"])
            email = user_data.get("email")
            if not email:
                emails_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                emails = emails_response.json()
                primary_email = next((e for e in emails if e["primary"]), None)
                email = primary_email["email"] if primary_email else None
            full_name = user_data.get("name") or user_data.get("login")
            avatar_url = user_data.get("avatar_url")
        else:
            provider_user_id = user_data["id"]
            email = user_data.get("mail") or user_data.get("userPrincipalName")
            full_name = user_data.get("displayName")
            avatar_url = None
        
        if not email:
            raise HTTPException(status_code=400, detail="Could not retrieve email from OAuth provider")
        
        existing_oauth = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id,
            )
        )
        oauth_account = existing_oauth.scalar_one_or_none()
        
        if oauth_account:
            user = await db.get(User, oauth_account.user_id)
            oauth_account.access_token = access_token
            oauth_account.refresh_token = refresh_token
            if expires_in:
                oauth_account.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        else:
            existing_user = await db.execute(select(User).where(User.email == email))
            user = existing_user.scalar_one_or_none()
            
            if not user:
                user = User(
                    email=email,
                    full_name=full_name,
                    avatar_url=avatar_url,
                    hashed_password=get_password_hash(secrets.token_urlsafe(32)),
                    is_verified=True,
                )
                db.add(user)
                await db.flush()
                
                from app.models import UserPreferences
                prefs = UserPreferences(user_id=user.id)
                db.add(prefs)
            
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=provider,
                provider_user_id=provider_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None,
            )
            db.add(oauth_account)
        
        user.last_login = datetime.now(timezone.utc)
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        if not user.full_name and full_name:
            user.full_name = full_name
        
        await db.commit()
        await db.refresh(user)
        
        access_token_jwt = create_access_token(data={"sub": str(user.id), "email": user.email})
        refresh_token_jwt = create_refresh_token(data={"sub": str(user.id), "email": user.email})
        
        rt = RefreshToken(
            user_id=user.id,
            token=refresh_token_jwt,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(rt)
        await db.commit()
        
        # Redirect back to frontend with tokens
        frontend_url = os.environ.get("FRONTEND_URL") or "https://chitralekh-frontend.onrender.com"
        redirect_target = f"{frontend_url}/login?token={access_token_jwt}&refresh={refresh_token_jwt}"
        res = RedirectResponse(url=redirect_target)
        res.set_cookie(
            key="refresh_token",
            value=refresh_token_jwt,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )
        return res


@router.get("/oauth/accounts", response_model=list[OAuthAccountResponse])
async def get_oauth_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OAuthAccount).where(OAuthAccount.user_id == current_user.id)
    )
    return result.scalars().all()


@router.delete("/oauth/accounts/{provider}")
async def unlink_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.user_id == current_user.id,
            OAuthAccount.provider == provider,
        )
    )
    oauth_account = result.scalar_one_or_none()
    
    if not oauth_account:
        raise HTTPException(status_code=404, detail="OAuth account not found")
    
    has_password = current_user.hashed_password and len(current_user.hashed_password) > 20
    other_accounts = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.user_id == current_user.id,
            OAuthAccount.provider != provider,
        )
    )
    other_count = len(other_accounts.scalars().all())
    
    if not has_password and other_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot unlink the only authentication method. Set a password first.",
        )
    
    await db.delete(oauth_account)
    await db.commit()
    return {"message": f"{provider} account unlinked successfully"}