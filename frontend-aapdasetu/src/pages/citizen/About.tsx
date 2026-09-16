import {
  Siren,
  Users,
  Building,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FlaskConical,
  GitBranch,
  Globe,
  HeartHandshake,
  Smartphone,
  Radio,
  WifiOff,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../lib/i18n'
import { getOverviewKPIs } from '../../api/endpoints'
import Reveal from '../../components/common/Reveal'

const GITHUB_URL = 'https://github.com/MrinallSamal-byte/SIH'
const LIVE_URL = 'https://aapdasetu-v3.vercel.app/'

type PortalTab = 'citizen' | 'volunteer' | 'admin'

interface PortalContent {
  id: PortalTab
  labelKey: string
  labelFallback: string
  roleKey: string
  roleFallback: string
  headlineKey: string
  headlineFallback: string
  summaryKey: string
  summaryFallback: string
  primaryAction: {
    to: string
    labelKey: string
    labelFallback: string
    icon: typeof Siren
  }
  routes: {
    to: string
    label: string
    desc: string
    badge?: string
  }[]
  fieldReality: string
}

const PORTAL_DATA: Record<PortalTab, PortalContent> = {
  citizen: {
    id: 'citizen',
    labelKey: 'about.tabCitizen',
    labelFallback: 'Citizens in Crisis',
    roleKey: 'about.roleCitizen',
    roleFallback: 'Zero Login · Instant Beacon',
    headlineKey: 'about.headCitizen',
    headlineFallback: 'A panicking person on 4% battery cannot create an account.',
    summaryKey: 'about.summaryCitizen',
    summaryFallback:
      'The citizen portal operates without any sign-up or verification barrier. A single tap captures sub-meter GPS, network status, and optional distress notes. If the cellular connection drops mid-send, the payload stays safe in the local device outbox and transmits the moment a signal bar returns.',
    primaryAction: {
      to: '/sos',
      labelKey: 'hero.tapSos',
      labelFallback: 'Send 1-Tap SOS',
      icon: Siren,
    },
    routes: [
      { to: '/sos', label: '/sos', desc: '1-tap emergency beacon with GPS & landmark' },
      { to: '/report', label: '/report', desc: 'Detailed incident filing with photos or voice memo' },
      { to: '/track', label: '/track', desc: 'Real-time rescue tracking using a private tracking ID' },
      { to: '/shelters', label: '/shelters', desc: 'Relief camps with live occupancy & gate codes' },
      { to: '/safe-routes', label: '/safe-routes', desc: 'Hazard-avoiding evacuation routing' },
    ],
    fieldReality:
      'In a midnight flood, asking someone for an email and OTP is fatal. AapdaSetu accepts emergency beacons immediately and lets dispatchers verify details in parallel.',
  },
  volunteer: {
    id: 'volunteer',
    labelKey: 'about.tabVolunteer',
    labelFallback: 'Field Responders',
    roleKey: 'about.roleVolunteer',
    roleFallback: 'Targeted Tasks · Zero Chaos',
    headlineKey: 'about.headVolunteer',
    headlineFallback: 'Rescuers need a clean dispatch queue, not 15 WhatsApp groups.',
    summaryKey: 'about.summaryVolunteer',
    summaryFallback:
      'Community volunteers and trained rescue teams receive targeted tasks assigned directly by the district incident commander. Each task provides direct GPS coordinates, victim contact, and medical flags. Responders navigate on-site, report progress, and mark tasks resolved without phone-call congestion.',
    primaryAction: {
      to: '/volunteer',
      labelKey: 'nav.volunteer',
      labelFallback: 'Open Volunteer Portal',
      icon: Users,
    },
    routes: [
      { to: '/volunteer', label: '/volunteer', desc: 'Assigned rescue tasks with live urgency badges' },
      { to: '/checkin', label: '/checkin', desc: 'Safety registry check-in for responder safety' },
      { to: '/missing-persons', label: '/missing-persons', desc: 'Field-level missing person bulletins' },
    ],
    fieldReality:
      'Volunteers often risk their lives going to areas already cleared by others. AapdaSetu deduplicates rescues so every squad knows exactly who is helping whom.',
  },
  admin: {
    id: 'admin',
    labelKey: 'about.tabAdmin',
    labelFallback: 'Command Center',
    roleKey: 'about.roleAdmin',
    roleFallback: 'Urgency Triage · District Radar',
    headlineKey: 'about.headAdmin',
    headlineFallback: 'A single operational picture for district disaster authorities.',
    summaryKey: 'about.summaryAdmin',
    summaryFallback:
      'The incident command dashboard aggregates every distress signal into a live GIS wall. An algorithmic triage formula scores each report from 1 to 100 based on water levels, trapped vulnerable groups, and keyword urgency. Priority RED cases trigger continuous audio alarms until assigned.',
    primaryAction: {
      to: '/admin',
      labelKey: 'nav.admin',
      labelFallback: 'Open Command Center',
      icon: Building,
    },
    routes: [
      { to: '/admin/live-sos', label: '/admin/live-sos', desc: 'Live incoming SOS stream with audio siren for RED cases' },
      { to: '/admin/reports', label: '/admin/reports', desc: 'Triage queue with algorithmic urgency scoring (1–100)' },
      { to: '/admin/communications', label: '/admin/communications', desc: 'District-wide emergency alert broadcasts' },
      { to: '/admin/shelters', label: '/admin/shelters', desc: 'Relief camp capacity & supply ledger' },
      { to: '/admin/damage', label: '/admin/damage', desc: 'AI-assisted structural damage claims review' },
    ],
    fieldReality:
      'Official helplines get hundreds of calls per hour. Algorithmic triage ensures that pregnant mothers, seniors, and rising water levels get dispatched before property damage calls.',
  },
}

const LIFECYCLE_STEPS = [
  {
    step: '01',
    phase: 'EDGE INTAKE',
    titleKey: 'about.j1Title',
    titleFallback: 'Zero-Friction Beacon',
    descKey: 'about.j1Desc',
    descFallback:
      'Phone number, sub-meter GPS fix, and immediate distress note. Saved in local browser storage first so transmission survives spotty network drops.',
    spec: 'IndexedDB Outbox · Zero Auth',
  },
  {
    step: '02',
    phase: 'TRIAGE ENGINE',
    titleKey: 'about.j2Title',
    titleFallback: 'Algorithmic Urgency Triage',
    descKey: 'about.j2Desc',
    descFallback:
      'Incoming reports pass through a 1–100 scoring algorithm assessing emergency type, trapped children/seniors, and distress keywords into RED, YELLOW, or GREEN tiers.',
    spec: 'Heuristic + NLP · SLA Watchdog',
  },
  {
    step: '03',
    phase: 'TACTICAL DISPATCH',
    titleKey: 'about.j3Title',
    titleFallback: 'Command Mobilization',
    descKey: 'about.j3Desc',
    descFallback:
      'District operators view the case on the live GIS map. RED incidents trigger an audible siren until assigned to the closest verified volunteer or NDRF unit.',
    spec: 'GIS Radar · Proximity Match',
  },
  {
    step: '04',
    phase: 'VERIFIED RESOLUTION',
    titleKey: 'about.j4Title',
    titleFallback: 'Transparent Tracking',
    descKey: 'about.j4Desc',
    descFallback:
      'The victim tracks the responder in real time using a private tracking ID. Responders confirm safety on-site, logging resolution notes into the audit trail.',
    spec: 'Live Milestone Tracking · Audit Log',
  },
]

const READINESS_MATRIX = [
  {
    capability: 'SOS & Incident Intake',
    status: 'OPERATIONAL',
    statusVariant: 'success',
    whatWorks: 'End-to-end GPS capture, local outbox queue, unique tracking IDs, and real-time status updates.',
    limitations: 'Caller OTP is optional by design so unverified phone numbers can still trigger rescue dispatch.',
  },
  {
    capability: 'Algorithmic Urgency Triage',
    status: 'OPERATIONAL',
    statusVariant: 'success',
    whatWorks: '1–100 mathematical scoring, RED alert siren escalation, proximity volunteer routing, and audit trail.',
    limitations: 'Urgency scores assist human operators; the final dispatch command remains human-in-the-loop.',
  },
  {
    capability: 'Shelter Directory & Occupancy',
    status: 'OPERATIONAL',
    statusVariant: 'success',
    whatWorks: 'Dynamic capacity tracking, gate-code self check-in, supplies ledger, and map-based navigation.',
    limitations: 'Shelter directory contains simulated data until a district disaster management authority onboards.',
  },
  {
    capability: 'Flood Zones & Safe Evacuation',
    status: 'PROTOTYPE',
    statusVariant: 'warning',
    whatWorks: 'Hazard-aware routing that automatically calculates detours around marked flood polygons.',
    limitations: 'Flood polygons are simulated demonstration boundaries awaiting live ISRO / Sentinel satellite feeds.',
  },
  {
    capability: 'Damage Assessment & Relief Funds',
    status: 'PROTOTYPE',
    statusVariant: 'warning',
    whatWorks: 'Photo intake with EXIF geolocation validation, duplicate claim detection, and simulated UPI receipts.',
    limitations: 'AI damage severity grading requires local ML service; donation checkout runs in simulated mode.',
  },
  {
    capability: 'SOA Mesh Offline Companion',
    status: 'EARLY ACCESS',
    statusVariant: 'info',
    whatWorks: 'Standalone Android application with Bluetooth Low Energy multi-hop peer-to-peer packet propagation.',
    limitations: 'Device-to-device chat works today; automatic mesh gateway relay to web dashboard is in active development.',
  },
]

const FAQS = [
  {
    qKey: 'about.faqOfflineQ',
    qFallback: 'Does SOS work when the internet is completely dead?',
    aKey: 'about.faqOfflineA',
    aFallback:
      'Yes, through a two-layer defense. If you opened the web app before losing signal, your SOS is queued in your browser\'s local IndexedDB outbox and transmits automatically the instant connectivity returns. For total blackouts with zero tower signal, we created SOA Mesh — an Android companion app that hops distress packets phone-to-phone over Bluetooth Low Energy until reaching someone with internet.',
  },
  {
    qKey: 'about.faqPhoneQ',
    qFallback: 'Who sees my phone number and location data?',
    aKey: 'about.faqPhoneA',
    aFallback:
      'Only the authenticated district dispatcher handling your case and the verified volunteer explicitly assigned to reach you. Public pages, search registries, and tracking links show strictly masked phone numbers and general landmarks to protect citizen safety.',
  },
  {
    qKey: 'about.faqDonateQ',
    qFallback: 'Is the Donate page collecting real money?',
    aKey: 'about.faqDonateA',
    aFallback:
      'No. The donation module is a working functional prototype demonstrating transparent fund allocation, UPI/card checkout UX, and auditable relief receipts. For actual monetary contributions, citizens should donate directly to the Chief Minister\'s Relief Fund or PM-CARES.',
  },
  {
    qKey: 'about.faqWhoQ',
    qFallback: 'Who built AapdaSetu, and why?',
    aKey: 'about.faqWhoA',
    aFallback:
      'AapdaSetu was developed as a Smart India Hackathon initiative by engineers inspired by the annual floods in the Brahmaputra basin (Assam) and coastal Odisha. In every flood season, official helplines experience catastrophic call congestion while grassroots volunteers lack a coordinated dispatch queue. AapdaSetu is 100% open source under the MIT license.',
  },
  {
    qKey: 'about.faqDistrictQ',
    qFallback: 'Can a district disaster management authority (DDMA) deploy this?',
    aKey: 'about.faqDistrictA',
    aFallback:
      'Yes. AapdaSetu is designed as deployable public infrastructure. A district can host the backend on government cloud infrastructure, configure their official shelter directory, import verified volunteer rosters, and connect their state SMS/VAPID gateway. Contact us through our GitHub repository.',
  },
]

const TECH_SPECS = [
  { label: 'Frontend Engine', value: 'React 19 · TypeScript · Tailwind CSS' },
  { label: 'Map & GIS Layer', value: 'Leaflet · OpenStreetMap Corridors' },
  { label: 'Command Backend', value: 'Node.js Express · PostgreSQL + Prisma' },
  { label: 'AI / ML Service', value: 'FastAPI Python · Urgency Heuristics' },
  { label: 'Offline Persistence', value: 'IndexedDB Store & Forward · PWA' },
  { label: 'Mesh Relay Protocol', value: 'Android BLE 5.0 Multi-Hop (TTL 7)' },
  { label: 'License & Access', value: 'MIT Open Source · Free Public Good' },
  { label: 'Languages', value: 'English · हिन्दी · বাংলা · ଓଡ଼ିଆ' },
]

export default function About() {
  const { t } = useLanguage()
  const [activePortal, setActivePortal] = useState<PortalTab>('citizen')

  const [liveStats, setLiveStats] = useState<{
    reports: number
    red: number
    shelters: number
    volunteers: number
    responseTime: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    getOverviewKPIs()
      .then((k) => {
        if (!cancelled) {
          setLiveStats({
            reports: Number(k.totalReports) || 0,
            red: Number(k.activeRedAlerts) || 0,
            shelters: Number(k.openShelters) || 0,
            volunteers: Number(k.availableVolunteers) || 0,
            responseTime: Number(k.avgResponseTimeMins) || 4,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const currentPortal = PORTAL_DATA[activePortal]
  const PrimaryIcon = currentPortal.primaryAction.icon

  return (
    <div className="mx-auto max-w-5xl space-y-20 pb-24 text-zinc-900 dark:text-slate-100">
      {/* ───────────────────────────────────────────────────
          1. MASTHEAD & HERO
          Clean editorial header with typographic presence
      ──────────────────────────────────────────────────── */}
      <section className="pt-6 sm:pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-mono font-semibold tracking-wider text-zinc-700 shadow-2xs dark:border-white/[0.08] dark:bg-[#181818] dark:text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            <FlaskConical className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span>{t('about.protoBadge', 'SMART INDIA HACKATHON · OPEN PUBLIC INFRASTRUCTURE')}</span>
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl text-zinc-900 dark:text-white">
            {t('about.title', 'About AapdaSetu')}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-lg">
            {t(
              'about.subtitle',
              'When floods strike in the dark, emergency helplines collapse and volunteers coordinate across disconnected phone calls. AapdaSetu unites stranded citizens, grassroots rescuers, and district commanders into a single fail-safe emergency lifeline.',
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/sos"
              className="inline-flex items-center gap-2.5 rounded-xl bg-red-600 px-6 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98]"
            >
              <Siren className="h-4 w-4" />
              <span>{t('hero.tapSos', 'Send 1-Tap SOS')}</span>
            </Link>

            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-[0.98] dark:border-white/[0.1] dark:bg-[#181818] dark:text-slate-200 dark:hover:bg-[#222]"
            >
              <Building className="h-4 w-4" />
              <span>{t('about.openCommand', 'Command Center')}</span>
            </Link>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-[0.98] dark:border-white/[0.1] dark:bg-[#181818] dark:text-slate-200 dark:hover:bg-[#222]"
            >
              <GitBranch className="h-4 w-4" />
              <span>{t('about.viewCode', 'Source Code')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────
            2. MINIMALIST OPERATIONAL TELEMETRY
            Integrated diagnostic bar instead of chunky box cards
        ──────────────────────────────────────────────────── */}
        <Reveal delayMs={100} className="mt-12">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-2xs dark:border-white/[0.08] dark:bg-[#181818]">
            <div className="grid grid-cols-2 divide-y divide-zinc-100 dark:divide-white/[0.06] sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
              <div className="p-4 sm:px-6 sm:py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                    {t('about.statReports', 'Reports Tracked')}
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-white">
                  {liveStats ? liveStats.reports.toLocaleString('en-IN') : <span className="skeleton-shimmer inline-block h-7 w-16 rounded" />}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-slate-400">All channels & mesh nodes</p>
              </div>

              <div className="p-4 sm:px-6 sm:py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    {t('about.statRed', 'Active Priority RED')}
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-red-600 dark:text-red-400">
                  {liveStats ? liveStats.red.toLocaleString('en-IN') : <span className="skeleton-shimmer inline-block h-7 w-12 rounded" />}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-slate-400">Immediate dispatch required</p>
              </div>

              <div className="p-4 sm:px-6 sm:py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                    {t('about.statShelters', 'Relief Shelters')}
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-white">
                  {liveStats ? liveStats.shelters.toLocaleString('en-IN') : <span className="skeleton-shimmer inline-block h-7 w-12 rounded" />}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-slate-400">Live capacity & supplies</p>
              </div>

              <div className="p-4 sm:px-6 sm:py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                    {t('about.statVolunteers', 'Volunteers Ready')}
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-white">
                  {liveStats ? liveStats.volunteers.toLocaleString('en-IN') : <span className="skeleton-shimmer inline-block h-7 w-12 rounded" />}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-slate-400">Verified field responders</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────────────────────────────────────────────
          3. THE FIELD REALITY & DESIGN TENETS
          Editorial storytelling with authentic contrast
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="mb-8">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
              {t('about.storyBadge', 'THE 3 AM REALITY')}
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {t('about.whyProblemTitle', 'Disasters do not fail because people do not care. They fail because the communication chain breaks.')}
            </h2>
          </div>

          <div className="grid gap-12 lg:grid-cols-12">
            <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-slate-400 lg:col-span-6 sm:text-base">
              <p>
                {t(
                  'about.whyProblemP1',
                  'Every monsoon season across the Brahmaputra basin and coastal belts, rivers surge in the dark. Official emergency helplines jam with busy signals within minutes. Grassroots volunteers and local boatmen mobilise courageously, but coordinate across disjointed phone calls and WhatsApp groups with no shared map of who needs help first.',
                )}
              </p>
              <p>
                {t(
                  'about.whyProblemP2',
                  'A stranded family on 4% phone battery is asked by conventional portals to download an app, create an account, and verify an SMS OTP. By the time the code arrives, the phone dies or the cell tower loses power. That failure is not a technical glitch — it is an architectural flaw.',
                )}
              </p>
              <div className="pt-2 font-mono text-xs font-semibold text-zinc-400 dark:text-slate-500">
                BRAHMAPUTRA BASIN & COASTAL ODISHA FIELD INSIGHTS
              </div>
            </div>

            <div className="space-y-6 lg:col-span-6">
              <div className="border-l-2 border-red-600 pl-4">
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {t('about.whyShape1Bold', '01. Zero Login, Always')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                  {t('about.whyShape1', 'A panicking victim on a dying phone cannot register. The SOS asks for a contact number and GPS fix — nothing else.')}
                </p>
              </div>

              <div className="border-l-2 border-zinc-400 pl-4 dark:border-zinc-600">
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {t('about.whyShape2Bold', '02. Single Algorithmic Queue')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                  {t('about.whyShape2', 'Instead of five scattered calls, every report enters one triaged queue with a public tracking ID the family can monitor.')}
                </p>
              </div>

              <div className="border-l-2 border-zinc-400 pl-4 dark:border-zinc-600">
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {t('about.whyShape3Bold', '03. Zero-Grid Resilience')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                  {t('about.whyShape3', 'Reports queue locally in the browser outbox, sync on reconnect, and hop phone-to-phone via Bluetooth when towers collapse.')}
                </p>
              </div>

              <div className="border-l-2 border-zinc-400 pl-4 dark:border-zinc-600">
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {t('about.whyShape4Bold', '04. Open Public Good')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                  {t('about.whyShape4', 'Disaster tech owned by private vendors disappears when funding ends. AapdaSetu is open source and self-hostable by any district.')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          4. THREE DOORS, ONE SYSTEM (INTERACTIVE SHOWCASE)
          Interactive Role Lens instead of 3 identical boxes
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
                {t('about.doorsTitle', 'THREE DOORS, ONE SYSTEM')}
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Dedicated interfaces tailored to each stakeholder
              </h2>
            </div>

            {/* Clean Segment Switcher */}
            <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs dark:border-white/[0.08] dark:bg-[#181818]">
              {(['citizen', 'volunteer', 'admin'] as PortalTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePortal(tab)}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activePortal === tab
                      ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t(PORTAL_DATA[tab].labelKey, PORTAL_DATA[tab].labelFallback)}
                </button>
              ))}
            </div>
          </div>

          {/* Active Portal Showcase Display */}
          <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-2xs dark:border-white/[0.08] dark:bg-[#181818] sm:p-8">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:bg-white/[0.06] dark:text-slate-300">
                  <span>{t(currentPortal.roleKey, currentPortal.roleFallback)}</span>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                  {t(currentPortal.headlineKey, currentPortal.headlineFallback)}
                </h3>

                <p className="text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                  {t(currentPortal.summaryKey, currentPortal.summaryFallback)}
                </p>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    FIELD PERSPECTIVE
                  </span>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 leading-relaxed">
                    {currentPortal.fieldReality}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to={currentPortal.primaryAction.to}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100"
                  >
                    <PrimaryIcon className="h-4 w-4" />
                    <span>{t(currentPortal.primaryAction.labelKey, currentPortal.primaryAction.labelFallback)}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Integrated Tools & Sub-routes */}
              <div className="flex flex-col justify-between border-t border-zinc-100 pt-6 dark:border-white/[0.06] lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0 lg:col-span-5">
                <div>
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                    TOOLS & CAPABILITIES
                  </div>
                  <div className="mt-3 divide-y divide-zinc-100 dark:divide-white/[0.05]">
                    {currentPortal.routes.map((r) => (
                      <Link
                        key={r.to}
                        to={r.to}
                        className="group flex items-center justify-between py-2.5 transition hover:opacity-80"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="font-mono text-xs font-bold text-zinc-900 group-hover:text-red-600 dark:text-slate-200 dark:group-hover:text-red-400">
                            {r.label}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500 dark:text-slate-400">
                            {r.desc}
                          </div>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-900 dark:group-hover:text-white" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.05] font-mono text-[10px] text-zinc-400 dark:text-slate-500">
                  PORTAL ACCESS · ROLE-BASED ACCESS CONTROL
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          5. THE LIFECYCLE OF AN EMERGENCY BEACON
          Connected progressive pipeline flow instead of cards
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="mb-10">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
              {t('about.lifeTitle', 'THE 4-STAGE RESPONSE LOOP')}
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {t('about.journeyTitle', 'How one SOS travels through the system')}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
              {t('about.journeySubtitle', 'Every tap is an auditable event with zero data loss, from edge device to verified resolution.')}
            </p>
          </div>

          <div className="relative">
            {/* Desktop continuous timeline connector line */}
            <div className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 bg-zinc-200 dark:bg-white/[0.1] -z-0" />

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {LIFECYCLE_STEPS.map((step) => (
                <div key={step.step} className="flex flex-col justify-between">
                  <div>
                    {/* Node marker */}
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-xs font-mono font-bold text-white ring-4 ring-white dark:bg-white dark:text-zinc-900 dark:ring-[#111111]">
                      {step.step}
                    </div>

                    <div className="mt-4">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        {step.phase}
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white sm:text-base">
                        {t(step.titleKey, step.titleFallback)}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-slate-400">
                        {t(step.descKey, step.descFallback)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-white/[0.05] font-mono text-[10px] font-semibold text-zinc-400 dark:text-slate-500">
                    {step.spec}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          6. THE TECHNOLOGICAL INNOVATION: SOA MESH
          Distinctive hardware & offline protocol spotlight
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-6 sm:p-10 dark:border-white/[0.08] dark:bg-[#161616]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-700 shadow-2xs dark:border-white/[0.08] dark:bg-[#202020] dark:text-slate-300">
                <Radio className="h-3.5 w-3.5 text-blue-500" />
                <span>{t('about.appSpotlightBadge', 'Official Android Companion · SOA Mesh')}</span>
              </div>
              <span className="font-mono text-xs font-bold text-zinc-400 dark:text-slate-500">
                {t('about.meshEtaBadge', 'Bluetooth Low Energy 5.0 · Multi-Hop')}
              </span>
            </div>

            <div className="mt-6 max-w-3xl">
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                {t('about.meshTitle', 'When cell towers collapse, consumer phones become the network')}
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                {t(
                  'about.meshDesc',
                  'Floods take out power grids and cellular base stations first. SOA Mesh turns nearby Android phones into decentralized relay nodes. Emergency SOS packets hop device-to-device across up to 7 hops over Bluetooth Low Energy with zero SIM card, zero mobile data, and zero monthly recharge — until any device touches an internet uplink.',
                )}
              </p>
            </div>

            {/* Multi-Hop Relay Schematic */}
            <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-white/[0.06] dark:bg-[#1a1a1a]">
              <div className="text-center font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500 mb-3">
                DECENTRALIZED PACKET PROPAGATION TOPOLOGY
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                    <WifiOff className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Origin Victim</div>
                    <div className="font-mono text-[10px] text-zinc-400">0 bars · No cellular</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs text-zinc-400">
                  <span className="hidden sm:inline">BLE hop</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-slate-300">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Relay Phone #1</div>
                    <div className="font-mono text-[10px] text-zinc-400">Store-and-forward</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs text-zinc-400">
                  <span className="hidden sm:inline">BLE hop</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-slate-300">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Gateway Node</div>
                    <div className="font-mono text-[10px] text-zinc-400">Edge of disaster perimeter</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs text-zinc-400">
                  <span className="hidden sm:inline">Uplink</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Command Center</div>
                    <div className="font-mono text-[10px] text-zinc-400">Incident dispatched</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('about.meshF1Badge', 'MULTI-HOP PROTOCOL')}
                </span>
                <h3 className="mt-1 text-xs font-bold text-zinc-900 dark:text-white sm:text-sm">
                  {t('about.meshF1Title', '7-Hop Device Relay')}
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 leading-relaxed">
                  {t('about.meshF1Desc', 'Each phone forwards packets onward, stretching the emergency radius far beyond single Bluetooth range.')}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('about.meshF2Badge', 'SOS PACKETS')}
                </span>
                <h3 className="mt-1 text-xs font-bold text-zinc-900 dark:text-white sm:text-sm">
                  {t('about.meshF2Title', 'SOS Rides the Mesh')}
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 leading-relaxed">
                  {t('about.meshF2Desc', 'A distress beacon queued offline travels the mesh instead of waiting for your phone to find cellular towers.')}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('about.meshF3Badge', 'ZERO CARRIER')}
                </span>
                <h3 className="mt-1 text-xs font-bold text-zinc-900 dark:text-white sm:text-sm">
                  {t('about.meshF3Title', 'Zero SIM & 0 kB Data')}
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 leading-relaxed">
                  {t('about.meshF3Desc', 'Runs purely over Bluetooth Low Energy. No active carrier, recharge, or user account required on relay nodes.')}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('about.meshF4Badge', 'CRYPTOGRAPHY')}
                </span>
                <h3 className="mt-1 text-xs font-bold text-zinc-900 dark:text-white sm:text-sm">
                  {t('about.appFeature4Title', 'Ed25519 Local Signing')}
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 leading-relaxed">
                  {t('about.appFeature4Desc', 'Signed emergency payloads ensure fail-closed cryptographic security and tamper prevention in transit.')}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-zinc-200/80 pt-6 dark:border-white/[0.08]">
              <span className="font-mono text-xs text-zinc-500 dark:text-slate-400">
                {t('about.appVersionInfo', 'v0.1 Early Access · Android 8.0+ · Free & Open Source')}
              </span>
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100"
              >
                <Smartphone className="h-4 w-4" />
                <span>{t('about.appDownloadCta', 'Get the Android Companion App')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          7. ENGINEERING TRANSPARENCY LEDGER (HONEST STATUS)
          No fake marketing: clean transparency builds deep trust
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="mb-8">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
              {t('about.honestTitle', 'ENGINEERING READINESS & BOUNDARIES')}
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Honest status: what works, and what is prototype
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
              {t('about.honestSubtitle', 'A life-safety system that exaggerates its readiness endangers people. Here is the verifiable state of each module.')}
            </p>
          </div>

          <div className="divide-y divide-zinc-200/80 border-y border-zinc-200/80 dark:divide-white/[0.08] dark:border-white/[0.08]">
            {READINESS_MATRIX.map((row) => (
              <div key={row.capability} className="py-5 grid gap-4 lg:grid-cols-12 items-baseline">
                <div className="lg:col-span-3">
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">
                    {row.capability}
                  </div>
                  <div className="mt-1">
                    {row.statusVariant === 'success' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {row.status}
                      </span>
                    )}
                    {row.statusVariant === 'warning' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <FlaskConical className="h-3 w-3" />
                        {row.status}
                      </span>
                    )}
                    {row.statusVariant === 'info' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        <Radio className="h-3 w-3" />
                        {row.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-zinc-700 dark:text-slate-300 lg:col-span-5 sm:text-sm">
                  {row.whatWorks}
                </div>

                <div className="text-xs leading-relaxed text-zinc-400 dark:text-slate-500 lg:col-span-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                    LIMITATION ·{' '}
                  </span>
                  {row.limitations}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          8. PUBLIC ROADMAP
          Priority-ordered roadmap without chunky card containers
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="mb-8">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
              {t('about.roadmapTitle', 'ENGINEERING ROADMAP')}
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Where this project goes next
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
              {t('about.roadmapSubtitle', 'Public roadmap tracked in the GitHub repository. Verified items ship in production.')}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  PHASE 01 · OPERATIONAL CORE
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>1-tap SOS intake with 1–100 urgency triage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Volunteer dispatch queue with deduplication</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>IndexedDB offline store-and-forward outbox</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Shelter gate check-in & capacity telemetry</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Full multilingual UI in 4 Indian languages</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  PHASE 02 · MESH & GATEWAYS
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>Mesh gateway relay bridge into web dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>Production telecom SMS gateway for OTP & SMS SOS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>District DDMA shelter directory & roster onboarding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>Background push delivery worker (VAPID web push)</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  PHASE 03 · REGIONAL SCALE
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <span>Live satellite SAR flood extent overlays</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <span>Native field responder mobile app for Android/iOS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <span>Multi-district federation with tenant isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <span>Additional regional language expansions</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          9. SYSTEM SPECIFICATIONS & ARCHITECTURE
          Clean technical spec sheet
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="mb-6">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
              TECHNICAL SPECIFICATIONS
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Architecture & open source foundations
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TECH_SPECS.map((spec) => (
              <div key={spec.label} className="border-t border-zinc-200/80 pt-3 dark:border-white/[0.08]">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                  {spec.label}
                </div>
                <div className="mt-1 text-xs font-bold text-zinc-900 dark:text-white">
                  {spec.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/80 pt-6 dark:border-white/[0.08]">
            <div className="flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-800 hover:underline dark:text-slate-200"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>github.com/MrinallSamal-byte/SIH</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="font-mono text-xs text-zinc-500">MIT License</span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={LIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-800 hover:underline dark:text-slate-200"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>aapdasetu-v3.vercel.app</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          10. FIELD QUESTIONS & OPERATIONAL CLARITY (FAQ)
          Clean accordion without chunky card containers
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-t border-zinc-200/80 pt-16 dark:border-white/[0.08]">
          <div className="mb-8">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
              OPERATIONAL QUESTIONS
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {t('about.faqTitle', 'Questions people actually ask')}
            </h2>
          </div>

          <div className="divide-y divide-zinc-200/80 border-y border-zinc-200/80 dark:divide-white/[0.08] dark:border-white/[0.08]">
            {FAQS.map((faq) => (
              <details key={faq.qKey} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-zinc-900 marker:hidden dark:text-white sm:text-base [&::-webkit-details-marker]:hidden">
                  <span>{t(faq.qKey, faq.qFallback)}</span>
                  <span className="ml-4 shrink-0 font-mono text-lg font-light leading-none text-zinc-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-slate-400 sm:text-sm">
                  {t(faq.aKey, faq.aFallback)}
                </p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ───────────────────────────────────────────────────
          11. MINIMALIST CLOSING CALL-TO-ACTION
          High-contrast, elegant conclusion
      ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="rounded-2xl border border-zinc-200/80 bg-zinc-900 p-8 sm:p-12 text-center text-white dark:border-white/[0.08] dark:bg-white dark:text-zinc-900">
          <HeartHandshake className="mx-auto h-8 w-8 text-red-500" />
          <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
            {t('about.ctaTitle', 'In a flood, seconds matter more than signups.')}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-zinc-400 dark:text-zinc-600 sm:text-sm">
            {t(
              'about.ctaDesc',
              'Test the 1-tap SOS intake, support disaster relief infrastructure, or deploy this infrastructure in your own municipality.',
            )}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/sos"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-red-700 active:scale-[0.98]"
            >
              <Siren className="h-4 w-4" />
              <span>{t('hero.tapSos', 'Test 1-Tap SOS')}</span>
            </Link>
            <Link
              to="/donate"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20 dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <HeartHandshake className="h-4 w-4 text-rose-400 dark:text-rose-600" />
              <span>{t('about.payToSupport', 'Pay to Support Project')}</span>
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20 dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <GitBranch className="h-4 w-4" />
              <span>{t('about.ctaContribute', 'Contribute on GitHub')}</span>
            </a>
          </div>
        </section>
      </Reveal>
    </div>
  )
}
