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
      {/* Precision Vector Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs transition-transform duration-200 hover:scale-105"
      >
        <defs>
          <linearGradient id="as-bg-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="as-shield-grad" x1="14" y1="8" x2="34" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="as-bridge-grad" x1="8" y1="36" x2="40" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <radialGradient id="as-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Squircle Badge Container */}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="12"
          fill="url(#as-bg-grad)"
          stroke="#334155"
          strokeWidth="1.5"
          className="dark:stroke-slate-700"
        />

        {/* Outer Shield Contour */}
        <path
          d="M 24 8 L 36 13.5 C 36 24 29 32 24 35.5 C 19 32 12 24 12 13.5 L 24 8 Z"
          fill="none"
          stroke="url(#as-shield-grad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Arch - The "Setu" (Bridge) Lifeline */}
        <path
          d="M 15 32 C 18 24 30 24 33 32"
          fill="none"
          stroke="url(#as-bridge-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Bridge Suspension Connectors */}
        <line x1="20" y1="26.5" x2="20" y2="32" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.5 2" />
        <line x1="24" y1="24.8" x2="24" y2="32" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="28" y1="26.5" x2="28" y2="32" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.5 2" />

        {/* Distress Beacon Pulse Aura */}
        <circle cx="24" cy="18" r="6" fill="url(#as-glow)" />

        {/* Central Emergency Beacon / Rescue Node */}
        <circle cx="24" cy="18" r="2.8" fill="#e11d48" />
        <circle cx="24" cy="18" r="1" fill="#ffffff" />
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
