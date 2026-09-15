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
  Languages,
  Scale,
  Smartphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../lib/i18n'

const GITHUB_URL = 'https://github.com/MrinallSamal-byte/SIH'
const LIVE_URL = 'https://aapdasetu-v3.vercel.app/'

const DOORS = [
  {
    to: '/sos',
    icon: Siren,
    titleKey: 'about.doorCitizenTitle',
    titleFallback: 'Citizens — no login, no waiting',
    descKey: 'about.doorCitizenDesc',
    descFallback:
      'Send a 1-tap SOS with your GPS, file a detailed report with photos or a voice note, find shelters, and track your rescue with a tracking ID. Everything public works without an account.',
    pointsKey: 'about.doorCitizenPoints',
    pointsFallback: ['/sos · 1-tap SOS', '/report · incident report', '/track · live tracking', '/shelters · relief camps'],
  },
  {
    to: '/volunteer',
    icon: Users,
    titleKey: 'about.doorVolunteerTitle',
    titleFallback: 'Volunteers — tasks find you',
    descKey: 'about.doorVolunteerDesc',
    descFallback:
      'Registered volunteers see only the rescues assigned to them, navigate to the spot, and mark each task resolved. No dispatch chaos, no duplicate responses.',
    pointsKey: 'about.doorVolunteerPoints',
    pointsFallback: ['/volunteer · my tasks', 'GPS navigation to victims', 'Check-in so command knows you are safe'],
  },
  {
    to: '/admin',
    icon: Building,
    titleKey: 'about.doorAdminTitle',
    titleFallback: 'Command center — one queue',
    descKey: 'about.doorAdminDesc',
    descFallback:
      'District operators triage every SOS by urgency score, assign the nearest verified volunteer or agency, broadcast alerts, and review damage claims — all from one dashboard.',
    pointsKey: 'about.doorAdminPoints',
    pointsFallback: ['/admin/live-sos · live SOS wall', '/admin/reports · dispatch queue', '/admin/communications · broadcasts'],
  },
]

const JOURNEY = [
  {
    step: '01',
    titleKey: 'about.j1Title',
    titleFallback: 'You tap SOS',
    descKey: 'about.j1Desc',
    descFallback: 'Phone number, GPS fix, landmark. The report is stored on your device first, so a network drop mid-send never loses it.',
  },
  {
    step: '02',
    titleKey: 'about.j2Title',
    titleFallback: 'It gets a score, not a queue number',
    descKey: 'about.j2Desc',
    descFallback: 'A triage formula weighs the emergency type, distress keywords, and vulnerable people involved into a 1–100 score: RED, YELLOW, or GREEN.',
  },
  {
    step: '03',
    titleKey: 'about.j3Title',
    titleFallback: 'A human dispatches help',
    descKey: 'about.j3Desc',
    descFallback: 'The command center sees it on the live map with a siren for RED cases, and assigns the nearest verified volunteer or agency.',
  },
  {
    step: '04',
    titleKey: 'about.j4Title',
    titleFallback: 'You watch it resolve',
    descKey: 'about.j4Desc',
    descFallback: 'Your tracking ID shows every milestone — registered, dispatched, resolved — with the responder on a live map.',
  },
]

