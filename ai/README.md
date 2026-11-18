# ai/ — 이동체 탐지·추적 및 주차면 점유 판별 (담당: 김모란)

| 파일 | 설명 |
|---|---|
| `convert_aihub_labels.py` | AI Hub(K-AI) 라벨링 JSON → YOLO txt 변환 (COCO / 이미지별 JSON 지원, 키 이름 옵션) |
| `dataset.yaml` | YOLO 학습 데이터셋 설정 (car / person / motorcycle) |
| `train.py` | YOLO 학습·평가 → `ai/runs/metrics.json` (mAP50, mAP50-95, Precision, Recall, 클래스별 AP) |
| `occupancy.py` | 주차면 ROI 다각형 ↔ 차량 박스 커버리지 기반 점유 판별 + N프레임 다수결 평활화 |
| `plate_ocr.py` | EasyOCR 번호판 인식 + 한국 번호판 형식 정규화 |
| `masking.py` | 번호판·얼굴 영역 블러 (개인정보 보호) |
| `pipeline.py` | 영상 → YOLO + ByteTrack → 점유 판별 → OCR → 백엔드 `/api/ingest/occupancy` 전송 |

## 실행 순서
```bash
pip install ultralytics==8.3.120 easyocr==1.7.2 opencv-python-headless==4.11.0.86   # 로컬 전용(대용량)
python ai/convert_aihub_labels.py --src data/raw/labels --images data/raw/images --out data/datasets/parkpick
python ai/train.py --model yolov8n.pt --epochs 50
python ai/pipeline.py --source data/videos/b1_a.mp4 --camera CCTV-B1-A --roi data/roi/CCTV-B1-A.json --ocr --show
```
- `pipeline.py` 는 `.env` 의 `AI_API_URL`, `AI_INGEST_TOKEN` 을 사용합니다. (백엔드 `AI_INGEST_TOKEN` 과 동일 값)
- AI Hub 데이터셋마다 JSON 키가 다르므로 데이터 설명서를 확인한 뒤 `--image-key / --ann-key / --label-key` 를 맞춥니다.
- 테스트: `python -m pytest -q ai/tests`
