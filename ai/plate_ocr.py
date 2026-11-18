"""차량 번호판 OCR (EasyOCR) 및 한국 번호판 형식 정규화."""
import re

PLATE_RE = re.compile(r"(\d{2,3})\s*([가-힣])\s*(\d{4})")
_reader = None


def normalize_plate(text: str) -> str | None:
    """OCR 원문에서 '12가3456' / '123가4567' 형식만 추출."""
    match = PLATE_RE.search((text or "").replace(" ", ""))
    return "".join(match.groups()) if match else None


def read_plate(image) -> tuple[str | None, float]:
    """번호판 영역 이미지(numpy BGR) → (번호, 신뢰도). EasyOCR 미설치 시 (None, 0.0)."""
    global _reader
    try:
        import easyocr
    except ImportError:
        return None, 0.0
    if _reader is None:
        _reader = easyocr.Reader(["ko", "en"], gpu=False)
    best: tuple[str | None, float] = (None, 0.0)
    for _, text, conf in _reader.readtext(image):
        plate = normalize_plate(text)
        if plate and conf > best[1]:
            best = (plate, float(conf))
    return best
