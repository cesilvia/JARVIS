"use client";

// JARVIS-style cycling icon — matches hub page JarvisBikeWheelIcon (bike-wheel.svg asset)
export default function CyclingIcon({
  className = "w-20 h-20",
  style,
  stroke: strokeColor,
}: {
  className?: string;
  style?: React.CSSProperties;
  stroke?: string;
}) {
  const color = strokeColor ?? "currentColor";
  return (
    <div className={`${className} relative flex items-center justify-center`} style={style}>
      <svg viewBox="0 0 48 48" fill="none" stroke={color} className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      </svg>
      <img
        src="/assets/bike-wheel.svg"
        alt=""
        className="w-[62%] h-[62%] object-contain"
        style={{
          filter: "brightness(0) saturate(100%) invert(76%) sepia(65%) saturate(1000%) hue-rotate(155deg) brightness(104%) contrast(104%)",
        }}
      />
    </div>
  );
}
