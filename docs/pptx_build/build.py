"""parkpick 발표자료(pptx) 생성 스크립트. 실행: .venv/Scripts/python docs/pptx_build/build.py"""
import os
import qrcode
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
SH = os.path.join(HERE, "shots")
TMP = os.path.join(HERE, "tmp")
os.makedirs(TMP, exist_ok=True)
OUT = os.path.join(HERE, "..", "프로젝트_발표자료.pptx")


def C(h): return RGBColor.from_string(h)


INK, INK2, INK3 = "0B1220", "121C31", "22304F"
YEL, GRN, WHITE, GRAY, RED, BLUE, AMB = "FFC800", "34F5A0", "FFFFFF", "9AA7BD", "FF5C5C", "2F6BFF", "FFB020"
BODY, MONO = "Malgun Gothic", "Consolas"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
TOTAL = 16


def rect(s, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE, lw=1, radius=None):
    sp = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill: sp.fill.solid(); sp.fill.fore_color.rgb = C(fill)
    else: sp.fill.background()
    if line: sp.line.color.rgb = C(line); sp.line.width = Pt(lw)
    else: sp.line.fill.background()
    sp.shadow.inherit = False
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE: sp.adjustments[0] = radius
    return sp


def rrect(s, x, y, w, h, fill=None, line=None, r=0.08, lw=1): return rect(s, x, y, w, h, fill, line, MSO_SHAPE.ROUNDED_RECTANGLE, lw, r)


def txt(s, x, y, w, h, content, size=14, color=WHITE, bold=False, font=BODY, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.1):
    """content: str 또는 [(text, {opts})...] 문단 리스트. 문단 = str | list of runs(str|(str,opts))"""
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    paras = content if isinstance(content, list) else [content]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align; p.line_spacing = spacing
        runs = para if isinstance(para, list) else [para]
        for r in runs:
            t, o = (r, {}) if isinstance(r, str) else r
            run = p.add_run(); run.text = t
            f = run.font; f.name = o.get("font", font); f.size = Pt(o.get("size", size)); f.bold = o.get("bold", bold)
            f.color.rgb = C(o.get("color", color))
        if isinstance(para, list) and para and isinstance(para[0], tuple) and para[0][1].get("space"):
            p.space_before = Pt(para[0][1]["space"])
    return tb


