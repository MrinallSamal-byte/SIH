import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { emitRealtimeUpdate } from './realtimeEventBus'

export const supabase =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null

export function initSupabaseRealtime(): () => void {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('aapdasetu-public-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'report_created' : 'report_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alerts' },
      (payload) => {
        emitRealtimeUpdate('alert_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shelters' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'shelter_created' : 'shelter_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'safety_checkins' },
      (payload) => {
        emitRealtimeUpdate('checkin_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'missing_persons' },
      (payload) => {
        emitRealtimeUpdate('missing_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'damage_assessments' },
      (payload) => {
        emitRealtimeUpdate('damage_assessed', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[aapdasetu] Connected to Supabase Realtime WebSocket successfully')
      }
    })

  return () => {
    if (supabase) {
      void supabase.removeChannel(channel)
    }
  }
}
