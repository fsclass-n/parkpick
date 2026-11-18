import asyncio
import json
import logging
import random
from datetime import timedelta

from fastapi import WebSocket
from sqlalchemy import select

from .config import settings
from .database import SessionLocal
from .models import EntryLog, ParkingEvent, Space, utcnow
from .seed import random_plate
from .services.masking import mask_plate

log = logging.getLogger("parkpick.realtime")


def space_payload(space: Space) -> dict:
    """WebSocket 브로드캐스트용 주차면 정보 (개인정보 보호를 위해 번호판 미포함)."""
    return {"code": space.code, "floor": space.floor, "zone": space.zone, "kind": space.kind,
            "status": space.status, "updated_at": space.updated_at.isoformat()}


def event_payload(event: ParkingEvent) -> dict:
    return {"id": event.id, "kind": event.kind, "severity": event.severity, "space_code": event.space_code,
            "plate": mask_plate(event.plate), "camera": event.camera, "message": event.message,
            "status": event.status, "created_at": event.created_at.isoformat()}


class ConnectionManager:
    def __init__(self) -> None:
        self.clients: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.clients.discard(ws)

    async def broadcast(self, message: dict) -> None:
        data = json.dumps(message, ensure_ascii=False)
        for ws in list(self.clients):
            try:
                await ws.send_text(data)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


def apply_occupancy(db, space: Space, occupied: bool, plate: str | None = None, confidence: float = 0.0) -> bool:
    """주차면 점유 상태 반영 + 입출차 로그 기록. 상태가 바뀌면 True."""
    if (space.status == "occupied") == occupied:
        return False
    now = utcnow()
    if occupied:
        space.status, space.plate, space.occupied_since = "occupied", plate, now
        db.add(EntryLog(plate=plate or "미인식", space_code=space.code, entered_at=now, plate_confidence=confidence))
    else:
        entry = db.scalar(select(EntryLog).where(EntryLog.space_code == space.code, EntryLog.exited_at.is_(None))
                          .order_by(EntryLog.entered_at.desc()))
        if entry:
            entry.exited_at = now
        space.status, space.plate, space.occupied_since = "empty", None, None
    space.updated_at = now
    return True


async def run_simulator() -> None:
    """영상 추론 파이프라인(ai/) 연동 전, 실시간 입출차를 모사하는 데모용 시뮬레이터."""
    rng = random.Random()
    while True:
        await asyncio.sleep(settings.simulator_interval_sec)
        try:
            with SessionLocal() as db:
                spaces = db.scalars(select(Space).where(Space.kind != "reserved", Space.code != "B1-C05")).all()
                if not spaces:
                    continue
                messages = []
                for space in rng.sample(spaces, k=min(2, len(spaces))):
                    occupied = space.status == "empty"
                    if apply_occupancy(db, space, occupied, random_plate(rng) if occupied else None, round(rng.uniform(0.8, 0.99), 3)):
                        messages.append({"type": "space_update", "space": space_payload(space)})
                event = None
                if rng.random() < 0.08:
                    target = rng.choice(spaces)
                    kind, severity, message = rng.choice([
                        ("long_parking", "medium", "장기 주차 의심 차량 감지"),
                        ("illegal_parking", "medium", "주차선 침범 / 통로 불법 주차 감지"),
                        ("wrong_way", "high", "통로 역주행 이동체 감지"),
                    ])
                    event = ParkingEvent(kind=kind, severity=severity, space_code=target.code, plate=random_plate(rng),
                                         camera=f"CCTV-{target.floor}-{target.zone}", message=message)
                    db.add(event)
                    # 오래된 이벤트 자동 정리 (데모 DB 비대화 방지)
                    cutoff = utcnow() - timedelta(days=3)
                    for old in db.scalars(select(ParkingEvent).where(ParkingEvent.created_at < cutoff)).all():
                        db.delete(old)
                db.commit()
                if event:
                    messages.append({"type": "event", "event": event_payload(event)})
            for message in messages:
                await manager.broadcast(message)
        except Exception:  # 시뮬레이터 오류가 서버 전체를 중단시키지 않도록 격리
            log.exception("simulator tick failed")
