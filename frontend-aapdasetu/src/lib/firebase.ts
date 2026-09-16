import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase, ref, onChildAdded, onChildChanged } from 'firebase/database'
import { config } from '../config'
import { emitRealtimeUpdate } from './realtimeEventBus'

const firebaseConfig = {
  apiKey: config.firebaseApiKey,
  authDomain: config.firebaseAuthDomain || `${config.firebaseProjectId}.firebaseapp.com`,
  projectId: config.firebaseProjectId,
  databaseURL: config.firebaseDatabaseUrl || `https://${config.firebaseProjectId}-default-rtdb.firebaseio.com`,
  storageBucket: config.firebaseStorageBucket || `${config.firebaseProjectId}.firebasestorage.app`,
  messagingSenderId: config.firebaseMessagingSenderId,
  appId: config.firebaseAppId,
}

export const firebaseApp =
  config.firebaseApiKey
    ? getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
    : null

export const database = firebaseApp ? getDatabase(firebaseApp) : null

export function initFirebaseRealtime(): () => void {
  if (!database) return () => {}

  // 1. Reports listener (SOS & Citizen Incident Reports)
  const reportsRef = ref(database, 'reports')
  const unsubReportAdded = onChildAdded(reportsRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('report_created', snap.key ?? val.id, { id: snap.key, ...val })
  })
  const unsubReportChanged = onChildChanged(reportsRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('report_updated', snap.key ?? val.id, { id: snap.key, ...val })
  })

  // 2. Alerts listener
  const alertsRef = ref(database, 'alerts')
  const unsubAlertAdded = onChildAdded(alertsRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('alert_created', snap.key ?? val.id, { id: snap.key, ...val })
  })

  // 3. Shelters listener
  const sheltersRef = ref(database, 'shelters')
  const unsubShelterAdded = onChildAdded(sheltersRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('shelter_created', snap.key ?? val.id, { id: snap.key, ...val })
  })
  const unsubShelterChanged = onChildChanged(sheltersRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('shelter_updated', snap.key ?? val.id, { id: snap.key, ...val })
  })

  // 4. Volunteers listener
  const volunteersRef = ref(database, 'volunteers')
  const unsubVolunteerChanged = onChildChanged(volunteersRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('volunteer_updated', snap.key ?? val.id, { id: snap.key, ...val })
  })

  // 5. Safety Checkins listener
  const checkinsRef = ref(database, 'safety_checkins')
  const unsubCheckinAdded = onChildAdded(checkinsRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('checkin_created', snap.key ?? val.id, { id: snap.key, ...val })
  })

  // 6. Missing Persons listener
  const missingRef = ref(database, 'missing_persons')
  const unsubMissingAdded = onChildAdded(missingRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('missing_created', snap.key ?? val.id, { id: snap.key, ...val })
  })
  const unsubMissingChanged = onChildChanged(missingRef, (snap) => {
    const val = snap.val()
    if (val) emitRealtimeUpdate('missing_updated', snap.key ?? val.id, { id: snap.key, ...val })
  })

  return () => {
    unsubReportAdded()
    unsubReportChanged()
    unsubAlertAdded()
    unsubShelterAdded()
    unsubShelterChanged()
    unsubVolunteerChanged()
    unsubCheckinAdded()
    unsubMissingAdded()
    unsubMissingChanged()
  }
}
