from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_optional_user
from ..models import Camera, ParkingEvent, ParkingLot, Space, User
from ..realtime import event_payload
from ..schemas import SpaceOut
from ..services.layout import MAP_H, MAP_W, SPACE_H, SPACE_W, route_to
from ..services.masking import mask_plate
from ..services.stats import occupancy_summary

router = APIRouter(prefix="/api/parking", tags=["parking"])


@router.get("/lot")
def lot(db: Session = Depends(get_db)):
    item = db.get(ParkingLot, 1)
    if not item:
        raise HTTPException(404, "주차장 정보가 없습니다.")
    return {"id": item.id, "name": item.name, "address": item.address, "floors": item.floors, "entrance": item.entrance,
            "map": {"width": MAP_W, "height": MAP_H, "space_w": SPACE_W, "space_h": SPACE_H}}


@router.get("/spaces", response_model=list[SpaceOut])
def spaces(floor: str | None = None, db: Session = Depends(get_db)):
    query = select(Space).order_by(Space.code)
    return db.scalars(query.where(Space.floor == floor) if floor else query).all()


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    return occupancy_summary(db)


@router.get("/guidance")
def guidance(floor: str | None = None, kind: str = Query("normal", pattern="^(normal|disabled|ev)$"),
             db: Session = Depends(get_db)):
    """가장 가까운 빈 주차면 추천 + 입구에서의 진입 경로."""
    query = select(Space).where(Space.status == "empty", Space.kind == kind)
    candidates = db.scalars(query.where(Space.floor == floor) if floor else query).all()
    fallback = not candidates and kind != "normal"
    if fallback:
        query = select(Space).where(Space.status == "empty", Space.kind == "normal")
        candidates = db.scalars(query.where(Space.floor == floor) if floor else query).all()
    if not candidates:
        return {"found": False, "message": "현재 이용 가능한 빈 주차면이 없습니다."}
    ranked = sorted(((route_to(s), s) for s in candidates), key=lambda r: r[0]["distance"])
    route, best = ranked[0]
    return {
        "found": True,
        "fallback": fallback,
        "space": SpaceOut.model_validate(best),
        "route": route["points"],
        "distance": route["distance"],
        "alternatives": [SpaceOut.model_validate(s).model_dump() | {"distance": r["distance"]} for r, s in ranked[1:4]],
    }


@router.get("/find-car")
def find_car(plate: str = Query(min_length=4, max_length=20), user: User | None = Depends(get_optional_user),
             db: Session = Depends(get_db)):
    space = db.scalar(select(Space).where(Space.plate == plate.replace(" ", "")))
    if not space:
        return {"found": False, "message": "입력한 차량 번호로 인식된 주차 위치가 없습니다."}
    return {
        "found": True,
        "plate": mask_plate(space.plate) if user and user.role == "test_admin" else space.plate,
        "space": SpaceOut.model_validate(space),
        "route": route_to(space)["points"],
        "parked_since": space.occupied_since,
    }


@router.get("/events/recent")
def recent_events(limit: int = Query(10, le=50), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(ParkingEvent).where(ParkingEvent.status == "open").order_by(ParkingEvent.created_at.desc()).limit(limit)
    return [event_payload(e) for e in db.scalars(query).all()]


@router.get("/cameras")
def cameras(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "floor": c.floor, "zone": c.zone, "active": c.active}
            for c in db.scalars(select(Camera).order_by(Camera.id)).all()]
