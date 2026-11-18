"""개인정보 보호: 영상 프레임의 번호판·인물(얼굴) 영역 블러 처리."""


def blur_regions(frame, boxes, ksize: int = 31):
    import cv2

    h, w = frame.shape[:2]
    for x1, y1, x2, y2 in boxes:
        x1, y1, x2, y2 = max(int(x1), 0), max(int(y1), 0), min(int(x2), w), min(int(y2), h)
        if x2 > x1 and y2 > y1:
            frame[y1:y2, x1:x2] = cv2.GaussianBlur(frame[y1:y2, x1:x2], (ksize, ksize), 0)
    return frame


def person_head_box(box):
    """사람 탐지 박스의 상단 25% 영역을 얼굴 영역으로 근사."""
    x1, y1, x2, y2 = box
    return x1, y1, x2, y1 + (y2 - y1) * 0.25
