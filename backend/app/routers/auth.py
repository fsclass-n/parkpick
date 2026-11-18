from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import User, utcnow
from ..schemas import AdminKeyIn, LoginIn, ProfileUpdateIn, SignupIn, TestLoginIn, TokenOut, UserOut
from ..security import PASSWORD_RULE, create_access_token, hash_password, is_valid_password, safe_compare, verify_password
from ..seed import TEST_ADMIN, TEST_USER
from ..services import oauth

router = APIRouter(prefix="/api/auth", tags=["auth"])


def issue(db: Session, user: User) -> TokenOut:
    user.last_login_at = utcnow()
    db.commit()
    return TokenOut(access_token=create_access_token(user.id, user.email, user.role), user=UserOut.model_validate(user))


@router.get("/password-policy")
def password_policy():
    return {"pattern": r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$", "message": PASSWORD_RULE}


@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    if not is_valid_password(body.password):
        raise HTTPException(422, PASSWORD_RULE)
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "이미 가입된 이메일입니다.")
    user = User(email=email, name=body.name, plate=body.plate, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    return issue(db, user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")
    return issue(db, user)


@router.post("/test-login", response_model=TokenOut)
def test_login(body: TestLoginIn, db: Session = Depends(get_db)):
    account = TEST_USER if body.kind == "user" else TEST_ADMIN
    user = db.scalar(select(User).where(User.email == account["email"]))
    if not user:
        raise HTTPException(503, "테스트 계정이 준비되지 않았습니다.")
    return issue(db, user)


@router.post("/admin-key-login", response_model=TokenOut)
def admin_key_login(body: AdminKeyIn, db: Session = Depends(get_db)):
    """.env 의 ADMIN_SECRET_KEY 로 실제 관리자(전체 CRUD) 세션을 발급합니다."""
    if not settings.admin_secret_key:
        raise HTTPException(503, "서버에 ADMIN_SECRET_KEY 가 설정되지 않았습니다.")
    if not safe_compare(body.admin_key, settings.admin_secret_key):
        raise HTTPException(401, "관리자 보안 키가 올바르지 않습니다.")
    email = (settings.admin_email or "admin@parkpick.com").lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, name="관리자", role="admin")
        db.add(user)
        db.flush()
    user.role = "admin"
    return issue(db, user)


@router.post("/logout")
def logout():
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: ProfileUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    return user


@router.get("/oauth/providers")
def oauth_providers():
    return {p: oauth.is_configured(p) for p in oauth.PROVIDERS}


@router.get("/oauth/{provider}/login")
def oauth_login(provider: str):
    if provider not in oauth.PROVIDERS:
        raise HTTPException(404, "지원하지 않는 소셜 로그인입니다.")
    if not oauth.is_configured(provider):
        return RedirectResponse(f"{settings.frontend_url}/login?error=oauth_not_configured&provider={provider}")
    return RedirectResponse(oauth.authorize_url(provider))


@router.get("/oauth/{provider}/callback")
def oauth_callback(provider: str, code: str = "", state: str = "", db: Session = Depends(get_db)):
    fail = RedirectResponse(f"{settings.frontend_url}/login?error=oauth_failed&provider={provider}")
    if provider not in oauth.PROVIDERS or not code or not oauth.check_state(provider, state):
        return fail
    try:
        profile = oauth.fetch_profile(provider, code, state)
    except Exception:
        return fail
    email = profile["email"].lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, name=profile["name"], provider=provider)
        db.add(user)
        db.flush()
    token = issue(db, user).access_token
    return RedirectResponse(f"{settings.frontend_url}/oauth/callback#token={token}")
