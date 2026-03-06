/**
 * Backup: JarvisNutritionIcon – plate with fork design
 * To restore: replace JarvisNutritionIcon in hub/page.tsx with this component.
 */
const JarvisNutritionIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <circle cx="24" cy="24" r="10" strokeWidth="2.25" fill="none" />
    <g transform="rotate(-135, 24, 24)">
      <line x1="24" y1="12" x2="24" y2="24" strokeWidth="2.25" />
      <line x1="22" y1="24" x2="22" y2="30" strokeWidth="2.25" />
      <line x1="24" y1="24" x2="24" y2="30" strokeWidth="2.25" />
      <line x1="26" y1="24" x2="26" y2="30" strokeWidth="2.25" />
      <line x1="22" y1="24" x2="26" y2="24" strokeWidth="2.25" />
    </g>
  </svg>
);
