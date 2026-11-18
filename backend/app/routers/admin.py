from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin_view, require_admin_write
from ..models import AuditLog, Camera, ModelConfig, ParkingEvent, Space, User
from ..realtime import apply_occupancy, event_payload, manager, space_payload
from ..schemas import CameraIn, EventUpdateIn, ModelConfigIn, RoleUpdateIn, SpaceUpdateIn, UserOut
from ..services.audit import audit
from ..services.masking import mask_email, mask_plate
from ..services.stats import dashboard

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _masked(viewer: User) -> bool:
    return viewer.role == "test_admin"


# ---------- 회원 관리 ----------
@router.get("/users")
def users(viewer: User = Depends(require_admin_view), db: Session = Depends(get_db)):
    rows = [UserOut.model_validate(u).model_dump() for u in db.scalars(select(User).order_by(User.id)).all()]
    if _masked(viewer):
        for row in rows:
            row["email"], row["plate"] = mask_email(row["email"]), mask_plate(row["plate"])
    return rows


@router.patch("/users/{user_id}/role", response_model=UserOut)
def change_role(user_id: int, body: RoleUpdateIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    if target.role == "test_admin":
        raise HTTPException(400, "테스트 관리자 계정의 권한은 변경할 수 없습니다.")
    if target.id == actor.id and body.role != "admin":
        raise HTTPException(400, "본인의 관리자 권한은 해제할 수 없습니다.")
    audit(db, actor, "user.role_change", target.email, {"from": target.role, "to": body.role})
    target.role = body.role
    db.commit()
    return target


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    if target.id == actor.id or target.role == "test_admin":
        raise HTTPException(400, "본인 또는 테스트 관리자 계정은 삭제할 수 없습니다.")
    audit(db, actor, "user.delete", target.email)
    db.delete(target)
    db.commit()


# ---------- 모니터링 대시보드 ----------
@router.get("/dashboard")
def admin_dashboard(viewer: User = Depends(require_admin_view), db: Session = Depends(get_db)):
    return dashboard(db)


# ---------- 이벤트 관제 ----------
@router.get("/events")
def events(status: str | None = None, viewer: User = Depends(require_admin_view), db: Session = Depends(get_db)):
    query = select(ParkingEvent).order_by(ParkingEvent.created_at.desc()).limit(200)
    rows = db.scalars(query.where(ParkingEvent.status == status) if status else query).all()
    return [event_payload(e) | ({} if _masked(viewer) else {"plate": e.plate}) for e in rows]


@router.patch("/events/{event_id}")
async def update_event(event_id: int, body: EventUpdateIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    event = db.get(ParkingEvent, event_id)
    if not event:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    audit(db, actor, "event.status", f"event#{event.id}", {"from": event.status, "to": body.status})
    event.status = body.status
    db.commit()
    await manager.broadcast({"type": "event_update", "event": event_payload(event)})
    return event_payload(event) | {"plate": event.plate}


# ---------- 주차면 관리 ----------
@router.patch("/spaces/{code}")
async def update_space(code: str, body: SpaceUpdateIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    space = db.scalar(select(Space).where(Space.code == code))
    if not space:
        raise HTTPException(404, "주차면을 찾을 수 없습니다.")
    audit(db, actor, "space.update", code, body.model_dump(exclude_unset=True))
    if body.kind:
        space.kind = body.kind
    if body.status:
        apply_occupancy(db, space, body.status == "occupied")
    db.commit()
    await manager.broadcast({"type": "space_update", "space": space_payload(space)})
    return space_payload(space)


# ---------- CCTV 카메라 / ROI ----------
def _camera(c: Camera) -> dict:
    return {"id": c.id, "name": c.name, "floor": c.floor, "zone": c.zone, "stream_url": c.stream_url, "roi": c.roi, "active": c.active}


@router.get("/cameras")
def cameras(viewer: User = Depends(require_admin_view), db: Session = Depends(get_db)):
    return [_camera(c) for c in db.scalars(select(Camera).order_by(Camera.id)).all()]


@router.post("/cameras", status_code=201)
def create_camera(body: CameraIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    camera = Camera(**body.model_dump())
    db.add(camera)
    audit(db, actor, "camera.create", body.name)
    db.commit()
    return _camera(camera)


@router.put("/cameras/{camera_id}")
def update_camera(camera_id: int, body: CameraIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    camera = db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(404, "카메라를 찾을 수 없습니다.")
    for key, value in body.model_dump().items():
        setattr(camera, key, value)
    audit(db, actor, "camera.update", camera.name)
    db.commit()
    return _camera(camera)


@router.delete("/cameras/{camera_id}", status_code=204)
def delete_camera(camera_id: int, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    camera = db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(404, "카메라를 찾을 수 없습니다.")
    audit(db, actor, "camera.delete", camera.name)
    db.delete(camera)
    db.commit()


# ---------- AI 모델 버전 / 임계값 ----------
def _model(m: ModelConfig) -> dict:
    return {"id": m.id, "version": m.version, "conf_threshold": m.conf_threshold, "metrics": m.metrics, "active": m.active,
            "created_at": m.created_at}


@router.get("/models")
def models(viewer: User = Depends(require_admin_view), db: Session = Depends(get_db)):
    return [_model(m) for m in db.scalars(select(ModelConfig).order_by(ModelConfig.id.desc())).all()]


@router.post("/models", status_code=201)
def create_model(body: ModelConfigIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    model = ModelConfig(**body.model_dump(), active=False)
    db.add(model)
    audit(db, actor, "model.create", body.version)
    db.commit()
    return _model(model)


@router.patch("/models/{model_id}/activate")
def activate_model(model_id: int, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    model = db.get(ModelConfig, model_id)
    if not model:
        raise HTTPException(404, "모델을 찾을 수 없습니다.")
    for other in db.scalars(select(ModelConfig)).all():
        other.active = other.id == model_id
    audit(db, actor, "model.activate", model.version)
    db.commit()
    return _model(model)


# ---------- 감사 로그 ----------
@router.get("/audit-logs")
def audit_logs(viewer: User = Depends(require_admin_view), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)).all()
    return [{"id": a.id, "actor": mask_email(a.actor_email) if _masked(viewer) else a.actor_email, "action": a.action,
             "target": mask_email(a.target) if _masked(viewer) and "@" in a.target else a.target, "detail": a.detail, "created_at": a.created_at} for a in rows]
