/**
 * Backup: JarvisTaskManagerIcon – task1 (clipboard with list and checkmark)
 * To restore: replace JarvisTaskManagerIcon in hub/page.tsx with this component.
 */
const JarvisTaskManagerIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
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
    {/* Clipboard: top bar + list lines + checkmark */}
    <rect x="14" y="12" width="20" height="24" rx="1" strokeWidth="2.25" fill="none" />
    <rect x="18" y="10" width="12" height="4" rx="0.5" strokeWidth="2.25" fill="none" />
    <line x1="18" y1="22" x2="34" y2="22" strokeWidth="2.25" />
    <line x1="18" y1="28" x2="34" y2="28" strokeWidth="2.25" />
    <line x1="18" y1="34" x2="28" y2="34" strokeWidth="2.25" />
    <path d="M16 20 L18 22 L22 18" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
