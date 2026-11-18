"""주차면 ROI(다각형)와 차량 탐지 박스를 비교해 점유 여부를 판별합니다. (외부 의존성 없음)"""
from collections import defaultdict, deque
from dataclasses import dataclass, field

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle"}


def point_in_polygon(x: float, y: float, polygon: list[list[float]]) -> bool:
    inside, j = False, len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi:
            inside = not inside
        j = i
    return inside


def coverage(box: tuple[float, float, float, float], polygon: list[list[float]], step: int = 6) -> float:
    """주차면 다각형 내부 샘플 포인트 중 차량 박스에 포함되는 비율 (0~1)."""
    xs, ys = [p[0] for p in polygon], [p[1] for p in polygon]
    x1, y1, x2, y2 = box
    total = hit = 0
    for gx in range(int(min(xs)), int(max(xs)) + 1, step):
        for gy in range(int(min(ys)), int(max(ys)) + 1, step):
            if point_in_polygon(gx, gy, polygon):
                total += 1
                hit += x1 <= gx <= x2 and y1 <= gy <= y2
    return hit / total if total else 0.0


@dataclass
class Detection:
    box: tuple[float, float, float, float]  # x1, y1, x2, y2 (px)
    cls: str
    conf: float
    track_id: int | None = None


@dataclass
class OccupancyJudge:
    """프레임 단위 판별 결과를 최근 N프레임 다수결로 평활화해 깜빡임(오탐)을 줄입니다."""
    rois: dict[str, list[list[float]]]
    threshold: float = 0.35
    window: int = 5
    history: dict[str, deque] = field(default_factory=lambda: defaultdict(deque))
    state: dict[str, bool] = field(default_factory=dict)

    def frame(self, detections: list[Detection]) -> dict[str, bool]:
        vehicles = [d for d in detections if d.cls in VEHICLE_CLASSES]
        for code, polygon in self.rois.items():
            cx = sum(p[0] for p in polygon) / len(polygon)
            cy = sum(p[1] for p in polygon) / len(polygon)
            occupied = any(
                coverage(v.box, polygon) >= self.threshold or (v.box[0] <= cx <= v.box[2] and v.box[1] <= cy <= v.box[3])
                for v in vehicles
            )
            hist = self.history[code]
            hist.append(occupied)
            if len(hist) > self.window:
                hist.popleft()
            self.state[code] = sum(hist) * 2 > len(hist)
        return dict(self.state)

    def changes(self, previous: dict[str, bool]) -> dict[str, bool]:
        return {code: value for code, value in self.state.items() if previous.get(code) != value}