const REAL_ROWS: { labelKey: string; labelFallback: string; realKey: string; realFallback: string; limitKey: string; limitFallback: string }[] = [
  {
    labelKey: 'about.hRowSos',
    labelFallback: 'SOS & incident intake',
    realKey: 'about.hRowSosReal',
    realFallback: 'Works end to end: GPS capture, offline outbox, tracking IDs, live status.',
    limitKey: 'about.hRowSosLimit',
    limitFallback: 'Caller OTP is optional — unverified numbers still dispatch.',
  },
  {
    labelKey: 'about.hRowTriage',
    labelFallback: 'Urgency triage & dispatch',
    realKey: 'about.hRowTriageReal',
    realFallback: 'Scoring, RED escalation sweep, volunteer assignment, audit trail.',
    limitKey: 'about.hRowTriageLimit',
    limitFallback: 'Scores assist humans; they never replace the dispatcher.',
  },
  {
    labelKey: 'about.hRowShelters',
    labelFallback: 'Shelter list & occupancy',
    realKey: 'about.hRowSheltersReal',
    realFallback: 'Live capacity math, gate-code self check-in, map routing.',
    limitKey: 'about.hRowSheltersLimit',
    limitFallback: 'Shelter directory is sample data until a district onboards.',
  },
  {
    labelKey: 'about.hRowFlood',
    labelFallback: 'Flood zones on safe routes',
    realKey: 'about.hRowFloodReal',
    realFallback: 'Hazard-aware detour routing around mapped polygons.',
    limitKey: 'about.hRowFloodLimit',
    limitFallback: 'Flood polygons are simulated — no live satellite feed yet.',
  },
  {
    labelKey: 'about.hRowDamage',
    labelFallback: 'Damage claims & donations',
    realKey: 'about.hRowDamageReal',
    realFallback: 'Photo intake, duplicate detection, location checks, demo receipts.',
    limitKey: 'about.hRowDamageLimit',
    limitFallback: 'AI grading needs the ML service; donations move no real money.',
  },
  {
    labelKey: 'about.hRowMesh',
    labelFallback: 'Offline mesh app',
    realKey: 'about.hRowMeshReal',
    realFallback: 'Android BLE prototype exists and pairs phone-to-phone.',
    limitKey: 'about.hRowMeshLimit',
    limitFallback: 'Early access — no gateway relay into the dashboard yet.',
  },
]

const FAQS = [
  {
    qKey: 'about.faqOfflineQ',
    qFallback: 'Does SOS work without internet?',
    aKey: 'about.faqOfflineA',
    aFallback:
      'Partly. If you loaded the site before losing signal, your SOS is saved on the device and sent automatically on reconnect. With zero signal and no loaded page, call 112 — the offline mesh app (early access) is being built for exactly that case.',
  },
  {
    qKey: 'about.faqPhoneQ',
    qFallback: 'Who sees my phone number?',
    aKey: 'about.faqPhoneA',
    aFallback:
      'The dispatcher handling your case and the volunteer assigned to it. Public pages like the safety registry show masked numbers only, and tracking pages never expose reporter details.',
  },
  {
    qKey: 'about.faqDonateQ',
    qFallback: 'Is the Donate page real money?',
    aKey: 'about.faqDonateA',
    aFallback:
      'No — it is a working prototype of the flow (funds, UPI/card forms, receipts) with simulated checkout. For real giving, use official .gov.in relief portals or confirm fund details on helpline 1070.',
  },
  {
    qKey: 'about.faqWhoQ',
    qFallback: 'Who built this, and why?',
    aKey: 'about.faqWhoA',
    aFallback:
      'AapdaSetu started as a Smart India Hackathon disaster-management project, motivated by Assam and Odisha flood seasons where helplines jam and volunteers coordinate over scattered phone calls. It is open source under the MIT license — the code, flaws and all, is on GitHub.',
  },
  {
    qKey: 'about.faqDistrictQ',
    qFallback: 'Can my district actually use this?',
    aKey: 'about.faqDistrictA',
    aFallback:
      'That is the goal. A district would need to onboard its shelter directory, volunteer roster with verification, and an SMS gateway — then the demo data gets replaced with live operations. Talk to us through the repository.',
  },
]

const STACK = ['React 19', 'TypeScript', 'Express', 'PostgreSQL + Prisma', 'FastAPI AI', 'Leaflet GIS', 'PWA offline']

