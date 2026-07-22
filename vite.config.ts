import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 👈 เพิ่มบรรทัดนี้เข้ามา
  ],
  server: {
    host: true, // 👈 เพิ่มตรงนี้ครับ
    port: 5173,
    allowedHosts: true,
  }
})