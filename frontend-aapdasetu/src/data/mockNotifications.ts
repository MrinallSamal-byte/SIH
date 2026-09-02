export interface NotificationItem {
  id: string
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: 'evacuation' | 'dispatch' | 'shelter' | 'supplies' | 'reunion' | 'weather' | 'infrastructure' | 'medical' | 'ops'
  targetArea?: string
  createdAt: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  role?: 'citizen' | 'admin' | 'volunteer' | 'all'
}

const STORAGE_KEY_CITIZEN_NOTIFS = 'aapdasetu_citizen_notifications_v8'
const STORAGE_KEY_ADMIN_NOTIFS = 'aapdasetu_admin_notifications_v8'

/**
 * Curated, high-fidelity dummy notifications representing genuine emergency operations
 * in a national disaster management & response context.
 */
export function getInitialCitizenNotifications(): NotificationItem[] {
  const now = Date.now()

  return [
    {
      id: 'notif-cit-001',
      title: 'Critical Inundation Warning — River Level Breached +1.8m',
      message: 'Yamuna downstream water discharge has surpassed 95,000 cusecs. Immediate multi-story evacuation active for all riverbank settlements in Sector 4 & Ward 12. Move to designated high ground.',
      severity: 'critical',
      category: 'evacuation',
      targetArea: 'Sector 4, Yamuna Lowlands & Ward 12',
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      read: false,
      actionUrl: '/safe-routes',
      actionLabel: 'View Safe Routes',
      role: 'citizen',
    },
    {
      id: 'notif-cit-002',
      title: 'NDRF Air-Drop & Quick Response Boat Convoy #12 Deployed',
      message: '14 motorized rescue boats (IRBs) and drone thermal reconnaissance units mobilized to evacuate 42 stranded residents on high terraces in Sector 7. Helipad staging secured.',
      severity: 'critical',
      category: 'dispatch',
      targetArea: 'Sector 7, North Embankment',
      createdAt: new Date(now - 7 * 60 * 1000).toISOString(), // 7 minutes ago
      read: false,
      actionUrl: '/track',
      actionLabel: 'Track Incident Status',
      role: 'citizen',
    },
    {
      id: 'notif-cit-003',
      title: 'Relief Camp #08 at 94% Capacity — Diverting Evacuees',
      message: 'St. Xavier Community Stadium camp is nearing maximum capacity (564/600 beds). Incoming evacuees are being redirected to Bal Bhavan Relief Hub (1.4 km away, 400 beds available).',
      severity: 'warning',
      category: 'shelter',
      targetArea: 'St. Xavier Stadium, Sector 3',
      createdAt: new Date(now - 16 * 60 * 1000).toISOString(), // 16 minutes ago
      read: false,
      actionUrl: '/shelters',
      actionLabel: 'Find Open Shelters',
      role: 'citizen',
    },
    {
      id: 'notif-cit-004',
      title: 'Clean Drinking Water Tankers & Food Rations Stationed',
      message: '4 municipal drinking water tankers (20,000L capacity) and 1,200 packaged hot meals stationed at Ward 9 Community Hall. Baby infant food packets and ORS electrolytes available.',
      severity: 'info',
      category: 'supplies',
      targetArea: 'Ward 9 & 11 Relief Distribution Hub',
      createdAt: new Date(now - 32 * 60 * 1000).toISOString(), // 32 minutes ago
      read: true,
      actionUrl: '/contacts',
      actionLabel: 'Emergency Helplines',
      role: 'citizen',
    },
    {
      id: 'notif-cit-005',
      title: 'Biometric Safety Match: 3 Missing Children Safely Reunited',
      message: 'Three children reported separated during Sector 5 flooding have been safely matched via facial recognition at Central Relief Desk #2 and reunited with their parents.',
      severity: 'success',
      category: 'reunion',
      targetArea: 'District Central Relief Desk #2',
      createdAt: new Date(now - 55 * 60 * 1000).toISOString(), // 55 minutes ago
      read: true,
      actionUrl: '/missing-persons',
      actionLabel: 'Safety Registry',
      role: 'citizen',
    },
    {
      id: 'notif-cit-006',
      title: 'IMD Weather Warning: Gale Winds & High-Tide Surge',
      message: 'Squally winds 75–85 km/h gusting to 95 km/h forecasted over the next 3 hours. Citizens are strongly advised to remain indoors, avoid coastal promenades, and secure tin roofings.',
      severity: 'warning',
      category: 'weather',
      targetArea: 'Coastal Belt & Surrounding Districts',
      createdAt: new Date(now - 1.5 * 3600 * 1000).toISOString(), // 1.5 hours ago
      read: true,
      actionUrl: '/about',
      actionLabel: 'Safety Guidelines',
      role: 'citizen',
    },
    {
      id: 'notif-cit-007',
      title: 'Emergency Cellular Tower (COW) Online — Network Restored',
      message: 'Department of Telecommunications deployed mobile Cell-on-Wheels tower restoring 4G connectivity across Sector 8 & Sector 10. Emergency toll-free calls to 112 and 1070 active.',
      severity: 'info',
      category: 'infrastructure',
      targetArea: 'Sector 8 & Sector 10 Flood Zones',
      createdAt: new Date(now - 2.5 * 3600 * 1000).toISOString(), // 2.5 hours ago
      read: true,
      actionUrl: '/contacts',
      actionLabel: 'View Helplines',
      role: 'citizen',
    },
    {
      id: 'notif-cit-008',
      title: '24/7 Rapid Mobile Medical Unit & Pediatric Clinic Operational',
      message: 'Specialist emergency trauma physicians and nurses on duty with rabies/tetanus prophylaxis, IV fluids, clean dressing supplies, and chronic medication refills at Camp #14.',
      severity: 'info',
      category: 'medical',
      targetArea: 'Camp #14, Greenfield Sports Ground',
      createdAt: new Date(now - 4 * 3600 * 1000).toISOString(), // 4 hours ago
      read: true,
      actionUrl: '/pfa-chat',
      actionLabel: 'PFA Crisis Support',
      role: 'citizen',
    },
  ]
}

