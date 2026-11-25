# AGENTS.md — parkpick 작업 가이드

## 명령어
- 가상환경: `py -3.11 -m venv .venv` → `.venv/Scripts/python -m pip install -r backend/requirements.txt`
  - Windows pip 24 는 requirements.txt 를 cp949 로 읽으므로 첫 줄 `# -*- coding: utf-8 -*-` 를 유지할 것
  - AI 학습/추론 패키지는 별도 설치: `.venv/Scripts/python -m pip install -r ai/requirements.txt`
- 백엔드 실행: `cd backend && ../.venv/Scripts/python -m uvicorn app.main:app --reload`
- 백엔드 테스트: `cd backend && ../.venv/Scripts/python -m pytest -q`
- AI 테스트: `.venv/Scripts/python -m pytest -q ai/tests`
- 프런트엔드: `cd frontend && npm run dev` / `npm run build` (Mock 데모: `VITE_USE_MOCK=true`)
- 새 npm 패키지는 `npm install --before=<7일 전 날짜>` 로 설치

## 규칙
- `backend/`, `frontend/` 는 각각 자기완비 디렉터리 — `requirements.txt`·`Dockerfile`·`.dockerignore` 는 해당 디렉터리 안에 둠 (배포 컨텍스트 = 각 디렉터리)
- 환경 변수는 루트 `.env` 하나 (Vite `envDir: '..'`), 새 키는 `.env.example` 에 구분 태그와 함께 추가
- 백엔드 라우트·권한 규칙 변경 시 `frontend/src/mock/server.js`(Netlify 데모 Mock)도 함께 수정
- 주차장 도면 좌표 규칙은 `backend/app/services/layout.py` 와 `frontend/src/mock/layout.js` 를 동일하게 유지
- 테스트 관리자(`test_admin`) 쓰기 차단은 `backend/app/middleware.py` 가 최종 방어선
- useEffect 콜백은 값을 반환하지 않도록 블록 `{}` 으로 작성 (최신 Chromium 의 `window.scrollTo` 는 Promise 반환)
- 배포는 Render Blueprint / Netlify Git 연동 (Deploy Hook 미사용)
