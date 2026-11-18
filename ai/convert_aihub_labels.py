"""AI Hub(K-AI) 라벨링 JSON → YOLO 학습 포맷(txt) 변환기.

AI Hub '주차 관련 이동체 인지 영상' 등은 데이터셋·버전마다 JSON 키가 조금씩 다릅니다.
반드시 데이터 설명서의 어노테이션 포맷을 확인한 뒤 --*-key 옵션으로 키 이름을 맞춰 사용하세요.

지원 형식
  1) COCO 형식: {"images": [...], "annotations": [...], "categories": [...]}
  2) 이미지별 JSON: {"<image-key>": {...width/height...}, "<ann-key>": [{"<label-key>": "car", "bbox": [x, y, w, h]} 또는 "points": [[x, y], ...]]}

사용 예)
  python ai/convert_aihub_labels.py --src data/raw/labels --images data/raw/images --out data/datasets/parkpick
"""
import argparse
import json
import random
import shutil
from pathlib import Path

# AI Hub 클래스명(한/영) → parkpick 학습 클래스
CLASS_MAP = {
    "car": "car", "vehicle": "car", "차량": "car", "승용차": "car", "suv": "car", "truck": "car", "bus": "car", "트럭": "car",
    "person": "person", "pedestrian": "person", "사람": "person", "보행자": "person",
    "motorcycle": "motorcycle", "bike": "motorcycle", "bicycle": "motorcycle", "이륜차": "motorcycle", "자전거": "motorcycle",
}
CLASSES = ["car", "person", "motorcycle"]


def to_yolo(box: list[float], width: float, height: float) -> tuple[float, float, float, float]:
    x, y, w, h = box
    return (x + w / 2) / width, (y + h / 2) / height, w / width, h / height


def points_to_box(points: list[list[float]]) -> list[float]:
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    return [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]


def _class_id(label: str) -> int | None:
    name = CLASS_MAP.get(str(label).strip().lower())
    return CLASSES.index(name) if name else None


def _lines(annotations, width, height, label_key) -> list[str]:
    lines = []
    for ann in annotations:
        cls = _class_id(ann.get(label_key, ""))
        box = ann.get("bbox") or (points_to_box(ann["points"]) if ann.get("points") else None)
        if cls is None or not box or width <= 0 or height <= 0:
            continue
        cx, cy, w, h = to_yolo(box, width, height)
        if w > 0 and h > 0:
            lines.append(f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
    return lines


def parse_file(path: Path, args) -> dict[str, list[str]]:
    """{이미지 파일명: [YOLO 라벨 라인]}"""
    data = json.loads(path.read_text(encoding="utf-8"))
    if "images" in data and "annotations" in data:  # COCO
        cats = {c["id"]: c["name"] for c in data.get("categories", [])}
        result = {}
        for img in data["images"]:
            anns = [a | {args.label_key: cats.get(a.get("category_id"), a.get(args.label_key, ""))}
                    for a in data["annotations"] if a["image_id"] == img["id"]]
            result[img["file_name"]] = _lines(anns, img["width"], img["height"], args.label_key)
        return result
    image = data.get(args.image_key, {})
    name = image.get("file_name") or image.get("filename") or f"{path.stem}.jpg"
    return {name: _lines(data.get(args.ann_key, []), image.get("width", 0), image.get("height", 0), args.label_key)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", required=True, help="라벨링 JSON 폴더")
    parser.add_argument("--images", required=True, help="원천 이미지 폴더")
    parser.add_argument("--out", default="data/datasets/parkpick")
    parser.add_argument("--image-key", default="image")
    parser.add_argument("--ann-key", default="annotations")
    parser.add_argument("--label-key", default="label")
    parser.add_argument("--val-ratio", type=float, default=0.15)
    args = parser.parse_args()

    labels: dict[str, list[str]] = {}
    for path in sorted(Path(args.src).rglob("*.json")):
        labels.update(parse_file(path, args))
    names = sorted(n for n, lines in labels.items() if lines)
    random.Random(42).shuffle(names)
    n_val = int(len(names) * args.val_ratio)
    out = Path(args.out)
    for split, subset in (("val", names[:n_val]), ("train", names[n_val:])):
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)
        for name in subset:
            src = next(Path(args.images).rglob(Path(name).name), None)
            if src:
                shutil.copy2(src, out / "images" / split / src.name)
                (out / "labels" / split / f"{src.stem}.txt").write_text("\n".join(labels[name]), encoding="utf-8")
    print(f"변환 완료: train {len(names) - n_val}장 / val {n_val}장 → {out}")


if __name__ == "__main__":
    main()
