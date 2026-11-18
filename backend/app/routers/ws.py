from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..realtime import manager

router = APIRouter()


@router.websocket("/ws/parking")
async def parking_ws(ws: WebSocket):
    await manager.connect(ws)
    try:
        await ws.send_json({"type": "hello", "message": "parkpick 실시간 관제 채널에 연결되었습니다."})
        while True:
            if await ws.receive_text() == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(ws)
