import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: the browser only ever calls relative `/api/...` and `/ai/...`
// paths. Vite forwards them to your backend servers (override via .env.local).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000'
  const aiUrl = env.VITE_AI_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'leaflet', 'react-leaflet', 'lucide-react', 'recharts'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            leaflet: ['leaflet', 'react-leaflet'],
            recharts: ['recharts'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        // @TODO BUILD: point VITE_API_URL at your Express server (see src/api/endpoints.ts)
        '/api': { target: apiUrl, changeOrigin: true },
        // @TODO BUILD: point VITE_AI_URL at your FastAPI AI engine (see src/api/ai.ts)
        '/ai': { target: aiUrl, changeOrigin: true },
      },
    },
  }
})
