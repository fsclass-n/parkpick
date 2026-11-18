import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .middleware import ReadOnlyGuardMiddleware
from .realtime import run_simulator
from .routers import admin, auth, ingest, parking, reports, ws
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    task = asyncio.create_task(run_simulator()) if settings.simulator_enabled else None
    yield
    if task:
        task.cancel()


app = FastAPI(title="parkpick API", version="0.1.0", description="AI 주차관제 및 유도 시스템 API", lifespan=lifespan)
app.add_middleware(ReadOnlyGuardMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

for module in (auth, parking, admin, reports, ingest, ws):
    app.include_router(module.router)


@app.get("/")
def root():
    return {"service": "parkpick-api", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health")
def health():
    return {"status": "ok", "env": settings.app_env}
