from sqlalchemy.orm import Session

from ..models import AuditLog, User


def audit(db: Session, actor: User, action: str, target: str, detail: dict | None = None) -> None:
    db.add(AuditLog(actor_email=actor.email, action=action, target=target, detail=detail or {}))
