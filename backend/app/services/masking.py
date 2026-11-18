import re

_PLATE = re.compile(r"^(\d{2,3}\s?[가-힣])\s?(\d{4})$")


def mask_plate(plate: str | None) -> str | None:
    """차량 번호판 마스킹: '12가3456' -> '12가 ****'"""
    if not plate:
        return plate
    match = _PLATE.match(plate.strip())
    if match:
        return f"{match.group(1).replace(' ', '')} ****"
    return plate[:2] + "*" * max(len(plate) - 2, 0)


def mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:2]}{'*' * max(len(name) - 2, 1)}@{domain}"
