/**
 * Backup of JarvisProfileIcon (Iron Man outline, electric blue, no background).
 * To revert: replace the JarvisProfileIcon in hub/page.tsx with this component.
 */

// Profile icon: your Iron Man outline image in electric blue; SVG mask so only the outline shows (no square)
const JarvisProfileIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const blue = strokeColor || "currentColor";
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
          {/* Invert (black outline → white) then binarize so only outline is visible; no background */}
          <filter id="jarvis-profile-mask-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1" />
              <feFuncG type="discrete" tableValues="0 1" />
              <feFuncB type="discrete" tableValues="0 1" />
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
          </filter>
          <mask id="jarvis-profile-mask">
            <image
              href="/assets/ironman-helmet-outline.png"
              x="0"
              y="0"
              width="100"
              height="100"
              preserveAspectRatio="xMidYMid meet"
              filter="url(#jarvis-profile-mask-filter)"
            />
          </mask>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={blue} mask="url(#jarvis-profile-mask)" />
      </svg>
    </span>
  );
};
