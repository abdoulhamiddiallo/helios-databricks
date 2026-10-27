/** Emblème HÉLIOS : le Soleil, son vent, et la Terre protégée par son champ magnétique. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="HÉLIOS">
      <defs>
        <radialGradient id="hl-sun" cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#FFE7A3" />
          <stop offset="45%" stopColor="#FFB04D" />
          <stop offset="100%" stopColor="#F2603A" />
        </radialGradient>
        <linearGradient id="hl-wind" x1="0" x2="1">
          <stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g className="spin-slow">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="22" y1="4" x2="22" y2="9" stroke="#FF8A3D" strokeWidth="2.2" strokeLinecap="round"
            transform={`rotate(${i * 30} 22 22)`} opacity={i % 2 ? 0.55 : 1} />
        ))}
      </g>
      <circle cx="22" cy="22" r="11" fill="url(#hl-sun)" />
      <path d="M33 26 C 40 30, 46 34, 52 40" stroke="url(#hl-wind)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M31 31 C 37 37, 41 41, 46 48" stroke="url(#hl-wind)" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="52" cy="48" rx="10" ry="6.5" fill="none" stroke="#2DD4BF" strokeWidth="1.4" opacity="0.8" transform="rotate(-20 52 48)" />
      <circle cx="52" cy="48" r="4.2" fill="#3B82F6" stroke="#9AD0FF" strokeWidth="1" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={42} />
      <div className="leading-none">
        <div className="text-[19px] font-semibold tracking-[0.22em] text-ink">HÉLIOS</div>
        <div className="mt-1 text-[10px] tracking-[0.2em] text-muted uppercase">Observatoire</div>
      </div>
    </div>
  );
}
