# data/ — 데이터셋 및 분석 자료 (담당: 이오리)

| 경로 | 설명 | Git |
|---|---|---|
| `roi/` | CCTV별 주차면 ROI 다각형 좌표 (샘플: `CCTV-B1-A.json`) | 포함 |
| `samples/` | 변환기 검증용 가상 라벨 샘플 | 포함 |
| `raw/` | AI Hub 원천·라벨링 데이터 원본 | 제외 (.gitignore) |
| `datasets/` | YOLO 변환 결과 (images/labels, train/val) | 제외 |
| `videos/` | 추론용 CCTV/샘플 영상 | 제외 |

- 데이터 출처: AI Hub ‘주차 관련 이동체 인지 영상’(dataSetSn=192), 공공데이터포털 주차장 정보
- AI Hub 데이터는 내국인 신청 후 다운로드 가능하며, 원본 재배포는 금지되어 있으므로 저장소에 올리지 않습니다.