/**
 * Realistic operational notifications for the Incident Commander & Emergency Admin Dispatchers.
 */
export function getInitialAdminNotifications(): NotificationItem[] {
  const now = Date.now()

  return [
    {
      id: 'notif-adm-001',
      title: 'Urgent SOS: 4 Trapped on Rooftop (Water 1.8m)',
      message: 'High-priority SOS trigger from Ward 8, Gali No. 4. Elderly patient requires insulin and oxygen support. AI Triage Score: 96 (Priority: RED). Report #TRK-8921.',
      severity: 'critical',
      category: 'ops',
      targetArea: 'Ward 8, Sector 4',
      createdAt: new Date(now - 3 * 60 * 1000).toISOString(),
      read: false,
      actionUrl: '/admin/live-sos',
      actionLabel: 'Open Live SOS Desk',
      role: 'admin',
    },
    {
      id: 'notif-adm-002',
      title: 'Critical Infrastructure: Hospital Backup Generator Fuel Low',
      message: 'Apex District Hospital reports diesel generator reserves down to 3 hours due to road inundation. Urgent tanker escort required.',
      severity: 'critical',
      category: 'ops',
      targetArea: 'District Hospital Zone, Sector 11',
      createdAt: new Date(now - 9 * 60 * 1000).toISOString(),
      read: false,
      actionUrl: '/admin/reports',
      actionLabel: 'Dispatch Emergency Convoy',
      role: 'admin',
    },
    {
      id: 'notif-adm-003',
      title: 'Shelter Capacity Alert: Camp #08 Reached 94% Threshold',
      message: 'Occupancy is 564 / 600 beds. Automated overflow routing activated to divert incoming buses to Camp #09 (Bal Bhavan Stadium).',
      severity: 'warning',
      category: 'shelter',
      targetArea: 'Camp #08, St. Xavier Stadium',
      createdAt: new Date(now - 22 * 60 * 1000).toISOString(),
      read: false,
      actionUrl: '/admin/shelters',
      actionLabel: 'Manage Shelter Allocations',
      role: 'admin',
    },
    {
      id: 'notif-adm-004',
      title: 'Volunteer Muster: 18 SDRF Rescue Divers Checked In',
      message: '18 specialized divers and boat operators logged on duty at Base Camp Alpha. Assigned to Sector 4 and Sector 7 water operations.',
      severity: 'info',
      category: 'dispatch',
      targetArea: 'Base Alpha Staging Area',
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      read: true,
      actionUrl: '/admin/volunteers',
      actionLabel: 'View Volunteer Roster',
      role: 'admin',
    },
    {
      id: 'notif-adm-005',
      title: 'Aerial UAV Survey: Inundation Ortho-Mosaic Map Uploaded',
      message: 'Drone reconnaissance squadron completed 4K multispectral run over Eastern Embankment. AI damage estimation model processing 184 structures.',
      severity: 'info',
      category: 'ops',
      targetArea: 'Eastern Embankment Basin',
      createdAt: new Date(now - 1.8 * 3600 * 1000).toISOString(),
      read: true,
      actionUrl: '/admin/damage',
      actionLabel: 'Review AI Damage Map',
      role: 'admin',
    },
  ]
}

