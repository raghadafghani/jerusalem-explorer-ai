export function CityCompassLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <clipPath id="compassCircleClip">
          <circle cx="18" cy="18" r="15.5" />
        </clipPath>
      </defs>

      {/* Outer ring */}
      <circle cx="18" cy="18" r="16.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />

      {/* Cardinal tick marks */}
      <line x1="18" y1="1.5" x2="18" y2="5.5" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="30.5" x2="18" y2="34.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1.5" y1="18" x2="5.5" y2="18" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30.5" y1="18" x2="34.5" y2="18" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />

      {/* City skyline silhouette clipped to circle */}
      <g clipPath="url(#compassCircleClip)">
        <path
          d="M2 34 L2 26 L5.5 26 L5.5 22 L8.5 22 L8.5 26 L11.5 26 L11.5 19 L14.5 19 L14.5 16 L16 16 L16 26 L18 26 L18 21 L20 21 L20 17.5 L21.5 17.5 L21.5 21 L24 21 L24 19 L26 19 L26 23 L28 23 L28 25 L30.5 25 L30.5 21 L33 21 L33 25.5 L34 25.5 L34 34 Z"
          fill="rgba(255,255,255,0.18)"
        />
        {/* Window dots on tallest buildings */}
        <rect x="14.7" y="17.5" width="1.2" height="1" rx="0.3" fill="rgba(255,255,255,0.35)" />
        <rect x="14.7" y="20" width="1.2" height="1" rx="0.3" fill="rgba(255,255,255,0.35)" />
        <rect x="20.2" y="18.5" width="1" height="1" rx="0.3" fill="rgba(255,255,255,0.35)" />
        <rect x="20.2" y="21.5" width="1" height="1" rx="0.3" fill="rgba(255,255,255,0.35)" />
      </g>

      {/* North needle — gold */}
      <path d="M18 5.5 L19.8 17.5 L18 16 L16.2 17.5 Z" fill="#F5C842" />
      {/* South needle — muted white */}
      <path d="M18 30.5 L16.2 18.5 L18 20 L19.8 18.5 Z" fill="rgba(255,255,255,0.4)" />
      {/* East needle hint */}
      <path d="M30.5 18 L18.5 16.2 L20 18 L18.5 19.8 Z" fill="rgba(255,255,255,0.28)" />
      {/* West needle hint */}
      <path d="M5.5 18 L17.5 19.8 L16 18 L17.5 16.2 Z" fill="rgba(255,255,255,0.28)" />

      {/* Center hub */}
      <circle cx="18" cy="18" r="2.2" fill="white" opacity="0.95" />
      <circle cx="18" cy="18" r="1" fill="rgba(0,0,0,0.15)" />
    </svg>
  );
}
