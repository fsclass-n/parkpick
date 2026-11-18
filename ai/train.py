"""YOLO 이동체 탐지 모델 학습·평가 → ai/runs/metrics.json 저장 (AI 모델 성능 평가서 근거 자료).

사용 예)
  pip install ultralytics==8.3.120
  python ai/train.py --model yolov8n.pt --epochs 50 --imgsz 640
"""
import argparse
import json
from pathlib import Path

AI_DIR = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="yolov8n.pt")
    parser.add_argument("--data", default=str(AI_DIR / "dataset.yaml"))
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--name", default="parkpick-yolo")
    args = parser.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.model)
    model.train(data=args.data, epochs=args.epochs, imgsz=args.imgsz, batch=args.batch,
                project=str(AI_DIR / "runs"), name=args.name, exist_ok=True)
    result = model.val(data=args.data, imgsz=args.imgsz)
    metrics = {
        "version": args.name,
        "mAP50": round(float(result.box.map50), 4),
        "mAP50_95": round(float(result.box.map), 4),
        "precision": round(float(result.box.mp), 4),
        "recall": round(float(result.box.mr), 4),
        "classes": {model.names[i]: round(float(v), 4) for i, v in enumerate(result.box.maps)},
    }
    out = AI_DIR / "runs" / "metrics.json"
    out.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    print(f"저장: {out}  (관리자 > AI 모델 메뉴에서 신규 버전으로 등록)")


if __name__ == "__main__":
    main()
