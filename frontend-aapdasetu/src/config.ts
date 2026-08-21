// Central env parsing. Every credential the frontend touches lives here
// (browser-side only). Server-side credentials are handled in Settings.tsx.
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, ''),
  aiUrl: (import.meta.env.VITE_AI_URL || 'http://localhost:8080').replace(/\/$/, ''),
  /** Optional Supabase realtime swap-in — see src/hooks/useRealtime.ts */
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  /** Force mock data (demo mode) — see src/api/client.ts */
  useMockOnly: import.meta.env.VITE_USE_MOCK_ONLY === 'true',
  /** Leaflet tile layer — see src/components/map/LeafletMap.tsx */
  mapTileUrl:
    import.meta.env.VITE_MAP_TILE_URL ||
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution:
    import.meta.env.VITE_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const
