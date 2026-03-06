"use client";

import React, { useMemo } from "react";

/** Seeded random for consistent pattern across renders */
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/** Generates random circuit traces and nodes across the viewport */
export default function CircuitBackground() {
  const { paths, nodes } = useMemo(() => {
    const rng = seededRandom(12345);
    const paths: string[] = [];
    const nodes: { x: number; y: number }[] = [];
    const w = 1920;
    const h = 1080;

    // Generate random nodes (connection points)
    const nodeCount = 80 + Math.floor(rng() * 40);
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({ x: rng() * w, y: rng() * h });
    }

    // Draw traces between nearby nodes (circuit-style: horizontal then vertical)
    const maxDist = 180;
    const drawn = new Set<string>();
    const key = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist && dist > 20 && rng() < 0.15) {
          const k = key(i, j);
          if (drawn.has(k)) continue;
          drawn.add(k);
          const a = nodes[i];
          const b = nodes[j];
          // L-shaped trace (horizontal then vertical, like PCB)
          if (rng() < 0.5) {
            paths.push(`M${a.x} ${a.y} H${(a.x + b.x) / 2} V${b.y} H${b.x}`);
          } else {
            paths.push(`M${a.x} ${a.y} V${(a.y + b.y) / 2} H${b.x} V${b.y}`);
          }
        }
      }
    }

    // Add some standalone traces (branches)
    for (let i = 0; i < 60; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = 30 + rng() * 120;
      if (rng() < 0.5) {
        paths.push(`M${x} ${y} h${len * (rng() < 0.5 ? 1 : -1)}`);
      } else {
        paths.push(`M${x} ${y} v${len * (rng() < 0.5 ? 1 : -1)}`);
      }
    }

    // Add T-junctions and short stubs
    for (let i = 0; i < 40; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = 20 + rng() * 60;
      if (rng() < 0.5) {
        paths.push(`M${x - len / 2} ${y} h${len}`);
      } else {
        paths.push(`M${x} ${y - len / 2} v${len}`);
      }
    }

    return { paths, nodes };
  }, []);

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      viewBox={`0 0 1920 1080`}
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill="none" stroke="#00D9FF" strokeWidth="0.5" opacity="0.4">
        {paths.map((d, i) => (
          <path key={`p-${i}`} d={d} />
        ))}
        {nodes.map((n, i) => (
          <circle key={`n-${i}`} cx={n.x} cy={n.y} r="1.5" fill="#00D9FF" />
        ))}
      </g>
    </svg>
  );
}
