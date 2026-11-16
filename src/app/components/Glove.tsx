// A boxing glove drawn as layered vector shading, lit like the club:
// a leather body with a key light from the upper front, a padded knuckle
// dome, a thumb lying across the front, a laced cuff with a reflective band,
// a specular highlight, stitched seams and a neon rim light.
// The left glove punches to the right; the right glove is the same drawing
// mirrored. Pure SVG, so it stays crisp at any size (it gets scaled ~10x).

const PALETTES = {
  pink: { hi: "#ffd3ec", base: "#ff3cac", mid: "#d01f80", deep: "#4d0730", rim: "#ff7cc8", band: "#ffe6f4", lace: "#2a0418" },
  blue: { hi: "#d7f6ff", base: "#2dc3ff", mid: "#127fd0", deep: "#041f4a", rim: "#7fe8ff", band: "#e6f9ff", lace: "#03142e" },
} as const;

export function Glove({ tone, mirror = false, className = "" }: { tone: keyof typeof PALETTES; mirror?: boolean; className?: string }) {
  const c = PALETTES[tone];
  const id = `g-${tone}`;
  return (
    <svg viewBox="0 0 420 360" className={className} aria-hidden role="presentation">
      <defs>
        {/* Key light from the upper front of the fist. */}
        <radialGradient id={`${id}-body`} cx="68%" cy="30%" r="78%">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="18%" stopColor={c.base} />
          <stop offset="58%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.deep} />
        </radialGradient>
        {/* The padded knuckle dome catches more light. */}
        <radialGradient id={`${id}-knuckle`} cx="62%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="25%" stopColor={c.base} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c.mid} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-thumb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.base} />
          <stop offset="55%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.deep} />
        </linearGradient>
        <linearGradient id={`${id}-cuff`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.deep} />
          <stop offset="45%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.deep} />
        </linearGradient>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.band} />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={c.rim} />
        </linearGradient>
        {/* Ambient occlusion under the thumb and at the wrist. */}
        <radialGradient id={`${id}-ao`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-rim`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <path d="M128 66 C160 26 268 16 330 50 C386 82 408 150 393 212 C381 264 340 304 276 314 L152 316 C120 316 104 294 104 262 L104 112 C104 92 112 78 128 66 Z" />
        </clipPath>
      </defs>

      <g transform={mirror ? "translate(420 0) scale(-1 1)" : undefined}>
      {/* Cuff */}
      <path d="M30 104 C30 92 40 84 54 84 L132 84 L132 304 L54 304 C40 304 30 296 30 284 Z" fill={`url(#${id}-cuff)`} />
      <rect x="30" y="150" width="102" height="34" rx="6" fill={`url(#${id}-band)`} opacity="0.92" />
      <rect x="30" y="236" width="102" height="10" rx="4" fill={c.band} opacity="0.35" />
      {/* Lacing */}
      {[104, 124, 200, 220, 268, 286].map((y) => (
        <path key={y} d={`M40 ${y} L122 ${y + 8}`} stroke={c.lace} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      ))}

      {/* Main fist */}
      <path
        d="M128 66 C160 26 268 16 330 50 C386 82 408 150 393 212 C381 264 340 304 276 314 L152 316 C120 316 104 294 104 262 L104 112 C104 92 112 78 128 66 Z"
        fill={`url(#${id}-body)`}
      />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Wrist shadow where fist meets cuff */}
        <ellipse cx="110" cy="190" rx="40" ry="150" fill={`url(#${id}-ao)`} />
        {/* Knuckle dome */}
        <ellipse cx="300" cy="120" rx="118" ry="96" fill={`url(#${id}-knuckle)`} />
        {/* Finger/palm fold */}
        <path d="M150 236 C220 258 310 252 392 222" stroke={c.deep} strokeWidth="9" fill="none" opacity="0.55" filter={`url(#${id}-rim)`} />
        {/* Shadow cast by the thumb */}
        <ellipse cx="236" cy="286" rx="120" ry="34" fill={`url(#${id}-ao)`} />
      </g>

      {/* Thumb lying across the front */}
      <path
        d="M146 226 C170 196 266 198 310 226 C334 242 326 282 290 288 C236 298 176 290 154 272 C142 262 138 240 146 226 Z"
        fill={`url(#${id}-thumb)`}
      />
      <path d="M170 222 C214 208 270 212 302 232" stroke={c.hi} strokeWidth="5" fill="none" opacity="0.45" strokeLinecap="round" />

      {/* Stitched seams */}
      <path d="M140 74 C200 40 280 36 330 62" stroke={c.hi} strokeWidth="2.5" strokeDasharray="7 7" fill="none" opacity="0.55" />
      <path d="M160 300 C220 306 290 300 340 276" stroke={c.hi} strokeWidth="2.5" strokeDasharray="7 7" fill="none" opacity="0.35" />
      <path d="M150 234 C176 210 262 212 302 236" stroke={c.hi} strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.4" />

      {/* Specular highlight on the knuckles */}
      <ellipse cx="300" cy="78" rx="62" ry="20" fill="#ffffff" opacity="0.55" filter={`url(#${id}-soft)`} transform="rotate(14 300 78)" />
      <ellipse cx="318" cy="76" rx="22" ry="7" fill="#ffffff" opacity="0.85" transform="rotate(16 318 76)" />

      {/* Neon rim light along the punching edge */}
      <path d="M330 50 C386 82 408 150 393 212 C381 264 340 304 276 314" stroke={c.rim} strokeWidth="6" fill="none" opacity="0.9" filter={`url(#${id}-rim)`} />
      <path d="M330 50 C386 82 408 150 393 212 C381 264 340 304 276 314" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.7" />
      </g>
    </svg>
  );
}
