import json, subprocess, time, base64, urllib.request, sys, os
from websockets.sync.client import connect

OUT = os.path.join(os.path.dirname(__file__), "shots")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://localhost:5173"
proc = subprocess.Popen([CHROME, "--headless=new", "--remote-debugging-port=9333", "--user-data-dir=" + os.path.join(os.environ["TEMP"], "pp_cdp"),
                         "--hide-scrollbars", "--no-first-run", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(40):
    try:
        tabs = json.load(urllib.request.urlopen("http://localhost:9333/json")); break
    except Exception: time.sleep(0.5)
ws = connect([t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"], max_size=None)
n = 0
def call(method, **params):
    global n; n += 1; ws.send(json.dumps({"id": n, "method": method, "params": params}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == n: return m.get("result", {})
def js(expr): return call("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True).get("result", {}).get("value")
def size(w, h, mobile=False): call("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=mobile)
def go(path, wait=2.5):
    call("Page.navigate", url=BASE + path); time.sleep(wait)
def shot(name, scroll=0):
    js(f"window.scrollTo(0,{scroll})"); time.sleep(1.2)
    d = call("Page.captureScreenshot", format="jpeg", quality=85)["data"]
    open(os.path.join(OUT, name + ".jpg"), "wb").write(base64.b64decode(d)); print(name)
def click_text(t): js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes(%s))?.click()" % json.dumps(t))

call("Page.enable"); size(1440, 900)
go("/", 4); shot("home_hero"); shot("home_led", 900); shot("home_roi", 1800); shot("home_vision", 2700)
go("/login"); shot("login")
go("/guide", 3); shot("guide")
go("/find-car", 3); shot("findcar")
click_text("테스트 관리자 로그인") if False else None
go("/login"); click_text("테스트 관리자 로그인"); time.sleep(2.5)
go("/monitor", 4); shot("monitor"); shot("monitor_cctv", 900)
go("/reports", 3.5); shot("reports")
go("/admin", 3.5); shot("admin"); 
go("/admin/users", 3); shot("admin_users")
go("/admin/settings", 3); shot("admin_settings")
size(390, 844, True)
go("/", 4); shot("m_home")
js("document.querySelector('button[aria-label*=\"메뉴\"]')?.click()"); time.sleep(1); shot("m_drawer")
ws.close(); proc.kill()
