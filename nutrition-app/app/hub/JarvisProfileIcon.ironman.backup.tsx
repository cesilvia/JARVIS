/**
 * Backup: Profile icon using ironman-helmet-blue-outline.png with SVG filter.
 * To restore: replace JarvisProfileIcon in hub/page.tsx with this component.
 */

// Profile icon: same line color (theme) and thicker stroke as other icons; white background transparent
const JarvisProfileIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const color = strokeColor || "currentColor";
  const filterId = "jarvis-profile-style";
  return (
    <span className={className} style={{ ...style, display: "inline-block", position: "relative" }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ display: "block", verticalAlign: "middle" }}
        aria-hidden
      >
        <defs>
          {/* Key out white; dilate to thicken lines (~2.25 style); recolor to theme */}
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" result="invLuma" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.333 -0.333 -0.333 0 1" />
            <feComposite in="SourceGraphic" in2="invLuma" result="keyed" operator="in" />
            <feMorphology in="keyed" result="thick" operator="dilate" radius="0.8" />
            <feFlood result="fill" floodColor={color} floodOpacity="1" />
            <feComposite in="fill" in2="thick" operator="in" />
          </filter>
        </defs>
        <image
          href="/assets/ironman-helmet-blue-outline.png"
          x="0"
          y="0"
          width="100"
          height="100"
          preserveAspectRatio="xMidYMid meet"
          filter={`url(#${filterId})`}
        />
      </svg>
    </span>
  );
};
