import { useEffect, useRef, useState } from 'react'
import { USE_MOCK, WS_URL } from './config'
import { subscribeMock } from '../mock/server'

// 실시간 관제 채널(/ws/parking 또는 Mock 시뮬레이터)을 앱 전체에서 단일 연결로 공유
const listeners = new Set()
const statusListeners = new Set()
let connected = false
let stop = null

const setConnected = (value) => {
  connected = value
  statusListeners.forEach((cb) => cb(value))
}
const emit = (msg) => listeners.forEach((cb) => cb(msg))

function start() {
  if (USE_MOCK) {
    setConnected(true)
    const unsubscribe = subscribeMock(emit)
    return () => { unsubscribe(); setConnected(false) }
  }
  let ws, retry, ping
  let closed = false
  const connect = () => {
    ws = new WebSocket(WS_URL)
    ws.onopen = () => {
      setConnected(true)
      ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 25000)
    }
    ws.onmessage = (e) => {
      try { emit(JSON.parse(e.data)) } catch { /* 잘못된 메시지 무시 */ }
    }
    ws.onclose = () => {
      setConnected(false)
      clearInterval(ping)
      if (!closed) retry = setTimeout(connect, 3000)
    }
  }
  connect()
  return () => {
    closed = true
    clearTimeout(retry)
    clearInterval(ping)
    ws?.close()
  }
}

export function useParkingStream(onMessage) {
  const handler = useRef(onMessage)
  const [isConnected, setIsConnected] = useState(connected)
  handler.current = onMessage

  useEffect(() => {
    const listener = (msg) => handler.current?.(msg)
    listeners.add(listener)
    statusListeners.add(setIsConnected)
    if (!stop) stop = start()
    setIsConnected(connected)
    return () => {
      listeners.delete(listener)
      statusListeners.delete(setIsConnected)
      if (!listeners.size && stop) { stop(); stop = null }
    }
  }, [])
  return isConnected
}
