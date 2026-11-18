from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin_write
from ..models import Report, User, utcnow
from ..schemas import ReportIn
from ..services.audit import audit
from ..services.report import generate_report
from ..services.stats import dashboard, occupancy_summary, traffic_stats

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _report(r: Report) -> dict:
    return {"id": r.id, "period": r.period, "title": r.title, "content": r.content, "source": r.source, "created_at": r.created_at}


@router.get("/stats")
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"occupancy": occupancy_summary(db), "traffic": traffic_stats(db)}


@router.get("")
def list_reports(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_report(r) for r in db.scalars(select(Report).order_by(Report.created_at.desc()).limit(50)).all()]


@router.post("/generate", status_code=201)
def create_report(body: ReportIn, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    content, source = generate_report(body.period, dashboard(db))
    label = "일간" if body.period == "daily" else "주간"
    report = Report(period=body.period, title=f"{utcnow():%Y-%m-%d} {label} 운영 리포트", content=content, source=source)
    db.add(report)
    audit(db, actor, "report.create", report.title, {"source": source})
    db.commit()
    return _report(report)


@router.delete("/{report_id}", status_code=204)
def delete_report(report_id: int, actor: User = Depends(require_admin_write), db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "리포트를 찾을 수 없습니다.")
    audit(db, actor, "report.delete", report.title)
    db.delete(report)
    db.commit()
