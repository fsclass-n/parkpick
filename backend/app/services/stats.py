"""pandas·NumPy 기반 주차 운영 통계 (점유율, 회전율, 시간대별 입출차·혼잡도)."""
from datetime import timedelta

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import EntryLog, ModelConfig, ParkingEvent, Space, utcnow


def occupancy_summary(db: Session) -> dict:
    spaces = pd.DataFrame([{"floor": s.floor, "kind": s.kind, "occupied": s.status == "occupied"}
                           for s in db.scalars(select(Space)).all()])
    if spaces.empty:
        return {"total": 0, "occupied": 0, "empty": 0, "rate": 0.0, "by_floor": [], "by_kind": []}

    def group(col: str) -> list[dict]:
        g = spaces.groupby(col)["occupied"].agg(["count", "sum"]).reset_index()
        return [{col: r[col], "total": int(r["count"]), "occupied": int(r["sum"]), "empty": int(r["count"] - r["sum"]),
                 "rate": round(float(r["sum"] / r["count"]), 3)} for _, r in g.iterrows()]

    total, occupied = len(spaces), int(spaces["occupied"].sum())
    return {"total": total, "occupied": occupied, "empty": total - occupied, "rate": round(occupied / total, 3),
            "by_floor": group("floor"), "by_kind": group("kind")}


def _entry_frame(db: Session, days: int) -> pd.DataFrame:
    since = utcnow() - timedelta(days=days)
    rows = db.execute(select(EntryLog.entered_at, EntryLog.exited_at, EntryLog.plate_confidence)
                      .where(EntryLog.entered_at >= since)).all()
    return pd.DataFrame(rows, columns=["entered_at", "exited_at", "confidence"])


def traffic_stats(db: Session, days: int = 7) -> dict:
    df = _entry_frame(db, days)
    total_spaces = db.query(Space).count() or 1
    hours = list(range(24))
    if df.empty:
        empty = [{"hour": h, "entries": 0, "exits": 0, "congestion": 0.0} for h in hours]
        return {"hourly": empty, "daily": [], "avg_duration_min": 0, "turnover": 0.0, "plate_recognition_rate": 0.0}

    entries = df["entered_at"].dt.hour.value_counts().reindex(hours, fill_value=0) / days
    exits = df["exited_at"].dropna().dt.hour.value_counts().reindex(hours, fill_value=0) / days

    # 시간대별 혼잡도: 각 시각(정시)에 주차 중인 차량 수 / 전체 주차면 (기간 평균)
    end = utcnow().replace(minute=0, second=0, microsecond=0)
    grid = pd.date_range(end - timedelta(days=days), end, freq="h")
    entered = df["entered_at"].to_numpy(dtype="datetime64[ns]")
    exited = df["exited_at"].fillna(pd.Timestamp(end) + pd.Timedelta(days=1)).to_numpy(dtype="datetime64[ns]")
    ts = grid.to_numpy(dtype="datetime64[ns]")[:, None]
    present = ((entered[None, :] <= ts) & (exited[None, :] > ts)).sum(axis=1)
    congestion = pd.Series(np.clip(present / total_spaces, 0, 1), index=grid.hour).groupby(level=0).mean().reindex(hours, fill_value=0)

    daily = df.groupby(df["entered_at"].dt.date).size()
    done = df.dropna(subset=["exited_at"])
    duration = ((done["exited_at"] - done["entered_at"]).dt.total_seconds() / 60).mean() if not done.empty else 0
    return {
        "hourly": [{"hour": h, "entries": round(float(entries[h]), 1), "exits": round(float(exits[h]), 1),
                    "congestion": round(float(congestion[h]), 3)} for h in hours],
        "daily": [{"date": str(d), "entries": int(c), "turnover": round(c / total_spaces, 2)} for d, c in daily.items()],
        "avg_duration_min": round(float(duration), 1),
        "turnover": round(float(daily.mean() / total_spaces), 2),
        "plate_recognition_rate": round(float((df["confidence"] >= 0.85).mean()), 3),
    }


def ai_metrics(db: Session) -> dict:
    config = db.scalar(select(ModelConfig).where(ModelConfig.active.is_(True)).order_by(ModelConfig.id.desc()))
    return {"version": config.version, "conf_threshold": config.conf_threshold, **config.metrics} if config else {}


def dashboard(db: Session) -> dict:
    open_events = db.query(ParkingEvent).filter(ParkingEvent.status == "open").count()
    return {"occupancy": occupancy_summary(db), "traffic": traffic_stats(db), "ai": ai_metrics(db), "open_events": open_events}
