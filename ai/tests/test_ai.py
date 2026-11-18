import argparse
from pathlib import Path

from ai.convert_aihub_labels import parse_file
from ai.occupancy import Detection, OccupancyJudge, coverage, point_in_polygon
from ai.plate_ocr import normalize_plate

SQUARE = [[0, 0], [100, 0], [100, 100], [0, 100]]


def test_point_in_polygon():
    assert point_in_polygon(50, 50, SQUARE) and not point_in_polygon(150, 50, SQUARE)


def test_coverage():
    assert coverage((0, 0, 100, 100), SQUARE) == 1.0
    assert coverage((200, 200, 300, 300), SQUARE) == 0.0


def test_occupancy_judge_smoothing():
    judge = OccupancyJudge({"B1-A01": SQUARE}, window=3)
    car = Detection((10, 10, 90, 90), "car", 0.9)
    assert judge.frame([car])["B1-A01"] is True
    assert judge.frame([])["B1-A01"] is False  # 1:1 동률은 비점유
    assert judge.frame([car])["B1-A01"] is True  # 2/3 점유
    assert judge.frame([Detection((10, 10, 90, 90), "person", 0.9)])["B1-A01"] is False  # 사람은 차량 아님 → 1/3


def test_normalize_plate():
    assert normalize_plate("12 가 3456") == "12가3456"
    assert normalize_plate("번호 123나4567") == "123나4567"
    assert normalize_plate("ABC") is None


def test_convert_sample_label():
    args = argparse.Namespace(image_key="image", ann_key="annotations", label_key="label")
    path = Path(__file__).resolve().parents[2] / "data" / "samples" / "aihub_sample_label.json"
    lines = parse_file(path, args)["sample_0001.jpg"]
    assert len(lines) == 2 and lines[0].startswith("0 ") and lines[1].startswith("1 ")
