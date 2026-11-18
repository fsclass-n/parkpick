"""CCTV/샘플 영상 실시간 추론 파이프라인.

영상 프레임 → YOLO 탐지 + ByteTrack 추적 → 주차면 ROI 점유 판별 → (선택) 번호판 OCR → 백엔드 /api/ingest/occupancy 전송

사용 예)
  python ai/pipeline.py --source data/videos/b1_a.mp4 --camera CCTV-B1-A --roi data/roi/CCTV-B1-A.json --show
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ai.masking import blur_regions, person_head_box  # noqa: E402
from ai.occupancy import Detection, OccupancyJudge, coverage  # noqa: E402
from ai.plate_ocr import read_plate  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def send(api: str, token: str, camera: str, changes: dict[str, bool], plates: dict[str, tuple]) -> None:
    items = [{"space": code, "occupied": occ, "plate": plates.get(code, (None, 0))[0], "confidence": plates.get(code, (None, 0))[1]}
             for code, occ in changes.items()]
    try:
        res = httpx.post(f"{api}/api/ingest/occupancy", json={"camera": camera, "items": items},
                         headers={"X-Ingest-Token": token}, timeout=10)
        print(f"[ingest] {res.status_code} {res.text}")
    except httpx.HTTPError as exc:
        print(f"[ingest] 전송 실패: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="영상 파일 경로 또는 RTSP URL")
    parser.add_argument("--camera", required=True)
    parser.add_argument("--roi", required=True, help="주차면 ROI JSON (data/roi/*.json)")
    parser.add_argument("--model", default=os.getenv("AI_MODEL_PATH", "yolov8n.pt"))
    parser.add_argument("--conf", type=float, default=float(os.getenv("AI_CONF_THRESHOLD", "0.45")))
    parser.add_argument("--tracker", default=os.getenv("AI_TRACKER", "bytetrack.yaml"))
    parser.add_argument("--interval", type=float, default=2.0, help="백엔드 전송 최소 간격(초)")
    parser.add_argument("--ocr", action="store_true", help="번호판 OCR 수행 (easyocr 필요)")
    parser.add_argument("--show", action="store_true", help="결과 영상 표시 (번호판·얼굴 블러)")
    args = parser.parse_args()

    import cv2
    import numpy as np
    from ultralytics import YOLO

    rois = {r["space"]: r["polygon"] for r in json.loads(Path(args.roi).read_text(encoding="utf-8"))["spaces"]}
    judge, previous, last_sent = OccupancyJudge(rois), {}, 0.0
    api, token = os.getenv("AI_API_URL", "http://localhost:8000"), os.getenv("AI_INGEST_TOKEN", "")
    model = YOLO(args.model)

    for result in model.track(source=args.source, conf=args.conf, tracker=args.tracker, persist=True, stream=True, verbose=False):
        boxes = result.boxes
        ids = boxes.id.int().tolist() if boxes.id is not None else [None] * len(boxes)
        detections = [Detection(tuple(b), result.names[int(c)], float(p), t)
                      for b, c, p, t in zip(boxes.xyxy.tolist(), boxes.cls.tolist(), boxes.conf.tolist(), ids)]
        judge.frame(detections)
        changes = judge.changes(previous)
        if changes and time.time() - last_sent >= args.interval:
            plates = {}
            if args.ocr:
                for code, occupied in changes.items():
                    cars = [d for d in detections if d.cls == "car"]
                    car = max(cars, key=lambda d: coverage(d.box, rois[code]), default=None)
                    if occupied and car:
                        x1, y1, x2, y2 = map(int, car.box)
                        plates[code] = read_plate(result.orig_img[y1 + (y2 - y1) * 3 // 5:y2, x1:x2])
            send(api, token, args.camera, changes, plates)
            previous, last_sent = dict(judge.state), time.time()

        if args.show:
            frame = result.plot()
            blur_regions(frame, [person_head_box(d.box) for d in detections if d.cls == "person"])
            for code, polygon in rois.items():
                color = (0, 0, 255) if judge.state.get(code) else (0, 200, 0)
                cv2.polylines(frame, [np.array(polygon, dtype="int32")], True, color, 2)
            cv2.imshow("parkpick", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break


if __name__ == "__main__":
    main()