def bullets(s, x, y, w, items, size=14, gap=7, color=WHITE, mark=YEL, line_h=0.27):
    """items: str | (head, body). 줄 수를 추정해 y를 누적."""
    for it in items:
        head, body = (it, "") if isinstance(it, str) else it
        runs = [("▪ ", {"color": mark, "bold": True})]
        if body: runs += [(head + "  ", {"bold": True, "color": WHITE}), (body, {"color": color})]
        else: runs += [(head, {"color": color})]
        chars = len(head) + len(body) + 4
        per_line = max(int(w * 72 / (size * 0.95)), 8)
        lines = -(-chars // per_line)
        h = lines * line_h * size / 14
        txt(s, x, y, w, h, [runs], size=size)
        y += h + gap / 72 + 0.04
    return y


def pic(s, name, x, y, w, h, border=INK3, anchor_top=True):
    src = Image.open(os.path.join(SH, name)).convert("RGB")
    tr = w / h
    if src.width / src.height > tr:
        nw = int(src.height * tr); l = (src.width - nw) // 2; src = src.crop((l, 0, l + nw, src.height))
    else:
        nh = int(src.width / tr); t = 0 if anchor_top else (src.height - nh) // 2; src = src.crop((0, t, src.width, t + nh))
    p = os.path.join(TMP, f"{os.path.basename(name)}_{int(w * 100)}x{int(h * 100)}.jpg"); src.save(p, quality=88)
    pc = s.shapes.add_picture(p, Inches(x), Inches(y), Inches(w), Inches(h))
    if border: pc.line.color.rgb = C(border); pc.line.width = Pt(1.25)
    return pc


def darken(name, alpha=0.72, tint=INK):
    src = Image.open(os.path.join(SH, name)).convert("RGB").resize((1920, 1080)) if False else Image.open(os.path.join(SH, name)).convert("RGB")
    ov = Image.new("RGB", src.size, tuple(int(tint[i:i + 2], 16) for i in (0, 2, 4)))
    p = os.path.join(TMP, f"dark_{name}"); Image.blend(src, ov, alpha).save(p, quality=88); return p


def bg(s, color=INK): 
    f = s.background.fill; f.solid(); f.fore_color.rgb = C(color)


def photo_bg(s, name, alpha=0.72):
    src = Image.open(darken(name, alpha)); tr = 13.333 / 7.5
    nw = int(src.height * tr)
    if nw <= src.width: l = (src.width - nw) // 2; src = src.crop((l, 0, l + nw, src.height))
    p = os.path.join(TMP, f"bg_{name}"); src.save(p, quality=88)
    s.shapes.add_picture(p, 0, 0, prs.slide_width, prs.slide_height)


def stripe(s, y=7.32, h=0.18):
    n = 70; w = 13.333 / n
    rect(s, 0, y, 13.333, h, "0A0F1A")
    for i in range(0, n, 2):
        sp = rect(s, i * w, y, w * 1.0, h, YEL, shape=MSO_SHAPE.PARALLELOGRAM); sp.adjustments[0] = 0.5


def chip(s, x, y, text, fill=INK3, color=WHITE, w=None, size=11, line=None, bold=True):
    w = w or (0.28 + len(text) * 0.115 * size / 11)
    rrect(s, x, y, w, 0.32, fill, line, r=0.5)
    txt(s, x, y, w, 0.32, text, size=size, color=color, bold=bold, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    return w


OWNER = {"홍기흥": (YEL, INK), "박미금": (BLUE, WHITE), "김모란": (GRN, INK), "이오리": ("B084FF", INK), "팀": (INK3, WHITE)}


def header(s, n, eyebrow, title, owner=None, dark=True):
    bg(s, INK)
    rect(s, 0, 0, 0.16, 7.5, YEL)
    txt(s, 0.6, 0.38, 8, 0.3, eyebrow, size=11, color=YEL, font=MONO, bold=True)
    txt(s, 0.6, 0.68, 10.6, 0.8, title, size=28, bold=True)
    if owner:
        fill, col = OWNER[owner.split()[0]]
        label = "팀 공통" if owner == "팀" else f"담당  {owner}"
        w = 0.4 + len(label) * 0.12
        chip(s, 13.0 - w, 0.45, label, fill=fill, color=col, w=w, size=12)
    txt(s, 0.6, 7.1, 6, 0.25, "parkpick  ·  AI PARKING CONTROL", size=9, color="5E6C86", font=MONO)
    txt(s, 11.7, 7.1, 1.1, 0.25, f"{n:02d} / {TOTAL}", size=9, color="5E6C86", font=MONO, align=PP_ALIGN.RIGHT)


def notes(s, text): s.notes_slide.notes_text_frame.text = text


def qr(url, name):
    p = os.path.join(TMP, name)
    qrcode.make(url, box_size=8, border=1).save(p); return p


def table(s, x, y, w, col_w, rows, size=12, head_fill=INK3, row_h=0.46, first_bold=True):
    shape = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(row_h * len(rows)))
    t = shape.table
    tblPr = shape._element.graphic.graphicData.tbl.tblPr
    tblPr.set("bandRow", "0"); tblPr.set("firstRow", "0")
    for i, cw in enumerate(col_w): t.columns[i].width = Inches(cw)
    for r, row in enumerate(rows):
        t.rows[r].height = Inches(row_h)
        for c, val in enumerate(row):
            cell = t.cell(r, c); cell.fill.solid()
            cell.fill.fore_color.rgb = C(head_fill if r == 0 else (INK2 if r % 2 else "0F1830"))
            cell.margin_left = cell.margin_right = Inches(0.12); cell.margin_top = cell.margin_bottom = Inches(0.05)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            tf = cell.text_frame; tf.word_wrap = True
            p = tf.paragraphs[0]; run = p.add_run(); run.text = str(val)
            f = run.font; f.name = BODY; f.size = Pt(size)
            if r == 0: f.bold = True; f.color.rgb = C(YEL)
            elif c == 0 and first_bold: f.bold = True; f.color.rgb = C(WHITE)
            else:
                f.color.rgb = C("D5DCEA")
                if val in ("O", "O (마스킹)", "O + 감사로그"): f.color.rgb = C(GRN); f.bold = True
                if val in ("X", "403 차단"): f.color.rgb = C(RED); f.bold = True
    return t


def arrow(s, x1, y1, x2, y2, color=YEL, w=2):
    c = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    c.line.color.rgb = C(color); c.line.width = Pt(w)
    ln = c.line._get_or_add_ln()
    from lxml import etree
    tail = etree.SubElement(ln, "{http://schemas.openxmlformats.org/drawingml/2006/main}tailEnd"); tail.set("type", "triangle")
    return c


def node(s, x, y, w, h, title, sub="", fill=INK2, line=INK3, tcolor=WHITE, size=14, subsize=10.5):
    rrect(s, x, y, w, h, fill, line, r=0.1, lw=1.5)
    txt(s, x + 0.12, y + 0.1, w - 0.24, h - 0.2,
        [[(title, {"bold": True, "size": size, "color": tcolor})]] + ([[(sub, {"size": subsize, "color": GRAY})]] if sub else []),
        anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER, spacing=1.15)


# ============================================================ 1. 표지
s = prs.slides.add_slide(BLANK); bg(s)
photo_bg(s, "garageTeal.jpg", 0.62)
rect(s, 0, 0, 0.16, 7.5, YEL)
txt(s, 0.8, 0.7, 8, 0.3, "K-AI DATA  ·  AI PARKING CONTROL PLATFORM", size=12, color=YEL, font=MONO, bold=True)
rrect(s, 0.8, 1.45, 0.95, 0.95, BLUE, r=0.2)
txt(s, 0.8, 1.45, 0.95, 0.95, "P", size=44, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
txt(s, 1.95, 1.4, 6, 1.1, [[("park", {"color": WHITE}), ("pick", {"color": "6FA0FF"})]], size=54, bold=True, anchor=MSO_ANCHOR.MIDDLE)
txt(s, 0.8, 2.85, 7.2, 1.6, [[("CCTV 영상이 곧", {})], [("빈 자리 안내판", {"color": YEL}), ("이 된다", {})]], size=36, bold=True, spacing=1.2)
txt(s, 0.8, 4.45, 6.8, 1.2, "주차 이동체 인지 영상을 YOLO·ByteTrack으로 분석해\n실시간 점유를 판별하고, 운전자에게는 유도를,\n운영자에게는 관제·리포트를 제공하는 B2B 솔루션", size=14, color="C9D3E6", spacing=1.3)
txt(s, 0.8, 5.85, 7, 0.3, "발표  홍기흥 (백엔드 & 인프라)", size=15, bold=True)
txt(s, 0.8, 6.2, 7, 0.3, "팀  박미금(조장) · 홍기흥 · 김모란 · 이오리", size=12, color=GRAY)
# LED 전광판
rrect(s, 8.5, 1.5, 4.2, 3.7, "05080F", "3A4A6B", r=0.05, lw=2.5)
txt(s, 8.75, 1.7, 3, 0.25, "▮ PARKING GUIDANCE", size=10, color=YEL, font=MONO, bold=True)
txt(s, 11.4, 1.7, 1.1, 0.25, "● LIVE", size=10, color=GRN, font=MONO, align=PP_ALIGN.RIGHT)
for i, (a, b, n) in enumerate([("B1", "B1층", "020"), ("B2", "B2층", "021"), ("EV", "전기차", "001"), ("DIS", "장애인", "001")]):
    yy = 2.15 + i * 0.75
    rrect(s, 8.75, yy, 0.7, 0.5, INK3, r=0.15)
    txt(s, 8.75, yy, 0.7, 0.5, a, size=13, bold=True, font=MONO, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    txt(s, 9.65, yy, 1.5, 0.5, "→  " + b, size=13, color="C9D3E6", anchor=MSO_ANCHOR.MIDDLE)
    txt(s, 11.2, yy, 1.3, 0.5, n, size=30, bold=True, color=GRN, font=MONO, align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
txt(s, 8.75, 4.95, 3.8, 0.2, "DEMO DATA · 시뮬레이터 생성", size=8, color="5E6C86", font=MONO)
# QR
for i, (label, url, nm) in enumerate([("GitHub", "https://github.com/fsclass-n/parkpick", "qr_gh.png"), ("Live Demo", "https://parkpick.netlify.app", "qr_demo.png")]):
    xx = 8.5 + i * 2.2
    rrect(s, xx, 5.45, 2.0, 1.55, WHITE, r=0.05)
    s.shapes.add_picture(qr(url, nm), Inches(xx + 0.1), Inches(5.55), Inches(1.0), Inches(1.0))
    txt(s, xx + 1.15, 5.6, 0.85, 0.9, [[(label, {"bold": True, "size": 11, "color": INK})], [("스캔", {"size": 9, "color": "5E6C86"})]], anchor=MSO_ANCHOR.TOP)
    txt(s, xx + 0.1, 6.6, 1.85, 0.3, url.replace("https://", ""), size=7.5, color="334155", font=MONO)
stripe(s)
notes(s, "안녕하세요, 백엔드와 인프라를 맡은 홍기흥입니다. parkpick은 주차장 CCTV 영상을 AI로 분석해 빈 자리를 실시간으로 안내하고, 관리자에게는 관제와 운영 리포트를 제공하는 B2B 플랫폼입니다. 4인 팀 프로젝트이고 저는 서버 API, 실시간 처리, 권한, 배포 자동화를 담당했습니다. 오늘은 기술적 의사결정과 트러블슈팅 위주로 말씀드리겠습니다.")

# ============================================================ 2. 문제 정의
s = prs.slides.add_slide(BLANK); header(s, 2, "01  PROBLEM", "빈 자리를 못 찾는 운전자, 센서 비용에 지친 운영자", "팀")
pic(s, "garagePillar.jpg", 8.7, 1.7, 4.0, 3.55)
for i, (ttl, col, items) in enumerate([
    ("운전자", BLUE, ["빈 자리를 찾아 배회  →  시간·연료 낭비", "만차 층까지 진입 후 되돌아 나감", "주차 후 내 차 위치를 기억하지 못함"]),
    ("운영자", YEL, ["센서(지자기·초음파)는 주차면당 설치·유지비", "이미 설치된 CCTV는 활용하지 못함", "장기·불법 주차를 사람이 순찰로 확인", "점유·회전율 분석과 리포트가 수작업"])]):
    x = 0.6 + i * 4.0
    rrect(s, x, 1.7, 3.8, 3.55, INK2, INK3)
    rect(s, x, 1.7, 3.8, 0.09, col)
    txt(s, x + 0.25, 1.95, 3.3, 0.4, ttl, size=18, bold=True, color=col)
    bullets(s, x + 0.25, 2.5, 3.3, items, size=13, gap=8, mark=col)
rrect(s, 0.6, 5.5, 12.1, 1.35, "1B2A18", GRN, r=0.06, lw=1.5)
txt(s, 0.95, 5.62, 2.4, 1.1, [[("OUR ANSWER", {"font": MONO, "size": 10, "color": GRN, "bold": True})], [("센서 없이", {"size": 20, "bold": True})]], anchor=MSO_ANCHOR.MIDDLE)
txt(s, 3.3, 5.62, 9.2, 1.1, [[("기존 CCTV 영상 + 객체 탐지(YOLO)", {"bold": True, "color": GRN, "size": 17})], [("점유 판별  →  실시간 유도  +  이상 이벤트 관제  +  자동 운영 리포트 를 하나의 플랫폼으로", {"size": 14, "color": "D5DCEA"})]], anchor=MSO_ANCHOR.MIDDLE, spacing=1.3)
notes(s, "문제는 두 가지입니다. 운전자는 빈 자리를 못 찾고, 운영자는 센서 설치비와 순찰 인력 부담이 있습니다. 저희는 이미 설치된 CCTV를 AI로 분석해서 센서 설치 없이 두 문제를 함께 풀려고 했습니다.")

# ============================================================ 3. 솔루션
s = prs.slides.add_slide(BLANK); header(s, 3, "02  SOLUTION", "3대 핵심 기능 + 운영 가능한 B2B 플랫폼", "팀")
cards = [("01", "실시간 점유 판별 · 유도", "YOLO+ByteTrack → ROI 판정 → WebSocket 푸시\n빈 자리 경로 안내 · 내 차 찾기", "monitor.jpg", YEL),
         ("02", "이상 이벤트 관제", "장기·불법 주차, 역주행 감지\n관제 대시보드와 이벤트 처리", "guide.jpg", GRN),
         ("03", "데이터 기반 운영 리포트", "pandas 통계 + Gemini 자동 리포트\n점유율·회전율·혼잡도", "reports.jpg", "B084FF")]
for i, (no, ttl, desc, img, col) in enumerate(cards):
    x = 0.6 + i * 4.1
    rrect(s, x, 1.65, 3.9, 3.7, INK2, INK3)
    pic(s, img, x + 0.15, 1.8, 3.6, 1.7)
    txt(s, x + 0.2, 3.62, 0.8, 0.4, no, size=20, bold=True, color=col, font=MONO)
    txt(s, x + 0.9, 3.65, 2.9, 0.4, ttl, size=15, bold=True)
    txt(s, x + 0.2, 4.2, 3.55, 1.1, desc, size=11, color="C9D3E6", spacing=1.3)
kpis = [("96", "주차면 (B1·B2)"), ("3", "사용자 역할"), ("9", "DB 테이블"), ("18", "자동 테스트"), ("4", "배포 대상")]
for i, (n, l) in enumerate(kpis):
    x = 0.6 + i * 2.45
    rrect(s, x, 5.6, 2.3, 1.25, "0F1830", INK3, r=0.08)
    txt(s, x, 5.7, 2.3, 0.7, n, size=34, bold=True, color=YEL, font=MONO, align=PP_ALIGN.CENTER)
    txt(s, x, 6.4, 2.3, 0.3, l, size=11, color=GRAY, align=PP_ALIGN.CENTER)
notes(s, "핵심 기능은 세 가지입니다. 실시간 점유와 유도, 이상 상황 관제, 데이터 기반 운영 리포트입니다. 아래 숫자는 저장소 기준입니다. 96면 도면, 사용자 역할 3종, DB 테이블 9개, 백엔드 13건과 AI 5건의 자동 테스트, 그리고 배포 대상 4곳입니다.")

# ============================================================ 4. 아키텍처
s = prs.slides.add_slide(BLANK); header(s, 4, "03  ARCHITECTURE", "AI는 결과만 보내고, 서버가 실시간으로 퍼뜨린다", "홍기흥")
node(s, 0.6, 2.25, 1.9, 1.15, "CCTV", "RTSP / mp4 · 샘플 영상", line=GRAY)
node(s, 3.0, 2.25, 2.5, 1.15, "AI 파이프라인", "YOLO · ByteTrack · ROI · EasyOCR", line=GRN, tcolor=GRN)
node(s, 6.0, 2.25, 2.7, 1.15, "FastAPI (Render)", "JWT · RBAC · pandas · Gemini", line=YEL, tcolor=YEL)
node(s, 9.2, 1.45, 3.5, 1.15, "TiDB Cloud / SQLite", "DATABASE_URL 로 전환", line=BLUE)
node(s, 9.2, 3.1, 3.5, 1.15, "React 프런트엔드", "Render(실 API) · Netlify(Mock)", line=BLUE)
arrow(s, 2.5, 2.82, 3.0, 2.82); arrow(s, 5.5, 2.82, 6.0, 2.82)
arrow(s, 8.7, 2.5, 9.2, 2.05); arrow(s, 8.7, 3.15, 9.2, 3.65)
txt(s, 5.2, 3.5, 3.4, 0.3, "POST /api/ingest/occupancy (토큰)", size=9.5, color=YEL, font=MONO, align=PP_ALIGN.CENTER)
txt(s, 8.75, 3.85, 1.0, 0.5, "REST\nWebSocket", size=9, color=YEL, font=MONO)
rrect(s, 0.6, 4.65, 12.1, 2.2, INK2, INK3)
txt(s, 0.9, 4.78, 5, 0.3, "설계 포인트", size=13, bold=True, color=YEL)
bullets(s, 0.9, 5.15, 5.7, [("분리 배포", "backend / frontend / ai 각각 자체 requirements·배포 단위"),
                           ("시뮬레이터", "CCTV 연동 전에도 3초 주기로 입출차·이벤트 생성 → 같은 경로로 검증")], size=12, gap=6)
bullets(s, 6.9, 5.15, 5.6, [("변경분만 전송", "점유가 바뀐 주차면만 수집 API → WebSocket 브로드캐스트"),
                           ("이중 프런트", "실 API / Mock 모드, 두 모드의 권한 규칙 동일 유지")], size=12, gap=6)
notes(s, "AI는 매 프레임 전체가 아니라 점유가 바뀐 결과만 수집 API로 보냅니다. 서버는 이를 DB에 반영하고 WebSocket으로 모든 화면에 푸시합니다. 영상 연동 전에도 시뮬레이터가 같은 경로로 데이터를 만들기 때문에 AI 학습이 끝나기 전에 전체 파이프라인을 검증할 수 있었습니다. AI 모듈은 무거운 CV 패키지가 필요해서 backend와 requirements를 분리했습니다.")

# ============================================================ 5. 기술 스택
s = prs.slides.add_slide(BLANK); header(s, 5, "04  TECH DECISIONS", "선택마다 이유와 한계를 함께 정리했다", "홍기흥")
table(s, 0.6, 1.7, 12.1, [1.9, 5.6, 4.6], [
    ["선택", "이유 (Why)", "한계 / 대안"],
    ["FastAPI", "Pydantic 타입 검증 · 자동 Swagger · WebSocket 내장", "Django 대비 관리 기능을 직접 구현"],
    ["TiDB Cloud", "MySQL 호환 + 무료 서버리스, 재배포에도 데이터 유지", "SQLite 는 Render 재배포 시 초기화 → 운영은 필수"],
    ["WebSocket", "빈 자리 변동을 폴링 없이 즉시 반영", "다중 인스턴스에서는 Redis pub/sub 필요"],
    ["pandas · NumPy", "점유율·혼잡도를 벡터 연산으로 계산", "대용량이면 SQL 집계/배치로 이전"],
    ["YOLO + ByteTrack", "경량(yolov8n) CPU 추론, 객체 ID 유지", "야간·가림 성능은 학습 후 검증"],
    ["Gemini 리포트", "통계 JSON → 운영 리포트 문장 생성", "키 없거나 실패 시 템플릿 리포트로 폴백"]], size=12.5, row_h=0.62)
txt(s, 0.6, 6.15, 12.1, 0.6, [[("모든 선택의 한계를 알고 있다는 것", {"bold": True, "color": YEL}), ("  —  현재 규모(96면·7일 로그)에는 충분하고, 확장 시 교체 지점을 문서에 명시했습니다.", {"color": "C9D3E6"})]], size=13)
notes(s, "선택마다 한계도 같이 정리했습니다. 예를 들어 SQLite는 Render 무료 플랜에서 재배포마다 데이터가 날아가기 때문에 운영은 TiDB Cloud로 가고 로컬은 SQLite로 빠르게 개발합니다. WebSocket은 현재 단일 인스턴스 기준이라 확장하면 Redis pub/sub이 필요합니다. Gemini 호출은 실패할 수 있어 템플릿 리포트로 폴백합니다.")

# ============================================================ 6. 핵심 기술 1
s = prs.slides.add_slide(BLANK); header(s, 6, "05  CORE ① REALTIME PIPELINE", "영상에서 화면까지: 오탐 억제와 변경분 전송", "김모란 · 홍기흥")
steps = [("프레임", "mp4 / RTSP"), ("YOLO 탐지", "차량·보행자"), ("ByteTrack", "객체 ID 유지"), ("ROI 판정", "coverage ≥ 0.35"), ("5프레임 다수결", "깜빡임 제거"), ("변경분 POST", "수집 API")]
for i, (a, b) in enumerate(steps):
    x = 0.6 + i * 2.03
    col = YEL if i >= 3 else INK3
    sp = rect(s, x, 1.65, 1.95, 1.0, INK2 if i < 3 else "2A2410", YEL if i >= 3 else INK3, MSO_SHAPE.PENTAGON, 1.5)
    txt(s, x + 0.12, 1.7, 1.6, 0.9, [[(a, {"bold": True, "size": 13, "color": YEL if i >= 3 else WHITE})], [(b, {"size": 10, "color": GRAY})]], anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER)
bullets(s, 0.6, 3.0, 6.3, [
    ("ROI 판정", "주차면 다각형 안 샘플 포인트가 차량 박스에 포함되는 비율 ≥ 0.35 또는 중심점 포함"),
    ("오탐 억제", "최근 5프레임 다수결 — 지나가는 차 때문에 점유가 깜빡이는 문제 해결"),
    ("전송 최적화", "이전 상태와 비교해 바뀐 면만 전송 → 서버·WebSocket 트래픽 절감"),
    ("번호판", "차량 하단 40% → EasyOCR → 정규식 정규화, 노출 시 12가 **** 마스킹"),
    ("수집 API (홍기흥)", "X-Ingest-Token 상수시간 비교 → DB 반영 → 변경분만 브로드캐스트")], size=12.5, gap=7)
rrect(s, 7.2, 3.0, 5.5, 3.75, "070C16", INK3, r=0.04)
txt(s, 7.4, 3.1, 5, 0.25, "ai/occupancy.py  ·  OccupancyJudge", size=9.5, color=YEL, font=MONO, bold=True)
code = ("occupied = any(\n  coverage(v.box, polygon) >= self.threshold\n  or center_in_box(v.box, polygon)\n  for v in vehicles)\n\nhist.append(occupied)          # 최근 N프레임\nif len(hist) > self.window:   # window = 5\n    hist.popleft()\nself.state[code] = sum(hist) * 2 > len(hist)\n\n# 변경된 면만 서버로 전송\nchanges = {c: v for c, v in state.items()\n           if previous.get(c) != v}")
txt(s, 7.4, 3.45, 5.15, 3.2, code, size=11, color="BFE3FF", font=MONO, spacing=1.25)
txt(s, 0.6, 6.65, 6.5, 0.3, "※ 외부 의존성 없는 순수 파이썬 모듈 → ai 단위 테스트 5건이 CI에서 실행", size=10.5, color=GRAY)
notes(s, "가장 신경 쓴 건 오탐입니다. 프레임 하나만 보면 지나가는 차 때문에 점유가 깜빡이므로 최근 5프레임 다수결로 평활화했습니다. 매 프레임 전체를 보내지 않고 바뀐 주차면만 보내서 서버와 WebSocket 트래픽을 줄였습니다. AI 모듈은 김모란 님이 구현했고, 저는 수집 API와 실시간 반영을 맡았습니다. 솔직하게 말씀드리면 현재 모델은 AI Hub 데이터 학습 전이라 지표는 샘플입니다.")

# ============================================================ 7. 핵심 기술 2
s = prs.slides.add_slide(BLANK); header(s, 7, "06  CORE ② DATA ANALYSIS", "점유율·혼잡도 분석과 AI 운영 리포트", "이오리")
table(s, 0.6, 1.65, 6.6, [1.45, 2.65, 2.5], [
    ["지표", "정의", "구현"],
    ["점유율", "점유면 / 전체면 (층·유형)", "pandas groupby"],
    ["시간대별 입출차", "7일 평균", "value_counts · reindex(0~23)"],
    ["혼잡도", "정시 주차 차량 / 전체 면", "NumPy 브로드캐스팅"],
    ["회전율", "일 입차 / 전체 면", "일별 groupby"],
    ["평균 주차시간", "(출차 − 입차) 평균", "Timedelta"],
    ["번호판 인식률", "OCR 신뢰도 ≥ 0.85", "임계 비교"]], size=11.5, row_h=0.5)
rrect(s, 0.6, 5.3, 6.6, 1.5, "070C16", INK3, r=0.05)
txt(s, 0.8, 5.38, 6.2, 1.4, "present = ((entered[None,:] <= ts)\n           & (exited[None,:]  >  ts)).sum(axis=1)\ncongestion = present / total_spaces   # 반복문 없이 24h×N 비교\n# 미출차 차량: 출차 시각 = 미래값 → '현재 주차 중'", size=10.5, color="BFE3FF", font=MONO, spacing=1.3)
pic(s, "admin.jpg", 7.45, 1.65, 5.25, 3.28)
bullets(s, 7.45, 5.1, 5.25, [("Gemini 리포트", "통계 JSON → 4섹션, '수치 인용·과장 금지' 프롬프트"), ("폴백", "키 없음/호출 실패 시 템플릿 리포트 · source 구분 저장")], size=11.5, gap=5)
txt(s, 7.45, 6.55, 5.3, 0.3, "※ 분석 대상은 7일치 가상 로그 — 같은 코드로 실데이터 재분석", size=10, color=AMB)
notes(s, "이 부분은 팀원 이오리 님이 구현했습니다. 혼잡도는 입출차 시각 구간과 시간 격자를 NumPy 브로드캐스팅으로 한 번에 비교해서 반복문 없이 구했고, 아직 출차하지 않은 차량은 미래 시각으로 채워 현재 주차 중으로 처리했습니다. Gemini 리포트는 실패해도 템플릿으로 폴백합니다. 현재 분석 데이터는 가상 로그입니다.")

# ============================================================ 8. 인증
s = prs.slides.add_slide(BLANK); header(s, 8, "07  AUTH & SECURITY", "한 번의 클릭으로 체험, 서버에서 끝까지 보호", "홍기흥")
pic(s, "login.jpg", 0.6, 1.65, 7.3, 4.56)
roles = [("user", "일반 사용자", "관제·유도·내 차 찾기·리포트 조회", BLUE), ("test_admin", "테스트 관리자", "관리자 화면 조회만 · 읽기 전용 · 마스킹", AMB), ("admin", "실제 관리자", "ADMIN_SECRET_KEY 보안 키 · 전체 CRUD", GRN)]
for i, (k, n, d, col) in enumerate(roles):
    y = 1.65 + i * 1.2
    rrect(s, 8.15, y, 4.55, 1.08, INK2, col, r=0.08, lw=1.5)
    txt(s, 8.35, y + 0.1, 4.2, 0.3, [[(k, {"font": MONO, "size": 10, "color": col, "bold": True})]])
    txt(s, 8.35, y + 0.38, 4.2, 0.3, n, size=15, bold=True)
    txt(s, 8.35, y + 0.7, 4.2, 0.3, d, size=10.5, color=GRAY)
bullets(s, 0.6, 6.35, 12.1, [("JWT 720분 · 비밀번호 해시 · 정책 검증 · OAuth(Google·Naver·Kakao, 키 설정 시 활성)  /  관리자 비밀번호는 코드에 없고 .env 환경변수로만 주입", "")], size=12, gap=2)
notes(s, "면접관님이 가입 없이 바로 확인하실 수 있도록 원클릭 테스트 계정을 만들었습니다. 다만 테스트 관리자는 읽기 전용이라 데이터를 바꿀 수 없고, 실제 관리자는 환경변수 보안 키로만 들어갑니다. JWT와 비밀번호 해시, 정책 검증, 소셜 로그인도 구현되어 있습니다.")

# ============================================================ 9. 유저 플로우
s = prs.slides.add_slide(BLANK); header(s, 9, "08  USER FLOW  ·  LIVE DEMO", "메인 → 관제 → 유도 → 내 차 찾기", "박미금")
flow = [("① 메인", "LED 전광판 · 실시간 점유율", "f_home.jpg"), ("② 실시간 관제", "96면 도면 · 이벤트 관제", "f_monitor.jpg"), ("③ 주차 유도", "입구 기준 최단 빈 자리", "f_guide.jpg"), ("④ 내 차 찾기", "번호판 → 위치·경로", "f_findcar.jpg")]
for i, (a, b, img) in enumerate(flow):
    x = 0.6 + i * 3.05
    pic(s, img, x, 1.65, 2.9, 3.3)
    rect(s, x, 4.95, 2.9, 0.06, YEL)
    txt(s, x, 5.1, 2.9, 0.3, a, size=14, bold=True)
    txt(s, x, 5.42, 2.9, 0.5, b, size=11, color=GRAY)
    if i < 3: txt(s, x + 2.88, 3.05, 0.2, 0.4, "›", size=22, color=YEL, bold=True)
rrect(s, 0.6, 6.1, 12.1, 0.8, "2A2410", YEL, r=0.1, lw=1.5)
txt(s, 0.9, 6.1, 11.6, 0.8, [[("LIVE DEMO  ", {"bold": True, "color": YEL, "font": MONO}), ("한 면이 바뀌면 WebSocket 으로 전광판 · 도면 · 티커가 동시에 갱신됩니다 (시뮬레이터가 같은 수집 경로로 데이터 생성)", {"color": "E6EAF2"})]], size=12.5, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "여기서 라이브 데모를 보여드립니다. 메인의 전광판 숫자, 관제 도면의 점유 변화, 유도 경로, 내 차 찾기 순서로 약 1분입니다. 화면의 숫자는 시뮬레이터가 실제 수집 API와 같은 경로로 넣는 데이터이며, 한 면이 바뀌면 WebSocket으로 모든 화면이 동시에 갱신됩니다. 백업으로 Netlify Mock 데모 탭을 열어 두었습니다.")

# ============================================================ 10. UI/UX
s = prs.slides.add_slide(BLANK); header(s, 10, "09  UI / UX DESIGN SYSTEM", "관제실 × 노면 표시: 주제가 드러나는 디자인", "박미금")
pic(s, "home_hero.jpg", 0.6, 1.65, 7.0, 4.375)
pic(s, "m_home.jpg", 7.85, 1.65, 2.0, 4.375)
pic(s, "m_drawer.jpg", 10.0, 1.65, 2.0, 4.375)
txt(s, 12.0, 1.65, 0.8, 0.3, "", size=9)
for i, (hexc, nm) in enumerate([(INK, "INK"), (YEL, "노면 노랑"), (GRN, "LED 그린"), (BLUE, "브랜드 블루")]):
    rrect(s, 7.85 + i * 1.2, 6.15, 1.1, 0.45, hexc, GRAY if i == 0 else None, r=0.2)
    txt(s, 7.85 + i * 1.2, 6.65, 1.1, 0.25, nm, size=9, color=GRAY, align=PP_ALIGN.CENTER)
bullets(s, 0.6, 6.15, 7.0, [("서체 이원화", "Pretendard(본문) / JetBrains Mono(숫자·전광판) — 값 변경 시 흔들림 방지"),
                           ("공통 컴포넌트", "유틸바·GNB·LIVE 티커 헤더, CTA 푸터, 진행률 링 To-the-Top, PageHero")], size=11.5, gap=4)
txt(s, 12.0, 1.7, 0.7, 4.3, "", size=9)
notes(s, "상용 플랫폼 수준의 일관성을 위해 헤더, 푸터, 히어로를 공통 컴포넌트로 만들었습니다. 콘셉트는 관제실과 주차장 노면 표시입니다. 숫자가 많은 서비스라 숫자에는 고정폭 서체를 써서 값이 바뀌어도 레이아웃이 흔들리지 않게 했고, 모바일은 햄버거와 우측 Drawer로 대응했습니다. UI는 조장인 박미금 님 담당입니다.")

# ============================================================ 11. RBAC
s = prs.slides.add_slide(BLANK); header(s, 11, "10  ADMIN & RBAC", "프런트 숨김이 아니라 서버가 막는다", "홍기흥")
pic(s, "admin_users.jpg", 0.6, 1.65, 6.0, 3.75)
table(s, 6.85, 1.65, 5.85, [2.5, 1.0, 1.15, 1.2], [
    ["기능", "user", "test_admin", "admin"],
    ["관제·유도·리포트 조회", "O", "O", "O"],
    ["관리자 화면 조회", "X", "O (마스킹)", "O"],
    ["권한 변경·삭제·설정 수정", "X", "403 차단", "O + 감사로그"],
    ["AI 리포트 생성·삭제", "X", "403 차단", "O + 감사로그"]], size=11, row_h=0.62)
layers = [("① UI", "버튼 비활성·READ ONLY 배지"), ("② 라우트", "권한 의존성(Depends)"), ("③ 미들웨어", "test_admin 쓰기 일괄 403")]
for i, (a, b) in enumerate(layers):
    x = 0.6 + i * 4.1
    last = i == 2
    rrect(s, x, 5.65, 3.9, 0.85, "2A2410" if last else INK2, YEL if last else INK3, r=0.1, lw=2 if last else 1)
    txt(s, x + 0.2, 5.65, 3.5, 0.85, [[(a + "  ", {"bold": True, "color": YEL if last else WHITE, "size": 14}), (b, {"size": 12, "color": "D5DCEA"})]], anchor=MSO_ANCHOR.MIDDLE)
txt(s, 0.6, 6.62, 12.1, 0.4, "새 쓰기 API 가 추가돼도 자동 차단되는 최종 방어선 (허용: 로그인·로그아웃 화이트리스트)  ·  관리자 쓰기는 audit_logs 기록  ·  pytest 13건", size=11, color=GRAY)
notes(s, "테스트 관리자 보호를 라우트마다 if문으로 넣으면 새 API를 추가할 때 빠뜨릴 수 있습니다. 그래서 미들웨어에서 토큰의 역할을 보고 쓰기 메서드를 일괄 차단하고, 허용할 경로만 화이트리스트로 두었습니다. UI와 라우트 권한은 사용성과 1차 방어이고, 최종 방어선이 미들웨어입니다. 관리자의 쓰기는 감사 로그에 남고, 이 동작은 pytest로 검증합니다.")

# ============================================================ 12. CI/CD
s = prs.slides.add_slide(BLANK); header(s, 12, "11  DEVOPS · CI / CD", "테스트를 통과해야만 배포되는 영역별 자동화", "홍기흥")
node(s, 0.6, 1.9, 1.7, 1.0, "git push", "main", line=GRAY)
node(s, 2.8, 1.65, 3.0, 1.5, "GitHub Actions CI", "backend pytest 13 · ai pytest 5\n프런트 빌드 2종(실 API / Mock)", line=GRN, tcolor=GRN)
arrow(s, 2.3, 2.4, 2.8, 2.4)
tg = [("Render · API", "rootDir backend · buildFilter backend/**", 1.2), ("Render · 정적 사이트", "rootDir frontend · buildFilter frontend/**", 2.35), ("Netlify · Mock 데모", "ignore: git diff frontend/ netlify.toml", 3.5), ("GitHub Pages", "docs/site 안내 페이지", 4.65)]
for a, b, y in tg:
    rrect(s, 7.0, y, 5.7, 1.0, INK2, YEL if "API" in a else INK3, r=0.08, lw=1.5)
    txt(s, 7.2, y + 0.1, 5.3, 0.4, a, size=14, bold=True)
    txt(s, 7.2, y + 0.5, 5.3, 0.4, b, size=10.5, color=GRAY, font=MONO)
    arrow(s, 5.8, 2.4, 7.0, y + 0.5, color="6F7C94", w=1.25)
txt(s, 5.9, 1.3, 1.2, 0.3, "checksPass", size=10, color=YEL, font=MONO, bold=True)
bullets(s, 0.6, 3.5, 5.9, [("autoDeployTrigger: checksPass", "CI 통과 후에만 Render 배포"),
                          ("IaC", "render.yaml Blueprint 로 서비스·환경변수 정의"),
                          ("Deploy Hook 미사용", "시크릿 없이 Git 연동만으로 자동화"),
                          ("비밀값 관리", ".env.example 에 [RENDER-*] 태그, sync:false / generateValue")], size=12, gap=8)
rrect(s, 0.6, 6.0, 12.1, 0.85, INK2, INK3, r=0.08)
txt(s, 0.9, 6.0, 11.5, 0.85, [[("효과  ", {"bold": True, "color": YEL}), ("프런트만 수정하면 백엔드는 재배포되지 않고, 테스트가 깨지면 어떤 서비스도 배포되지 않습니다.", {"color": "E6EAF2"})]], size=13, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "푸시하면 먼저 CI가 돌고, 통과해야 Render가 배포합니다. 프런트만 바꾸면 백엔드는 다시 배포되지 않도록 rootDir과 buildFilter를 걸었고, Netlify는 git diff로 변경을 확인합니다. Deploy Hook과 시크릿은 쓰지 않고 Git 연동만으로 구성했습니다. 비밀값은 저장소에 넣지 않고 Render 대시보드에서만 입력합니다.")

# ============================================================ 13. 트러블슈팅
s = prs.slides.add_slide(BLANK); header(s, 13, "12  TROUBLESHOOTING", "배포 실패에서 구조 개선까지", "홍기흥")
tcards = [
    ("01", "Render Docker 빌드 실패", RED,
     [("문제", "COPY backend ./backend → \"/backend\": not found"), ("원인", "Dockerfile이 루트 컨텍스트를 가정, Render Root Directory는 backend"),
      ("해결", "backend를 자기완비 배포 단위로 재구성: requirements·Dockerfile·.dockerignore 이동, config.py 경로를 __file__ 기준으로, AI 의존성 분리"),
      ("검증", "테스트 18건 재통과 · compose/render.yaml/CI 일괄 정리")]),
    ("02", "수정했는데 같은 에러 반복", AMB,
     [("문제", "코드를 고쳤는데 로그가 똑같음"), ("원인", "로그의 체크아웃 커밋(2c45b9a)이 수정 전 — push 누락"),
      ("해결", "push(9d3c8e1) 후 재배포, Root Directory=backend 안내"), ("교훈", "배포 에러는 로그의 커밋 해시부터 확인")]),
    ("03", "쓰기 차단 누락 위험 / UI 버그", BLUE,
     [("권한", "라우트별 체크 → 미들웨어 일괄 차단 + Mock 서버도 동일 규칙"), ("React", "useEffect가 scrollTo의 Promise를 반환 → 블록으로 수정, 규칙화"),
      ("카운터", "실시간 갱신마다 0부터 재시작 → useRef로 이전 값 유지"), ("환경", "pip cp949 → requirements 첫 줄 UTF-8 선언")])]
for i, (no, ttl, col, rows) in enumerate(tcards):
    x = 0.6 + i * 4.1
    rrect(s, x, 1.65, 3.95, 5.2, INK2, INK3)
    rect(s, x, 1.65, 3.95, 0.09, col)
    txt(s, x + 0.2, 1.88, 0.7, 0.4, no, size=20, bold=True, color=col, font=MONO)
    txt(s, x + 0.85, 1.9, 3.0, 0.5, ttl, size=14, bold=True)
    y = 2.55
    for k, v in rows:
        lines = -(-len(v) // 19)
        h = max(0.34, lines * 0.25)
        txt(s, x + 0.2, y, 0.65, 0.3, k, size=10.5, bold=True, color=col)
        txt(s, x + 0.85, y, 2.95, h, v, size=11.5, color="D5DCEA", spacing=1.15)
        y += h + 0.14
notes(s, "가장 기억에 남는 건 첫 번째입니다. Docker 빌드가 루트 컨텍스트를 가정하고 있어서 Render에서 실패했는데, 단순 설정 수정이 아니라 backend를 독립 배포 단위로 만드는 방향으로 해결했습니다. 그러고도 같은 에러가 반복돼서 로그의 커밋 해시를 보니 수정이 push되기 전 커밋이었습니다. 이후로는 로그에서 커밋부터 확인합니다. 권한 누락 위험은 미들웨어로, UI 버그는 규칙으로 문서화했습니다.")

# ============================================================ 14. 문서화
s = prs.slides.add_slide(BLANK); header(s, 14, "13  DOCUMENTATION & TEAMWORK", "코드와 문서를 같은 기준으로 관리", "이오리")
rrect(s, 0.6, 1.65, 4.6, 5.2, "070C16", INK3, r=0.04)
tree = "docs/\n├─ 산출물/\n│   ├─ 요구사항_정의서\n│   ├─ 시스템_설계서\n│   ├─ 화면_설계서\n│   ├─ AI_모델_성능_평가서\n│   ├─ 데이터_분석_보고서\n│   └─ UIUX_가이드\n├─ 프로젝트_진행일지/\n├─ md/   (작업 기록)\n├─ pdf/\n└─ site/ (GitHub Pages)"
txt(s, 0.85, 1.85, 4.2, 4.9, tree, size=12, color="BFE3FF", font=MONO, spacing=1.35)
bullets(s, 5.5, 1.75, 7.2, [
    ("요구사항 추적", "FR 번호 · 담당자 · 상태(완료 / 코드완료·학습예정)를 표로 명시"),
    ("진행일지", "일별 담당·다음 작업, 3단계 일정(프런트 → AI·분석·백엔드 → 배포·발표)"),
    ("코드–문서 동기화", "AGENTS.md 에 규칙화: 도면 좌표·Mock 서버·환경변수는 코드와 함께 수정"),
    ("정직한 표기", "AI 지표·분석 데이터는 '샘플/가상'임을 문서에 명시")], size=13.5, gap=12)
for i, (n, who) in enumerate([("박미금 (조장)", "프런트엔드 · UI/UX · 일정"), ("홍기흥", "백엔드 · 인프라 · 배포"), ("김모란", "AI 모델링 (CV)"), ("이오리", "데이터 분석 · 문서화")]):
    x = 5.5 + (i % 2) * 3.65; y = 5.05 + (i // 2) * 0.95
    col = OWNER[n.split()[0]][0]
    rrect(s, x, y, 3.5, 0.8, INK2, col, r=0.1, lw=1.5)
    txt(s, x + 0.2, y + 0.08, 3.2, 0.3, n, size=13, bold=True, color=col)
    txt(s, x + 0.2, y + 0.42, 3.2, 0.3, who, size=10.5, color=GRAY)
notes(s, "문서도 산출물이라고 생각해서 요구사항마다 담당자와 상태를 넣었습니다. 코드와 어긋나기 쉬운 규칙들은 AGENTS.md에 모아서 팀원 누구든 같은 기준으로 작업하도록 했습니다. 문서 작성은 이오리 님이 주도했고, 4명의 역할은 이렇게 나뉘어 있습니다.")

# ============================================================ 15. 회고
s = prs.slides.add_slide(BLANK); header(s, 15, "14  RETROSPECTIVE & NEXT", "잘한 점, 아쉬운 점, 그리고 다음 단계", "홍기흥")
for i, (ttl, col, items) in enumerate([
    ("잘한 점", GRN, ["시뮬레이터로 AI 학습 전 전체 파이프라인 선검증", "IaC(Blueprint) + CI 게이트 배포 자동화", "서버 미들웨어 기반 읽기 전용 방어선"]),
    ("아쉬운 점", AMB, ["AI Hub 학습·실측 지표 미완 (현재 샘플)", "분석은 가상 로그 기반", "WebSocket 단일 인스턴스 · Render 무료 슬립"])]):
    x = 0.6 + i * 6.15
    rrect(s, x, 1.65, 5.95, 2.45, INK2, INK3)
    rect(s, x, 1.65, 0.09, 2.45, col)
    txt(s, x + 0.35, 1.8, 5, 0.4, ttl, size=17, bold=True, color=col)
    bullets(s, x + 0.35, 2.35, 5.4, items, size=13, gap=8, mark=col)
txt(s, 0.6, 4.35, 6, 0.3, "ROADMAP", size=11, color=YEL, font=MONO, bold=True)
rect(s, 0.9, 5.27, 11.5, 0.05, INK3)
road = [("NEXT 1", "YOLO 학습", "metrics.json 으로 성능 평가서·관리자 화면 실측 갱신"), ("NEXT 2", "정확도·지연 검증", "점유 Accuracy/F1, 추론+전송 1초 이내"),
        ("NEXT 3", "공공데이터 연계", "주차장 API 로 주변 비교 · 요일·날씨 혼잡도 예측"), ("NEXT 4", "운영 안정화", "Redis pub/sub · 운영 DB 필수화 · 모니터링 알림")]
for i, (a, b, c) in enumerate(road):
    x = 0.6 + i * 3.05
    dot = rect(s, x + 0.2, 5.12, 0.34, 0.34, YEL if i == 0 else INK2, YEL, MSO_SHAPE.OVAL, 2)
    txt(s, x, 4.65, 2.9, 0.3, a, size=10, color=YEL, font=MONO, bold=True)
    txt(s, x, 5.6, 2.9, 0.35, b, size=14, bold=True)
    txt(s, x, 5.98, 2.85, 0.9, c, size=10.5, color=GRAY, spacing=1.25)
notes(s, "가장 아쉬운 점은 AI 지표가 아직 샘플이라는 겁니다. 학습을 마치면 같은 파이프라인으로 실측 지표를 관리자 화면까지 갱신하도록 구조는 이미 준비해 두었습니다. 다음으로는 정확도와 지연 시간을 검증하고, 공공데이터 API를 붙여 혼잡도 예측으로 확장하며, 다중 인스턴스를 위해 Redis pub/sub을 도입하고 싶습니다.")

# ============================================================ 16. Q&A
s = prs.slides.add_slide(BLANK); bg(s)
photo_bg(s, "garageChevron.jpg", 0.7)
rect(s, 0, 0, 0.16, 7.5, YEL)
txt(s, 0.8, 0.8, 8, 0.3, "Q & A  ·  LIVE DEMO", size=12, color=YEL, font=MONO, bold=True)
txt(s, 0.8, 1.3, 7.5, 1.4, [[("감사합니다", {})], [("질문을 받겠습니다", {"color": YEL})]], size=40, bold=True, spacing=1.2)
links = [("Live Demo (Mock)", "parkpick.netlify.app"), ("Live (실 API)", "parkpick.onrender.com"), ("API 문서", "parkpick-api.onrender.com/docs"), ("GitHub", "github.com/fsclass-n/parkpick")]
for i, (a, b) in enumerate(links):
    y = 3.2 + i * 0.62
    txt(s, 0.8, y, 2.2, 0.4, a, size=12, color=GRAY, anchor=MSO_ANCHOR.MIDDLE)
    txt(s, 3.0, y, 5, 0.4, b, size=14, bold=True, font=MONO, anchor=MSO_ANCHOR.MIDDLE)
rrect(s, 0.8, 5.85, 7.4, 0.95, "0A0F1A", INK3, r=0.1)
txt(s, 1.0, 5.85, 7.1, 0.95, [[("체험 계정  ", {"bold": True, "color": YEL}), ("user@parkpick.com  /  testadmin@parkpick.com (읽기 전용)", {"font": MONO, "size": 12})], [("비밀번호는 README 참조 · 최초 접속 시 서버 기동에 30~60초 소요될 수 있음", {"size": 10.5, "color": GRAY})]], size=12, anchor=MSO_ANCHOR.MIDDLE, spacing=1.35)
rrect(s, 8.9, 1.5, 3.8, 5.3, "0F1830", INK3, r=0.05)
txt(s, 9.15, 1.62, 3.4, 0.3, "예상 질문", size=12, color=YEL, bold=True)
qa = ["mAP 0.912 는 실측인가?  →  샘플 지표, 학습 후 갱신", "센서 대비 한계는?  →  야간·가림은 학습·ROI 의존",
      "WebSocket 확장은?  →  단일 인스턴스, Redis pub/sub 계획", "읽기 전용 우회 가능?  →  서버 미들웨어가 403, 테스트 검증", "번호판 개인정보?  →  마스킹 + 비식별 데이터셋"]
bullets(s, 9.15, 2.05, 3.4, qa, size=10.5, gap=6, line_h=0.3)
stripe(s)
notes(s, "발표를 마치겠습니다. 라이브 데모와 GitHub 주소는 화면에 있습니다. 질문 주시면 답변드리겠습니다. 예상 질문: mAP 수치는 샘플 지표이며 학습 후 갱신 예정, 센서 대비 한계는 야간·가림 조건과 ROI 설정 의존, WebSocket은 단일 인스턴스라 Redis pub/sub으로 확장 예정, 읽기 전용은 서버 미들웨어가 토큰의 역할로 일괄 403을 반환합니다.")

prs.save(OUT)
print("saved", os.path.abspath(OUT))
