import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // const backendUrl = env.VITE_API_BASE || env.VITE_BACKEND_URL
  const backendUrl="https://ridden-never-purveyor.ngrok-free.dev"
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      allowedHosts: ['.ngrok-free.app', 'localhost', '127.0.0.1', '.vercel.app', '.ngrok-free.dev'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})