export default function About() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto max-w-5xl space-y-14 pb-16">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="space-y-4 pt-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1 font-mono text-[10px] font-bold tracking-widest text-zinc-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-300">
          <FlaskConical className="h-3 w-3" />
          {t('about.protoBadge', 'SMART INDIA HACKATHON · WORKING PROTOTYPE')}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl md:text-5xl">
          {t('about.title', 'About AapdaSetu')}
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-base">
          {t(
            'about.subtitle',
            'When floods hit, helplines jam and volunteers coordinate over scattered phone calls. AapdaSetu puts the SOS, the volunteer, and the control room on one page — no logins for citizens, one queue for responders.',
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          <Link
            to="/sos"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-tight text-white transition hover:bg-red-700 active:scale-[0.98]"
          >
            <Siren className="h-4 w-4" />
            <span>{t('hero.tapSos', 'Send SOS')}</span>
          </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200"
            >
              <GitBranch className="h-4 w-4" />
              <span>{t('about.viewCode', 'View the code')}</span>
            </a>
        </div>
      </section>

      {/* ── Why we built this ────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-7">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:bg-white/[0.06] dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              {t('about.whyProblemBadge', 'The problem we kept seeing')}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-slate-100 sm:text-xl">
              {t('about.whyProblemTitle', 'In flood season, help exists — but it cannot find you')}
            </h2>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
              <p>
                {t(
                  'about.whyProblemP1',
                  'Every monsoon, the same pattern repeats across Assam and Odisha: rivers rise in the night, helplines ring busy for hours, and rescue volunteers coordinate over scattered phone calls and chat groups with no shared picture of who needs help first.',
                )}
              </p>
              <p>
                {t(
                  'about.whyProblemP2',
                  'Families repeat the same details to five different people. A stranded caller with 4% battery is asked to download an app and register. The people closest to the victims — neighbours, local volunteers — have no queue to pull from.',
                )}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-4 dark:border-white/[0.05]">
            <span className="font-mono text-[11px] font-semibold text-zinc-400 dark:text-slate-500">
              {t('about.whyProblemFoot', 'BRAHMAPUTRA BASIN · EVERY MONSOON')}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-7">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {t('about.whyShapeBadge', 'Why we built it this way')}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-slate-100 sm:text-xl">
              {t('about.whyShapeTitle', 'Every design choice answers one of those failures')}
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
              <li>
                <span className="font-bold text-zinc-800 dark:text-slate-100">{t('about.whyShape1Bold', 'No login, ever. ')}</span>
                {t('about.whyShape1', 'A panicking person on a dying phone cannot register. The SOS asks for a number and a location — nothing else.')}
              </li>
              <li>
                <span className="font-bold text-zinc-800 dark:text-slate-100">{t('about.whyShape2Bold', 'One shared queue. ')}</span>
                {t('about.whyShape2', 'Instead of five phone calls, every report lands in a single triaged list with a tracking ID the family can follow.')}
              </li>
              <li>
                <span className="font-bold text-zinc-800 dark:text-slate-100">{t('about.whyShape3Bold', 'Built for bad networks. ')}</span>
                {t('about.whyShape3', 'Reports save on the device first, sync on reconnect, and fall back to plain SMS when data dies — because towers are the first thing floods take.')}
              </li>
              <li>
                <span className="font-bold text-zinc-800 dark:text-slate-100">{t('about.whyShape4Bold', 'Open source. ')}</span>
                {t('about.whyShape4', 'A relief tool owned by one vendor dies with its funding. Any district should be able to run this itself.')}
              </li>
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-4 dark:border-white/[0.05]">
            <span className="font-mono text-[11px] font-semibold text-zinc-400 dark:text-slate-500">
              {t('about.whyShapeFoot', '4 DECISIONS · 0 SIGNUPS')}
            </span>
          </div>
        </div>
      </section>

      {/* ── Three doors ──────────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
            {t('about.doorsTitle', 'Three doors, one system')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.doorsSubtitle', 'Everyone gets the interface that matches their job. Start with whichever one is yours.')}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {DOORS.map((door) => {
            const Icon = door.icon
            return (
              <div
                key={door.to}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-slate-100 dark:text-zinc-900">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-slate-100">
                    {t(door.titleKey, door.titleFallback)}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                    {t(door.descKey, door.descFallback)}
                  </p>
                  <ul className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-white/[0.05]">
                    {door.pointsFallback.map((point) => (
                      <li key={point} className="font-mono text-[11px] text-zinc-600 dark:text-slate-400">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to={door.to}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 hover:underline dark:text-slate-200"
                >
                  <span>{t('about.openDoor', 'Open')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How a report travels ─────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
            {t('about.journeyTitle', 'How one SOS travels through the system')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.journeySubtitle', 'No magic — this is literally what the software does with your tap.')}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY.map((step) => (
            <div
              key={step.step}
              className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]"
            >
              <span className="font-mono text-sm font-black text-zinc-300 dark:text-zinc-600">{step.step}</span>
              <h3 className="mt-2 text-sm font-bold text-zinc-900 dark:text-slate-100">
                {t(step.titleKey, step.titleFallback)}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                {t(step.descKey, step.descFallback)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Honest status ────────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
            {t('about.honestTitle', 'Honest status: what works, what is still demo')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.honestSubtitle', 'A prototype that pretends everything is finished helps nobody. Here is the real state of each part.')}
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
            {REAL_ROWS.map((row) => (
              <div key={row.labelKey} className="grid gap-2 p-4 sm:grid-cols-12 sm:items-start sm:gap-4 sm:p-5">
                <div className="text-sm font-bold text-zinc-900 dark:text-slate-100 sm:col-span-3">
                  {t(row.labelKey, row.labelFallback)}
                </div>
                <div className="flex items-start gap-2 sm:col-span-5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs leading-relaxed text-zinc-600 dark:text-slate-300">
                    {t(row.realKey, row.realFallback)}
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-zinc-400 dark:text-slate-500 sm:col-span-4">
                  <span className="font-bold uppercase tracking-wider text-[10px]">Limit — </span>
                  {t(row.limitKey, row.limitFallback)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Offline mesh companion spotlight ───────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300">
            <Smartphone className="h-3.5 w-3.5" />
            {t('about.appSpotlightBadge', 'Official Android companion · SOA Mesh')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 font-mono text-[11px] font-bold text-white dark:bg-white dark:text-zinc-900">
            {t('about.meshEtaBadge', 'Early access build')}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            {t('about.meshTitle', 'When towers fall, phones become the network')}
          </h2>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t(
              'about.meshDesc',
              'SOA Mesh turns nearby Android phones into relay beacons. SOS packets and messages hop device-to-device over Bluetooth Low Energy — no towers, no SIM, no mobile data — until one of them reaches connectivity and hands the SOS to the dashboard.',
            )}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ArrowRight,
              badgeKey: 'about.meshF1Badge',
              badgeFallback: 'MULTI-HOP',
              titleKey: 'about.meshF1Title',
              titleFallback: 'Phone-to-phone relay',
              descKey: 'about.meshF1Desc',
              descFallback: 'Each phone forwards packets onward, stretching the emergency radius far beyond one Bluetooth range.',
            },
            {
              icon: Siren,
              badgeKey: 'about.meshF2Badge',
              badgeFallback: 'SOS PACKETS',
              titleKey: 'about.meshF2Title',
              titleFallback: 'SOS rides the mesh',
              descKey: 'about.meshF2Desc',
              descFallback: 'A distress beacon queued offline can travel the mesh instead of waiting for your own signal bar.',
            },
            {
              icon: Smartphone,
              badgeKey: 'about.meshF3Badge',
              badgeFallback: '0 kB DATA',
              titleKey: 'about.meshF3Title',
              titleFallback: 'Zero SIM, zero data',
              descKey: 'about.meshF3Desc',
              descFallback: 'Runs entirely over Bluetooth LE. No carrier, no recharge, no account needed on the relay phones.',
            },
            {
              icon: FlaskConical,
              badgeKey: 'about.meshF4Badge',
              badgeFallback: 'V0.1',
              titleKey: 'about.meshF4Title',
              titleFallback: 'Prototype, openly',
              descKey: 'about.meshF4Desc',
              descFallback: 'Chat between nearby phones works today; gateway relay into the dashboard is the next milestone.',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.titleKey}
                className="flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-white/[0.05] dark:bg-white/[0.03]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="rounded font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                      {t(item.badgeKey, item.badgeFallback)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-zinc-900 dark:text-slate-100">
                    {t(item.titleKey, item.titleFallback)}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-slate-400">
                    {t(item.descKey, item.descFallback)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-zinc-100 pt-5 dark:border-white/[0.06] sm:flex-row sm:items-center">
          <span className="font-mono text-xs text-zinc-400 dark:text-slate-500">
            {t('about.appVersionInfo', 'v0.1 Early Access · Android 8.0+ · Free & Open Source')}
          </span>
          <Link
            to="/app"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100"
          >
            <Smartphone className="h-4 w-4" />
            <span>{t('about.appDownloadCta', 'Get the Android Companion App')}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Project facts ────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-white/[0.08] dark:bg-[#161616] sm:p-7">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-slate-100">
          {t('about.factsTitle', 'Project facts')}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <GitBranch className="h-3.5 w-3.5" />
              <span>{t('about.factCode', 'Open source')}</span>
            </div>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-800 hover:underline dark:text-slate-200"
            >
              <span>github.com/MrinallSamal-byte/SIH</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
              <Scale className="h-3 w-3" /> MIT License
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <Globe className="h-3 w-3" />
              <span>{t('about.factLive', 'Live demo')}</span>
            </div>
            <a
              href={LIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-800 hover:underline dark:text-slate-200"
            >
              <span>aapdasetu-v3.vercel.app</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <p className="mt-0.5 text-[11px] text-zinc-500">Demo data where backend is unreachable</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <Languages className="h-3 w-3" />
              <span>{t('about.factLang', 'Languages')}</span>
            </div>
            <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-slate-200">English · हिन्दी · বাংলা · ଓଡ଼ିଆ</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">Full UI in all four, including SOS and alerts</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <Smartphone className="h-3 w-3" />
              <span>{t('about.factOffline', 'Offline story')}</span>
            </div>
            <Link to="/app" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-800 hover:underline dark:text-slate-200">
              <span>Mesh companion app</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <p className="mt-0.5 text-[11px] text-zinc-500">BLE prototype, early access</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-zinc-200/70 pt-4 dark:border-white/[0.06]">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-white px-2 py-1 font-mono text-[10px] font-semibold text-zinc-600 dark:bg-white/[0.05] dark:text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
          {t('about.faqTitle', 'Questions people actually ask')}
        </h2>
        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white dark:divide-white/[0.05] dark:border-white/[0.08] dark:bg-[#1a1a1a]">
          {FAQS.map((faq) => (
            <details key={faq.qKey} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-zinc-900 marker:hidden dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {t(faq.qKey, faq.qFallback)}
                  <span className="shrink-0 font-mono text-lg font-light leading-none text-zinc-400 transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
                {t(faq.aKey, faq.aFallback)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-zinc-900 p-8 text-center dark:bg-slate-100">
        <HeartHandshake className="h-8 w-8 text-white dark:text-zinc-900" />
        <h2 className="text-xl font-bold text-white dark:text-zinc-900">
          {t('about.ctaTitle', 'In a flood, seconds matter more than signups.')}
        </h2>
        <p className="max-w-md text-xs text-zinc-400 dark:text-zinc-600">
          {t('about.ctaDesc', 'Try the SOS flow, explore the command dashboard, or contribute relief — everything above is one tap away.')}
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <Link
            to="/sos"
            className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-extrabold uppercase text-white transition hover:bg-red-500"
          >
            {t('hero.tapSos', 'Send SOS')}
          </Link>
          <Link
            to="/donate"
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white"
          >
            {t('nav.donate', 'Donate & Relief Fund')}
          </Link>
        </div>
      </section>
    </div>
  )
}
