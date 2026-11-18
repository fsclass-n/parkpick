from app.services.masking import mask_plate


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_password_policy_on_signup(client):
    weak = client.post("/api/auth/signup", json={"email": "weak@parkpick.com", "password": "password1", "name": "약함"})
    assert weak.status_code == 422
    ok = client.post("/api/auth/signup", json={"email": "strong@parkpick.com", "password": "Strong1!x", "name": "강함"})
    assert ok.status_code == 201 and ok.json()["user"]["role"] == "user"


def test_login_with_password(client):
    assert client.post("/api/auth/login", json={"email": "user@parkpick.com", "password": "User1234!"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "user@parkpick.com", "password": "wrong"}).status_code == 401


def test_admin_key_login(client):
    assert client.post("/api/auth/admin-key-login", json={"admin_key": "nope"}).status_code == 401


def test_parking_summary_and_guidance(client):
    summary = client.get("/api/parking/summary").json()
    assert summary["total"] == 96 and summary["occupied"] + summary["empty"] == 96
    guide = client.get("/api/parking/guidance", params={"floor": "B1"}).json()
    assert guide["found"] and guide["space"]["status"] == "empty" and guide["route"][0] == {"x": 40, "y": 160}


def test_find_car(client, test_admin_headers):
    found = client.get("/api/parking/find-car", params={"plate": "12가3456"}).json()
    assert found["found"] and found["space"]["code"] == "B1-C05" and found["plate"] == "12가3456"
    masked = client.get("/api/parking/find-car", params={"plate": "12가3456"}, headers=test_admin_headers).json()
    assert masked["plate"] == "12가 ****"


def test_admin_requires_role(client, user_headers):
    assert client.get("/api/admin/users").status_code == 401
    assert client.get("/api/admin/users", headers=user_headers).status_code == 403


def test_test_admin_is_read_only(client, test_admin_headers):
    users = client.get("/api/admin/users", headers=test_admin_headers)
    assert users.status_code == 200 and "*" in users.json()[0]["email"]
    assert client.get("/api/admin/dashboard", headers=test_admin_headers).status_code == 200
    for method, path in [("patch", "/api/admin/users/1/role"), ("delete", "/api/admin/users/1"),
                         ("post", "/api/reports/generate"), ("patch", "/api/auth/me")]:
        res = client.request(method.upper(), path, json={"role": "admin"}, headers=test_admin_headers)
        assert res.status_code == 403 and res.json()["code"] == "READ_ONLY", (method, path)


def test_admin_crud_and_audit(client, admin_headers):
    users = client.get("/api/admin/users", headers=admin_headers).json()
    target = next(u for u in users if u["email"] == "strong@parkpick.com")
    res = client.patch(f"/api/admin/users/{target['id']}/role", json={"role": "admin"}, headers=admin_headers)
    assert res.status_code == 200 and res.json()["role"] == "admin"
    report = client.post("/api/reports/generate", json={"period": "daily"}, headers=admin_headers)
    assert report.status_code == 201 and report.json()["source"] == "template"
    logs = client.get("/api/admin/audit-logs", headers=admin_headers).json()
    assert {"user.role_change", "report.create"} <= {log["action"] for log in logs}


def test_dashboard_stats(client, admin_headers):
    data = client.get("/api/admin/dashboard", headers=admin_headers).json()
    assert len(data["traffic"]["hourly"]) == 24 and 0 <= data["occupancy"]["rate"] <= 1
    assert "mAP50" in data["ai"]


def test_ingest_occupancy(client):
    body = {"camera": "CCTV-B1-A", "items": [{"space": "B1-A05", "occupied": True, "plate": "99허9999", "confidence": 0.95}]}
    assert client.post("/api/ingest/occupancy", json=body).status_code == 401
    res = client.post("/api/ingest/occupancy", json=body, headers={"X-Ingest-Token": "test-ingest-token"})
    assert res.status_code == 200
    assert client.get("/api/parking/find-car", params={"plate": "99허9999"}).json()["space"]["code"] == "B1-A05"


def test_websocket(client):
    with client.websocket_connect("/ws/parking") as ws:
        assert ws.receive_json()["type"] == "hello"
        ws.send_text("ping")
        assert ws.receive_json()["type"] == "pong"


def test_mask_plate():
    assert mask_plate("123가4567") == "123가 ****"
