from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_token

ADMIN_VIEW_ROLES = {"admin", "test_admin"}


def bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    return header[7:] if header.lower().startswith("bearer ") else None


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    payload = decode_token(bearer_token(request) or "")
    return db.get(User, int(payload["sub"])) if payload else None


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "로그인이 필요합니다.")
    return user


def require_admin_view(user: User = Depends(get_current_user)) -> User:
    if user.role not in ADMIN_VIEW_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "관리자 권한이 필요합니다.")
    return user


def require_admin_write(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "테스트 관리자 계정은 읽기 전용입니다.")
    return user


def is_masked(user: User | None) -> bool:
    return user is None or user.role == "test_admin"
