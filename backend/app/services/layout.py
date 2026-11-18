"""주차장 도면(주차면 좌표)과 유도 경로 계산. 프런트엔드 Mock(frontend/src/mock/layout.js)과 동일한 규칙을 사용합니다."""

FLOORS = ["B1", "B2"]
ZONES = ["A", "B", "C", "D"]
SPACES_PER_ZONE = 12
SPACE_W, SPACE_H = 50, 80
MAP_W, MAP_H = 960, 580
ENTRANCE = {"x": 40, "y": 160}
SPINE_X = 90
ZONE_Y = {"A": 40, "B": 200, "C": 300, "D": 460}
AISLE_Y = {"A": 160, "B": 160, "C": 420, "D": 420}
FLOOR_PENALTY = {"B1": 0, "B2": 300}


def space_kind(zone: str, idx: int) -> str:
    if zone == "A" and idx < 2:
        return "disabled"
    if zone == "D" and idx >= SPACES_PER_ZONE - 2:
        return "ev"
    if zone == "B" and idx == 0:
        return "reserved"
    return "normal"


def iter_layout():
    for floor in FLOORS:
        for zone in ZONES:
            for idx in range(SPACES_PER_ZONE):
                yield {
                    "floor": floor,
                    "zone": zone,
                    "code": f"{floor}-{zone}{idx + 1:02d}",
                    "kind": space_kind(zone, idx),
                    "x": 140 + idx * 60,
                    "y": ZONE_Y[zone],
                }


def route_to(space) -> dict:
    """입구 → 세로 통로 → 가로 통로 → 주차면 중심까지의 경로와 거리(px)."""
    cx, cy = space.x + SPACE_W // 2, space.y + SPACE_H // 2
    aisle_y = AISLE_Y[space.zone]
    points = [ENTRANCE, {"x": SPINE_X, "y": ENTRANCE["y"]}, {"x": SPINE_X, "y": aisle_y}, {"x": cx, "y": aisle_y}, {"x": cx, "y": cy}]
    distance = sum(abs(a["x"] - b["x"]) + abs(a["y"] - b["y"]) for a, b in zip(points, points[1:]))
    return {"points": points, "distance": distance + FLOOR_PENALTY.get(space.floor, 0)}
