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
      {/* Official App Logo */}
      <img
        src="/logo.png"
        alt="AapdaSetu logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[22%] object-cover drop-shadow-xs transition-transform duration-200 hover:scale-105"
      />

      {/* Optional Typography */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-base font-black tracking-tight leading-none text-slate-900 dark:text-white font-display">
            AapdaSetu
          </span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-white tracking-wider mono uppercase mt-0.5">
            {subtext || 'ICS NETWORK'}
          </span>
        </div>
      )}
    </div>
  )
}
