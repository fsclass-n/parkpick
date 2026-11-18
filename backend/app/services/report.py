"""Gemini API 기반 운영 리포트 생성. 키가 없거나 호출 실패 시 템플릿 리포트로 대체합니다."""
import json
import logging

import httpx

from ..config import settings

log = logging.getLogger("parkpick.report")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _summary(stats: dict) -> dict:
    occ, traffic = stats["occupancy"], stats["traffic"]
    hourly = traffic["hourly"]
    peak = max(hourly, key=lambda h: h["congestion"]) if hourly else {"hour": 0, "congestion": 0}
    return {
        "총주차면": occ["total"], "현재점유": occ["occupied"], "점유율": occ["rate"],
        "층별": occ["by_floor"], "평균주차시간_분": traffic["avg_duration_min"], "일평균회전율": traffic["turnover"],
        "피크시간": peak["hour"], "피크혼잡도": peak["congestion"], "번호판인식률": traffic["plate_recognition_rate"],
        "미처리이벤트": stats["open_events"], "AI지표": {k: stats["ai"].get(k) for k in ("version", "mAP50", "precision", "recall")},
    }


def _template(period: str, s: dict) -> str:
    label = "일간" if period == "daily" else "주간"
    floors = "\n".join(f"- {f['floor']}: {f['occupied']}/{f['total']}면 점유 ({f['rate'] * 100:.1f}%)" for f in s["층별"])
    return f"""## {label} 주차장 운영 리포트

### 1. 운영 현황 요약
- 전체 {s['총주차면']}면 중 {s['현재점유']}면 점유 (점유율 {s['점유율'] * 100:.1f}%)
{floors}
- 평균 주차 시간 {s['평균주차시간_분']}분, 일평균 회전율 {s['일평균회전율']}회

### 2. 혼잡도 분석
- 가장 혼잡한 시간대는 {s['피크시간']}시 (평균 혼잡도 {s['피크혼잡도'] * 100:.1f}%)입니다.
- 피크 시간대 전후 30분 동안 B2층 유도 안내를 강화하면 B1층 대기 차량을 분산할 수 있습니다.

### 3. AI 인식 품질
- 탐지 모델 {s['AI지표'].get('version')} / mAP50 {s['AI지표'].get('mAP50')}
- 번호판 인식률 {s['번호판인식률'] * 100:.1f}% (신뢰도 0.85 이상 기준)

### 4. 이상 이벤트 및 권고 사항
- 미처리 이상 이벤트 {s['미처리이벤트']}건: 장기·불법 주차 차량 현장 확인을 권장합니다.
- 장애인·전기차 전용 구역 위반 감지 시 즉시 알림을 유지하세요.

> 본 리포트는 템플릿 기반으로 생성되었습니다. GEMINI_API_KEY 설정 시 Gemini가 분석 문장을 작성합니다."""


def generate_report(period: str, stats: dict) -> tuple[str, str]:
    """(content, source) 반환. source = gemini | template"""
    summary = _summary(stats)
    if not settings.gemini_api_key:
        return _template(period, summary), "template"
    prompt = (
        "당신은 B2B 주차관제 플랫폼 parkpick의 운영 분석가입니다. 아래 JSON 운영 지표를 바탕으로 "
        f"{'일간' if period == 'daily' else '주간'} 주차장 운영 리포트를 한국어 마크다운으로 작성하세요. "
        "섹션: 1) 운영 현황 요약 2) 혼잡도 분석 및 예측 해설 3) AI 인식 품질 4) 이상 이벤트 및 운영 개선 권고. "
        "수치는 근거로 인용하고 과장하지 마세요.\n\n" + json.dumps(summary, ensure_ascii=False, default=str)
    )
    try:
        resp = httpx.post(GEMINI_URL.format(model=settings.gemini_model), headers={"x-goog-api-key": settings.gemini_api_key},
                          json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=40)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"], "gemini"
    except Exception:
        log.exception("Gemini report generation failed, fallback to template")
        return _template(period, summary), "template"
