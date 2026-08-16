import { useEffect, useState } from 'react'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'

interface ServerCreds {
  twilioSid: string
  twilioAuthToken: string
  whatsappToken: string
  whatsappPhoneNumberId: string
}

const STORAGE_KEY = 'aapdasetu_server_creds_placeholder'
const empty: ServerCreds = {
  twilioSid: '',
  twilioAuthToken: '',
  whatsappToken: '',
  whatsappPhoneNumberId: '',
}

/**
 * System settings & API integrations.
 *
 * These credentials are SERVER-SIDE ONLY. In production they must live on the
 * Express backend (env vars / secrets manager) and be consumed there:
 *
 *   POST /api/communications/broadcast  channel: sms        -> Twilio SID + Auth Token
 *   POST /api/communications/broadcast  channel: whatsapp   -> Cloud API Token + Phone Number ID
 *
 * This page only saves them to localStorage as a DEV placeholder so you know
 * what to configure. @TODO BUILD: replace with a real backend call
 * (e.g. PATCH /api/settings) that stores them server-side — never ship tokens
 * to the browser in production.
 */
export default function Settings() {
  const { toast } = useToast()
  const [creds, setCreds] = useState<ServerCreds>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...empty, ...(JSON.parse(raw) as ServerCreds) } : empty
    } catch {
      return empty
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds))
  }, [creds])

  const set = (key: keyof ServerCreds) => (value: string) => setCreds((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">System settings & API integrations</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Admin portal for API credentials and default thresholds. Server-side credentials are NEVER bundled into the
        frontend.
      </p>

      <div className="mt-5 space-y-4">
        <Card title="SMS channel — Twilio (consumed by POST /api/communications/broadcast)">
          <div className="space-y-4">
            <Field label="Account SID">
              <Input value={creds.twilioSid} onChange={(e) => set('twilioSid')(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxx" />
            </Field>
            <Field label="Auth Token">
              <Input type="password" value={creds.twilioAuthToken} onChange={(e) => set('twilioAuthToken')(e.target.value)} placeholder="********" />
            </Field>
          </div>
        </Card>

        <Card title="WhatsApp channel — Meta Cloud API (consumed by POST /api/communications/broadcast)">
          <div className="space-y-4">
            <Field label="Cloud API Token">
              <Input type="password" value={creds.whatsappToken} onChange={(e) => set('whatsappToken')(e.target.value)} placeholder="********" />
            </Field>
            <Field label="Phone Number ID">
              <Input value={creds.whatsappPhoneNumberId} onChange={(e) => set('whatsappPhoneNumberId')(e.target.value)} placeholder="10xxxxxxx" />
            </Field>
          </div>
        </Card>

        <Card title="Admin authentication (server-side)">
          <p className="text-xs text-slate-500">
            <code>POST /api/admin/login</code> must do a bcrypt compare against a stored hash. Configure
            <code> ADMIN_EMAIL </code> and <code>ADMIN_PASSWORD_BCRYPT_HASH</code> on the backend.
          </p>
        </Card>

        <Card title="Browser-side environment">
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
            <li><code>VITE_API_URL</code> — Express backend (src/api/endpoints.ts)</li>
            <li><code>VITE_AI_URL</code> — FastAPI AI engine (src/api/ai.ts)</li>
            <li><code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> — optional realtime swap (src/hooks/useRealtime.ts)</li>
            <li><code>VITE_MAP_TILE_URL</code> / <code>VITE_MAP_ATTRIBUTION</code> — Leaflet tiles (src/components/map/LeafletMap.tsx)</li>
          </ul>
          <p className="mt-2 text-xs text-slate-400">See .env.example for the full list with where each value is used.</p>
        </Card>

        <Button onClick={() => toast('Placeholder credentials saved locally')}>Save placeholders</Button>
      </div>
    </div>
  )
}
