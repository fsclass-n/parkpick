# parkpick — 주차 이동체 영상 데이터 기반 AI 주차관제 및 유도 시스템

> **과정 주제** AI 모델 및 K-AI 데이터 분석을 통한 기업 수요 반영 비즈니스 플랫폼 구축
> **세부 주제** 주차 관련 이동체 인지 영상 데이터를 통한 주차관제 및 유도 시스템

주차장 CCTV와 이동체 인지 영상 데이터(AI Hub '주차 관련 이동체 인지 영상' 등 K-AI 데이터셋)를 AI 객체 탐지·추적 모델로 분석해 차량·보행자를 실시간으로 인식하고 주차면 점유 현황을 판별합니다. 운전자는 빈 주차면까지 안내받고, 관리자는 관제 대시보드로 주차장 운영을 효율화합니다. 대형 상업시설, 오피스 빌딩, 공영주차장 운영사 등 기업 고객을 위한 **B2B 주차관제 솔루션**입니다.

## 🔗 주요 링크

| 구분 | URL | 비고 |
|---|---|---|
| GitHub Repository | https://github.com/fsclass-n/parkpick | 소스코드 관리 |
| GitHub Pages | https://fsclass-n.github.io/parkpick/ | 프로젝트 안내 페이지 (`docs/site`) |
| Frontend Demo | https://parkpick.netlify.app | Netlify · Mock 데이터 데모 |
| Frontend | https://parkpick.onrender.com | Render Static Site |
| Backend API | https://parkpick-api.onrender.com | Render Web Service · `/docs` Swagger |

## 👥 팀 구성

| 이름 | 역할 | 주요 담당 업무 |
|---|---|---|
| 홍기흥 (조장) | PM / 백엔드 & 인프라 | 총괄·일정, FastAPI·WebSocket, TiDB 설계, Docker·CI/CD, Render·Netlify 배포, 외부 API |
| 박미금 | 프런트엔드 & UI/UX | React·Tailwind v4 화면, 로그인·모바일 GNB, 주차면 맵·관제 대시보드 시각화 |
| 김모란 | AI 모델링 (CV) | K-AI 데이터 전처리·라벨 변환, YOLO 학습·평가, ByteTrack 추적, 번호판 OCR, 점유 판별 |
| 이오리 | 데이터 분석 & 문서화 | 점유율·회전율·혼잡도 분석, 공공데이터 API, Gemini 프롬프트, 산출물·진행일지·발표자료 |

## 🛠️ 기술 스택

- **Frontend**: React (Vite), Tailwind CSS v4, React Router, Recharts, FontAwesome, SVG/Canvas 시각화
- **Backend**: Python 3.11, FastAPI, WebSocket, SQLAlchemy, PyJWT, python-dotenv
- **Database**: TiDB Cloud (MySQL 호환) / 로컬 SQLite
- **AI / Data**: Ultralytics YOLO, ByteTrack, OpenCV, EasyOCR, NumPy, pandas
- **Generative AI**: Google Gemini API (운영 리포트 자동 생성)
- **Infra**: Render, Netlify, GitHub Actions, GitHub Pages, Docker Compose

## 📂 디렉터리 구조

```
parkpick/
├── backend/            # FastAPI API 서버 (app/, tests/, requirements.txt, Dockerfile)
├── frontend/           # React + Vite + Tailwind v4 (Dockerfile)
├── ai/                 # 탐지·추적·점유 판별·OCR·마스킹·라벨 변환·학습 스크립트 (requirements.txt)
├── data/               # 샘플 ROI·라벨 (대용량 원본은 Git 제외)
├── docs/               # md / 프로젝트_진행일지 / 산출물 / pdf / site(GitHub Pages)
├── .github/workflows/  # deploy.yml (CI + GitHub Pages)
├── render.yaml         # Render Blueprint (API + 프런트엔드)
├── netlify.toml        # Netlify 데모 배포 설정
└── docker-compose.yml  # 로컬 통합 실행
```

## 🚀 로컬 실행

```bash
# 0) 환경 변수
cp .env.example .env

# 1) 백엔드 (Python 3.11)
python -m venv .venv
.venv/Scripts/activate            # macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt      # AI 추론/학습: -r ai/requirements.txt
cd backend && uvicorn app.main:app --reload   # http://localhost:8000/docs

# 2) 프런트엔드
cd frontend && npm install && npm run dev      # http://localhost:5173
#    백엔드 없이 Mock 데모로 실행: VITE_USE_MOCK=true npm run dev

# 3) Docker 통합 실행
docker compose up --build
```

### 테스트 계정

| 구분 | 이메일 | 비밀번호 | 권한 |
|---|---|---|---|
| 일반 사용자 | user@parkpick.com | User1234! | 관제·유도·내 차 찾기·리포트 조회 (차량 12가3456) |
| 테스트 관리자 | testadmin@parkpick.com | Admin1234! | 관리자 화면 조회만 가능 (Read-Only, 번호판·이메일 마스킹) |
| 실제 관리자 | 로그인 페이지 > 관리자 보안 키 | `.env`의 `ADMIN_SECRET_KEY` | 전체 CRUD |

## ☁️ 자동 배포 (Deploy Hook 미사용)

`main` 브랜치에 push 하면 각 플랫폼의 **Git 연동**으로 자동 배포됩니다. `RENDER_API_DEPLOY_HOOK`, `RENDER_FRONTEND_DEPLOY_HOOK` 같은 Deploy Hook 시크릿은 사용하지 않습니다.

| 대상 | 방식 | 영역별 개별 배포 조건 |
|---|---|---|
| Render API / 프런트엔드 | `render.yaml` Blueprint, `autoDeployTrigger: checksPass` (GitHub Actions CI 통과 후 배포) | `rootDir: backend` / `rootDir: frontend`, `buildFilter` — `backend/**` / `frontend/**` |
| Netlify 데모 | `netlify.toml` Git 연동 | `ignore` — `frontend/`, `netlify.toml` 변경 시에만 빌드 |
| GitHub Pages | `.github/workflows/deploy.yml` | main push 시 `docs/site` 배포 |

**최초 1회 설정**
1. Render: Dashboard → **New → Blueprint** → 이 저장소 선택 → `sync: false` 환경 변수(ADMIN_SECRET_KEY, DATABASE_URL, GEMINI_API_KEY, OAuth 키 등) 입력
2. Netlify: **Add new site → Import from Git** → 이 저장소 선택 (설정은 `netlify.toml` 자동 적용), 사이트 이름 `parkpick`
3. GitHub: **Settings → Pages → Source: GitHub Actions**

## ✅ 테스트

```bash
cd backend && python -m pytest -q    # API·권한·읽기전용·WebSocket·통계
python -m pytest -q ai/tests         # 점유 판별·OCR 정규화·라벨 변환
cd frontend && npm run build
```

## 📄 문서

- [플랫폼 표준 아키텍처 및 UI/UX 가이드](docs/산출물/플랫폼_표준_아키텍처_UIUX_가이드.md)
- [요구사항 정의서](docs/산출물/요구사항_정의서.md) · [시스템 설계서](docs/산출물/시스템_설계서.md) · [화면 설계서](docs/산출물/화면_설계서.md)
- [AI 모델 성능 평가서](docs/산출물/AI_모델_성능_평가서.md) · [데이터 분석 보고서](docs/산출물/데이터_분석_보고서.md)
- [프로젝트 진행일지](docs/프로젝트_진행일지/진행일지.md) · [작업 기록](docs/md/)
