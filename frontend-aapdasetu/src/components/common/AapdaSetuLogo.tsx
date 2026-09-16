interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
  subtext?: string
}

export default function AapdaSetuLogo({
  size = 36,
  className = '',
  showText = false,
  subtext,
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Precision Vector Emblem — Architectural Beacon Bridge */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs transition-transform duration-200 hover:scale-105"
        role="img"
        aria-label="AapdaSetu Logo"
      >
        <defs>
          <linearGradient id="as-bg-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#09090b" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
          <radialGradient id="as-beacon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Squircle Badge Container */}
        <rect
          x="1.5"
          y="1.5"
          width="45"
          height="45"
          rx="11"
          fill="url(#as-bg-grad)"
          stroke="#27272a"
          strokeWidth="1.5"
          className="dark:stroke-white/10"
        />

        {/* Floodwaters Foundation (Aapda) */}
        <path
          d="M 10 41.5 C 13.5 40.5 16.5 42.5 20 41.2 C 22.5 40.2 25.5 40.2 28 41.2 C 31.5 42.5 34.5 40.5 38 41.5"
          stroke="#334155"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Structural Under-Deck Arch (The 'Setu' Span) */}
        <path
          d="M 14.5 37.5 C 16.5 29 31.5 29 33.5 37.5"
          stroke="#3b82f6"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Keystone Suspension Drop */}
        <line x1="24" y1="26" x2="24" y2="29.2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />

        {/* Suspension Cable Stays (Multi-Hop Mesh Connection) */}
        <path
          d="M 21.8 16.5 Q 14 20 6.5 26"
          stroke="#38bdf8"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 26.2 16.5 Q 34 20 41.5 26"
          stroke="#38bdf8"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <line x1="20.5" y1="20" x2="14" y2="26" stroke="#0ea5e9" strokeWidth="1" strokeLinecap="round" />
        <line x1="27.5" y1="20" x2="34" y2="26" stroke="#0ea5e9" strokeWidth="1" strokeLinecap="round" />

        {/* Primary 'A' Suspension Tower (AapdaSetu Monogram & Rig) */}
        <path
          d="M 12 37.5 L 22.2 13 C 22.9 11.5 25.1 11.5 25.8 13 L 36 37.5"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bridge Roadway Deck ('Setu' Lifeline Span) */}
        <line x1="6.5" y1="26" x2="41.5" y2="26" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="8.5" y1="28.5" x2="39.5" y2="28.5" stroke="#64748b" strokeWidth="1" strokeLinecap="round" />

        {/* Emergency SOS Beacon Rays */}
        <line x1="24" y1="3.5" x2="24" y2="5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="19.5" y1="5.2" x2="20.8" y2="6.6" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="28.5" y1="5.2" x2="27.2" y2="6.6" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />

        {/* Emergency Beacon Glow & Node */}
        <circle cx="24" cy="8.5" r="7" fill="url(#as-beacon-glow)" />
        <circle cx="24" cy="8.5" r="2.8" fill="#ef4444" />
        <circle cx="24" cy="8.5" r="1" fill="#ffffff" />
      </svg>

      {/* Optional Typography */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-base font-black tracking-tight leading-none text-slate-900 dark:text-slate-100 font-display">
            AapdaSetu
          </span>
          {subtext && (
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mono uppercase mt-0.5">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
