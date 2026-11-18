import random
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Camera, EntryLog, ModelConfig, ParkingEvent, ParkingLot, Space, User, utcnow
from .security import hash_password
from .services.layout import ENTRANCE, FLOORS, ZONES, iter_layout

TEST_USER = {"email": "user@parkpick.com", "password": "User1234!", "name": "테스트 사용자", "role": "user"}
TEST_ADMIN = {"email": "testadmin@parkpick.com", "password": "Admin1234!", "name": "테스트 관리자", "role": "test_admin"}
_HANGUL = "가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주하허호"


def random_plate(rng: random.Random) -> str:
    return f"{rng.randint(10, 399)}{rng.choice(_HANGUL)}{rng.randint(1000, 9999)}"


def _hourly_weight(hour: int) -> float:
    # 출근(8~9시), 점심(12~13시), 저녁(18~19시) 피크를 갖는 상업·오피스 복합시설 패턴
    return {8: 3.0, 9: 3.4, 10: 2.0, 11: 2.2, 12: 3.0, 13: 2.8, 14: 1.8, 15: 1.6, 16: 1.7, 17: 2.4, 18: 3.2, 19: 2.6, 20: 1.4}.get(hour, 0.4)


def seed(db: Session) -> None:
    rng = random.Random(42)
    _seed_users(db)
    if db.scalar(select(ParkingLot.id).limit(1)):
        db.commit()
        return

    db.add(ParkingLot(name="parkpick 스마트타워 주차장", address="서울특별시 강남구 테헤란로 123", floors=FLOORS, entrance=ENTRANCE))
    db.flush()
    now = utcnow()
    codes = [item["code"] for item in iter_layout()]
    plates = []
    for item in iter_layout():
        occupied = item["kind"] != "reserved" and rng.random() < 0.62
        plate = random_plate(rng) if occupied else None
        if plate:
            plates.append((plate, item["code"]))
        db.add(Space(lot_id=1, **item, status="occupied" if occupied else "empty", plate=plate,
                     occupied_since=now - timedelta(minutes=rng.randint(5, 600)) if occupied else None, updated_at=now))
    # 테스트 사용자의 차량을 B1-C05 에 주차된 상태로 고정 (내 차 찾기 데모)
    db.flush()
    demo = db.scalar(select(Space).where(Space.code == "B1-C05"))
    plates = [p for p in plates if p[1] != demo.code] + [("12가3456", demo.code)]
    demo.status, demo.plate, demo.occupied_since = "occupied", "12가3456", now - timedelta(minutes=95)

    for floor in FLOORS:
        for zone in ZONES:
            db.add(Camera(name=f"CCTV-{floor}-{zone}", floor=floor, zone=zone, stream_url=None,
                          roi=[{"space": f"{floor}-{zone}{i:02d}"} for i in range(1, 13)]))

    for day in range(7, 0, -1):
        base = (now - timedelta(days=day)).replace(minute=0, second=0, microsecond=0)
        for hour in range(24):
            for _ in range(int(_hourly_weight(hour) * rng.uniform(4, 7))):
                entered = base.replace(hour=hour) + timedelta(minutes=rng.randint(0, 59))
                db.add(EntryLog(plate=random_plate(rng), space_code=rng.choice(codes),
                                entered_at=entered, exited_at=entered + timedelta(minutes=rng.randint(20, 300)),
                                plate_confidence=round(rng.uniform(0.82, 0.99), 3)))
    for plate, code in plates:
        db.add(EntryLog(plate=plate, space_code=code, entered_at=now - timedelta(minutes=rng.randint(5, 600)),
                        plate_confidence=round(rng.uniform(0.85, 0.99), 3)))

    samples = [
        ("long_parking", "high", "B1-A07", "장기 주차 의심 차량 (24시간 이상 점유)"),
        ("illegal_parking", "medium", "B1-A01", "장애인 전용 구역 일반 차량 주차"),
        ("wrong_way", "high", None, "B2 가로 통로 역주행 이동체 감지"),
        ("illegal_parking", "low", "B2-D12", "전기차 충전 구역 충전 미실시 차량"),
        ("long_parking", "medium", "B2-C03", "장기 주차 의심 차량 (12시간 이상 점유)"),
    ]
    for i, (kind, severity, code, message) in enumerate(samples):
        db.add(ParkingEvent(kind=kind, severity=severity, space_code=code, plate=random_plate(rng),
                            camera=f"CCTV-{(code or 'B2-C')[:2]}-{(code or 'B2-C')[3]}", message=message,
                            status="resolved" if i == 4 else "open", created_at=now - timedelta(minutes=15 * (i + 1))))

    # 샘플 지표: 실제 학습 후 ai/train.py 결과(ai/runs/metrics.json)로 갱신
    db.add(ModelConfig(version="yolo-parkpick-v0.1 (sample)", conf_threshold=0.45, active=True,
                       metrics={"mAP50": 0.912, "mAP50_95": 0.684, "precision": 0.903, "recall": 0.871,
                                "plate_accuracy": 0.934, "classes": {"car": 0.941, "person": 0.872, "motorcycle": 0.823},
                                "note": "샘플 지표 - 모델 학습 후 갱신 예정"}))
    db.commit()


def _seed_users(db: Session) -> None:
    accounts = [TEST_USER, TEST_ADMIN,
                {"email": "park.mg@parkpick.com", "password": "Member1234!", "name": "박미금", "role": "user"},
                {"email": "kim.mr@parkpick.com", "password": "Member1234!", "name": "김모란", "role": "user"},
                {"email": "lee.or@parkpick.com", "password": "Member1234!", "name": "이오리", "role": "user"}]
    if settings.admin_email and settings.admin_password:
        accounts.append({"email": settings.admin_email, "password": settings.admin_password, "name": "관리자", "role": "admin"})
    for acc in accounts:
        if not db.scalar(select(User.id).where(User.email == acc["email"])):
            db.add(User(email=acc["email"], name=acc["name"], role=acc["role"], password_hash=hash_password(acc["password"]),
                        plate="12가3456" if acc is TEST_USER else None))
    db.flush()
