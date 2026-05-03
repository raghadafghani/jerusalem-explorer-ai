interface CityCompassLogoProps {
  size?: number;
  className?: string;
}

export function CityCompassLogo({ size = 24, className }: CityCompassLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 7l2.5 5-5 2.5L12 7z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
