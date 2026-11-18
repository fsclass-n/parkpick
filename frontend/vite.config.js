import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 환경 변수는 저장소 루트 .env 하나로 관리 (VITE_ 접두사만 번들에 포함)
export default defineConfig({
  envDir: '..',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
