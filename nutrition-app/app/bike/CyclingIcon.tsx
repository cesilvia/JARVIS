"use client";

// JARVIS-style cycling icon (bike wheel: rim, hub, crossed spokes) for header/navigation
export default function CyclingIcon({
  className = "w-20 h-20",
  style,
  stroke: strokeColor,
}: {
  className?: string;
  style?: React.CSSProperties;
  stroke?: string;
}) {
  const hubR = 2.5;
  const rimR = 14;
  const n = 16;
  const cross = 4;
  const spokes = Array.from({ length: n }, (_, i) => {
    const a1 = (i * 2 * Math.PI) / n;
    const a2 = ((i + cross) * 2 * Math.PI) / n;
    return (
      <line
        key={i}
        x1={24 + hubR * Math.cos(a1)}
        y1={24 - hubR * Math.sin(a1)}
        x2={24 + rimR * Math.cos(a2)}
        y2={24 - rimR * Math.sin(a2)}
        strokeWidth="1.25"
        strokeLinecap="butt"
      />
    );
  });
  return (
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
      <circle cx="24" cy="24" r={rimR} strokeWidth="2.25" />
      <circle cx="24" cy="24" r={hubR} strokeWidth="2.25" opacity="0.9" />
      {spokes}
    </svg>
  );
}
