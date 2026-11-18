"""AI 영상 추론 파이프라인(ai/pipeline.py)이 주차면 점유 판별 결과를 전송하는 엔드포인트."""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Space
from ..realtime import apply_occupancy, manager, space_payload
from ..schemas import IngestIn
from ..security import safe_compare

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/occupancy")
async def ingest_occupancy(body: IngestIn, x_ingest_token: str = Header(default=""), db: Session = Depends(get_db)):
    if not safe_compare(x_ingest_token, settings.ai_ingest_token):
        raise HTTPException(401, "유효하지 않은 수집 토큰입니다.")
    codes = [item.space for item in body.items]
    spaces = {s.code: s for s in db.scalars(select(Space).where(Space.code.in_(codes))).all()}
    changed = [spaces[i.space] for i in body.items
               if i.space in spaces and apply_occupancy(db, spaces[i.space], i.occupied, i.plate, i.confidence)]
    db.commit()
    for space in changed:
        await manager.broadcast({"type": "space_update", "space": space_payload(space)})
    return {"received": len(body.items), "changed": len(changed)}
