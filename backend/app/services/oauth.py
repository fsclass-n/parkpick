"""Google / Naver / Kakao OAuth 2.0 Authorization Code 흐름."""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt

from ..config import settings

PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "profile": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "naver": {
        "authorize": "https://nid.naver.com/oauth2.0/authorize",
        "token": "https://nid.naver.com/oauth2.0/token",
        "profile": "https://openapi.naver.com/v1/nid/me",
        "scope": "",
    },
    "kakao": {
        "authorize": "https://kauth.kakao.com/oauth/authorize",
        "token": "https://kauth.kakao.com/oauth/token",
        "profile": "https://kapi.kakao.com/v2/user/me",
        "scope": "profile_nickname account_email",
    },
}


def is_configured(provider: str) -> bool:
    return bool(settings.oauth.get(provider, {}).get("client_id"))


def redirect_uri(provider: str) -> str:
    return f"{settings.backend_url}/api/auth/oauth/{provider}/callback"


def make_state(provider: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=10)
    return jwt.encode({"p": provider, "exp": exp}, settings.jwt_secret_key, algorithm="HS256")


def check_state(provider: str, state: str) -> bool:
    try:
        return jwt.decode(state, settings.jwt_secret_key, algorithms=["HS256"]).get("p") == provider
    except jwt.PyJWTError:
        return False


def authorize_url(provider: str) -> str:
    conf = PROVIDERS[provider]
    params = {"client_id": settings.oauth[provider]["client_id"], "redirect_uri": redirect_uri(provider),
              "response_type": "code", "state": make_state(provider)}
    if conf["scope"]:
        params["scope"] = conf["scope"]
    return f"{conf['authorize']}?{urlencode(params)}"


def fetch_profile(provider: str, code: str, state: str) -> dict:
    """code → access token → 사용자 프로필 {email, name}"""
    conf, cred = PROVIDERS[provider], settings.oauth[provider]
    token_resp = httpx.post(conf["token"], data={
        "grant_type": "authorization_code", "code": code, "state": state, "redirect_uri": redirect_uri(provider),
        "client_id": cred["client_id"], "client_secret": cred["client_secret"],
    }, headers={"Accept": "application/json"}, timeout=15)
    token_resp.raise_for_status()
    access_token = token_resp.json()["access_token"]
    data = httpx.get(conf["profile"], headers={"Authorization": f"Bearer {access_token}"}, timeout=15).json()
    if provider == "google":
        return {"email": data["email"], "name": data.get("name") or data["email"].split("@")[0]}
    if provider == "naver":
        res = data["response"]
        return {"email": res.get("email") or f"naver_{res['id']}@naver.local", "name": res.get("name") or res.get("nickname") or "네이버 사용자"}
    account = data.get("kakao_account", {})
    return {"email": account.get("email") or f"kakao_{data['id']}@kakao.local",
            "name": account.get("profile", {}).get("nickname") or data.get("properties", {}).get("nickname") or "카카오 사용자"}