/**
 * Local storage persistence helper for notifications
 */
export function loadNotifications(role: 'citizen' | 'admin'): NotificationItem[] {
  if (typeof window === 'undefined') {
    return role === 'citizen' ? getInitialCitizenNotifications() : getInitialAdminNotifications()
  }

  const key = role === 'citizen' ? STORAGE_KEY_CITIZEN_NOTIFS : STORAGE_KEY_ADMIN_NOTIFS
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore json parse error
  }

  const initial = role === 'citizen' ? getInitialCitizenNotifications() : getInitialAdminNotifications()
  try {
    localStorage.setItem(key, JSON.stringify(initial))
  } catch {
    // ignore
  }
  return initial
}

export function saveNotifications(role: 'citizen' | 'admin', list: NotificationItem[]) {
  if (typeof window === 'undefined') return
  const key = role === 'citizen' ? STORAGE_KEY_CITIZEN_NOTIFS : STORAGE_KEY_ADMIN_NOTIFS
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // ignore
  }
}

/**
 * Realistic pool of incoming simulated live events for dynamic demonstration
 */
export const SIMULATED_INCOMING_EVENTS: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[] = [
  {
    title: 'NDRF Rescue Skiff Squad #6 En Route to Lowland Ward 14',
    message: 'Rescue boat squadron dispatched with survival life-rafts and high-calorie energy bars for 18 trapped residents.',
    severity: 'critical',
    category: 'dispatch',
    targetArea: 'Ward 14, Riverside Colony',
    actionUrl: '/track',
    actionLabel: 'Track Dispatch',
    role: 'citizen',
  },
  {
    title: 'New Emergency Drinking Water Station Opened',
    message: 'Public Health Engineering Dept installed 3 mobile RO filtration units providing 10,000L clean water daily at Gandhi Square.',
    severity: 'info',
    category: 'supplies',
    targetArea: 'Gandhi Memorial Square, Sector 2',
    actionUrl: '/contacts',
    actionLabel: 'Relief Contacts',
    role: 'citizen',
  },
  {
    title: 'Bridge Structural Advisory — NH-48 Bypass Closed',
    message: 'Panchvati Old Bridge closed to vehicular traffic as precautionary measure due to surging river currents. Follow diversion route.',
    severity: 'warning',
    category: 'infrastructure',
    targetArea: 'Panchvati Bypass, NH-48',
    actionUrl: '/safe-routes',
    actionLabel: 'View Safe Routes',
    role: 'citizen',
  },
  {
    title: 'Safety Check-in Milestone: 140 Citizens Marked Safe',
    message: '140 residents in Sector 6 marked themselves safe within the last 30 minutes via Aadhaar & Mobile OTP verification.',
    severity: 'success',
    category: 'reunion',
    targetArea: 'Sector 6 Relief Ward',
    actionUrl: '/checkin',
    actionLabel: 'Family Check-in',
    role: 'citizen',
  },
  {
    title: 'Urgent Medical Triage: Snakebite Antivenom Transferred',
    message: 'Civil Hospital received 120 vials of polyvalent antivenom from State Medical Depots; mobile medical ambulances equipped.',
    severity: 'info',
    category: 'medical',
    targetArea: 'Civil District Hospital',
    actionUrl: '/pfa-chat',
    actionLabel: 'First-Aid Guidance',
    role: 'citizen',
  },
]
