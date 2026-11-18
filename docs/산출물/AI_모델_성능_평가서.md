# AI 모델 성능 평가서 (작성: 김모란)

> 현재 수치는 **화면·파이프라인 검증용 샘플 지표**입니다. AI Hub 데이터 학습(`ai/train.py`) 후 `ai/runs/metrics.json` 결과로 이 문서와 관리자 > 시스템 설정 > AI 모델 버전을 갱신합니다.

## 1. 데이터셋
| 항목 | 내용 |
|---|---|
| 출처 | AI Hub ‘주차 관련 이동체 인지 영상’ (실내외 주차장, 110만 장, 사람·번호판 비식별화) |
| 클래스 | car(차량·트럭·버스 통합), person, motorcycle(이륜차·자전거) |
| 변환 | `ai/convert_aihub_labels.py` → YOLO txt, train/val = 85:15 (seed 42) |

## 2. 모델 및 학습 설정
| 항목 | 값 |
|---|---|
| 모델 | Ultralytics YOLO (yolov8n.pt 사전학습 가중치에서 미세조정) |
| 입력 크기 / Epoch / Batch | 640 / 50 / 16 |
| 추적 | ByteTrack (`bytetrack.yaml`), `persist=True` |
| 점유 판별 | 주차면 ROI 커버리지 ≥ 0.35 또는 ROI 중심점 포함, 최근 5프레임 다수결 |
| 번호판 | 차량 박스 하단 40% 영역 EasyOCR(ko, en) → 정규식 `\d{2,3}[가-힣]\d{4}` |

## 3. 평가 지표 (샘플)
| 지표 | 값 | 비고 |
|---|---|---|
| mAP50 | 0.912 | 샘플 |
| mAP50-95 | 0.684 | 샘플 |
| Precision / Recall | 0.903 / 0.871 | 샘플 |
| 클래스별 AP50 | car 0.941 · person 0.872 · motorcycle 0.823 | 샘플 |
| 번호판 OCR 정확도 | 0.934 | 샘플 |

## 4. 검증 계획
- 주차면 점유 판별 정확도: 라벨링한 CCTV 구간에서 프레임별 점유 정답 대비 Accuracy / F1
- 지연 시간: 프레임 추론 + 전송까지 1초 이내 (CPU 기준 yolov8n)
- 단위 테스트: `ai/tests/test_ai.py` (ROI 판정, 평활화, OCR 정규화, 라벨 변환)
