from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .deps import bearer_token
from .security import decode_token

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
# 로그인/로그아웃은 세션 전환용이므로 테스트 관리자도 허용
ALLOWED_WRITE_PATHS = {"/api/auth/login", "/api/auth/test-login", "/api/auth/admin-key-login", "/api/auth/logout"}


class ReadOnlyGuardMiddleware(BaseHTTPMiddleware):
    """테스트 관리자(role=test_admin) 토큰의 모든 쓰기 요청을 403으로 일괄 차단하는 최종 방어선."""

    async def dispatch(self, request: Request, call_next):
        if request.method in WRITE_METHODS and request.url.path not in ALLOWED_WRITE_PATHS:
            payload = decode_token(bearer_token(request) or "")
            if payload and payload.get("role") == "test_admin":
                return JSONResponse(
                    status_code=403,
                    content={"detail": "테스트 관리자 계정은 읽기 전용입니다.", "code": "READ_ONLY"},
                )
        return await call_next(request)
