import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from './lib/i18n'
import { ThemeProvider } from './lib/theme'
import { ToastProvider } from './components/common/Toast'
import { LocationProvider } from './hooks/useLocation'
import App from './App'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Auto-recover from stale chunks after new production deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[AapdaSetu] Outdated module chunk detected after deployment, reloading...', event)
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <LocationProvider>
            <App />
          </LocationProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
