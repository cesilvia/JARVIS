/**
 * Backup: statusA – activity bars (signal/status indicator).
 * To restore: replace JarvisStatusIcon in hub/page.tsx with this component.
 */

const JarvisStatusIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
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
    {/* Outer ring – same as other JARVIS icons */}
    <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
    {/* Activity bars (left to right: short, medium, tall, medium) */}
    <line x1="16" y1="28" x2="16" y2="20" strokeWidth="2.25" />
    <line x1="22" y1="28" x2="22" y2="16" strokeWidth="2.25" />
    <line x1="28" y1="28" x2="28" y2="12" strokeWidth="2.25" />
    <line x1="34" y1="28" x2="34" y2="16" strokeWidth="2.25" />
  </svg>
);
