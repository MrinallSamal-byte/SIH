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
    // Report / reports
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'Report' },
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
      { event: '*', schema: 'public', table: 'reports' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'report_created' : 'report_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    // Alert / alerts
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'Alert' },
      (payload) => {
        emitRealtimeUpdate('alert_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alerts' },
      (payload) => {
        emitRealtimeUpdate('alert_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    // Shelter / shelters
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'Shelter' },
      (payload) => {
        const type =
          payload.eventType === 'INSERT'
            ? 'shelter_created'
            : payload.eventType === 'DELETE'
            ? 'shelter_deleted'
            : 'shelter_updated'
        emitRealtimeUpdate(type, (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shelters' },
      (payload) => {
        const type =
          payload.eventType === 'INSERT'
            ? 'shelter_created'
            : payload.eventType === 'DELETE'
            ? 'shelter_deleted'
            : 'shelter_updated'
        emitRealtimeUpdate(type, (payload.new as { id?: string })?.id, payload.new)
      }
    )
    // SafetyCheckin / safety_checkins
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'SafetyCheckin' },
      (payload) => {
        emitRealtimeUpdate('checkin_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'safety_checkins' },
      (payload) => {
        emitRealtimeUpdate('checkin_created', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    // MissingPerson / missing_persons
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'MissingPerson' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'missing_created' : 'missing_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'missing_persons' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'missing_created' : 'missing_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    // DamageAssessment / damage_assessments
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'DamageAssessment' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'damage_assessed' : 'damage_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'damage_assessments' },
      (payload) => {
        emitRealtimeUpdate(
          payload.eventType === 'INSERT' ? 'damage_assessed' : 'damage_updated',
          (payload.new as { id?: string })?.id,
          payload.new
        )
      }
    )
    // Volunteer / volunteers
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'Volunteer' },
      (payload) => {
        emitRealtimeUpdate('volunteer_updated', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'volunteers' },
      (payload) => {
        emitRealtimeUpdate('volunteer_updated', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    // Resource / Dispatch
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'Resource' },
      (payload) => {
        emitRealtimeUpdate('data_reset', (payload.new as { id?: string })?.id, payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'Dispatch' },
      (payload) => {
        emitRealtimeUpdate('report_updated', (payload.new as { id?: string })?.id, payload.new)
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
