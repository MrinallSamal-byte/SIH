// Central env parsing. Every credential the frontend touches lives here
// (browser-side only). Server-side credentials are handled in Settings.tsx.
// API base URL: the backend origin root only (no /api suffix — endpoint paths
// already start with /api/v1/...). NEVER default to localhost in production
// builds: the deployed bundle would point every visitor at their own machine
// and silently degrade the whole app to demo data. In production (unset var)
// we fall back to same-origin, which works when the deploy proxies /api to
// the backend — see DEPLOYMENT.md.
function resolveApiUrl(raw: string | undefined): string {
  if (raw && raw.trim() !== '') return raw.replace(/\/$/, '')
  if (import.meta.env.PROD) return ''
  return 'http://localhost:4000'
}

export const config = {
  apiUrl: resolveApiUrl(import.meta.env.VITE_API_URL),
  aiUrl: (import.meta.env.VITE_AI_URL || 'http://localhost:8001').replace(/\/$/, ''),
  /** Optional Supabase realtime swap-in — see src/hooks/useRealtime.ts */
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  /** Firebase configuration */
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sihapdasetu',
  firebaseDatabaseUrl: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://sihapdasetu-default-rtdb.firebaseio.com',
  firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  /** Force mock data (demo mode) — see src/api/client.ts */
  useMockOnly: import.meta.env.VITE_USE_MOCK_ONLY === 'true',
  /** Leaflet tile layer — see src/components/map/LeafletMap.tsx */
  mapTileUrl:
    import.meta.env.VITE_MAP_TILE_URL ||
    'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  mapAttribution:
    import.meta.env.VITE_MAP_ATTRIBUTION || '',
} as const
