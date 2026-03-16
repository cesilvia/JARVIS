"use client";

import React from "react";
import Link from "next/link";

const ANIMATION_MS = 200;
const LINE_HEIGHT = 26;
const TEXT_LEFT_X = 0.08; /* label left margin */
const TEXT_RIGHT_X = 0.95; /* value right margin */
const MAX_DISPLAY_LINES = 8;

interface WedgeSummaryCardProps {
  originX: number;
  originY: number;
  angleDeg: number; // direction toward icon (0 = right, 90 = down in screen coords)
  length: number;
  wedgeAngleDeg: number; // 60-120
  moduleHref: string;
  themeColor: string;
  onNavigate: () => void;
  /** Optional summary lines (e.g. alert descriptions) shown inside the wedge */
  summaryLines?: string[];
  /** If true, render lines without bullet prefixes */
  noBullets?: boolean;
}

export default function WedgeSummaryCard({
  originX,
  originY,
  angleDeg,
  length,
  wedgeAngleDeg,
  moduleHref,
  themeColor,
  onNavigate,
  summaryLines,
  noBullets,
}: WedgeSummaryCardProps) {
  const hasSummary = summaryLines && summaryLines.length > 0;
  const isNoAlertsMessage = hasSummary && summaryLines!.length === 1 && summaryLines![0] === "No Current Alerts";
  const skipBullets = noBullets || isNoAlertsMessage;
  // Each summary line renders on its own row — no wrapping.
  // When skipBullets, split on ": " for left-label / right-value alignment.
  const displayLines: { label: string; value: string | null }[] = [];
  if (hasSummary) {
    for (const line of summaryLines!.slice(0, MAX_DISPLAY_LINES)) {
      if (skipBullets) {
        const idx = line.indexOf(": ");
        if (idx >= 0) {
          displayLines.push({ label: line.slice(0, idx), value: line.slice(idx + 2) });
        } else {
          displayLines.push({ label: line, value: null });
        }
      } else {
        displayLines.push({ label: "• " + line, value: null });
      }
    }
  }
  const lineCount = displayLines.length;
  const L = length;
  const halfAngleRad = (wedgeAngleDeg / 2) * (Math.PI / 180);
  const fontSize = Math.max(9, Math.min(L * 0.08, lineCount > 0 ? (L * 0.9) / lineCount : L * 0.08));

  // Wedge path: point at origin, two rays, rounded arc at end
  const x1 = L * Math.cos(-halfAngleRad);
  const y1 = L * Math.sin(-halfAngleRad);
  const x2 = L * Math.cos(halfAngleRad);
  const y2 = L * Math.sin(halfAngleRad);

  // Arc from (x1,y1) to (x2,y2) - the rounded end (arc along circle r=L)
  const path = `M 0 0 L ${x1} ${y1} A ${L} ${L} 0 0 1 ${x2} ${y2} Z`;

  // Rotate to point toward icon. CSS: angle 0 = east. We need rotation = angleDeg.
  // Transform: translate(origin) rotate(angle) translate(-origin) - but we're drawing in local coords
  // so we translate to origin and rotate. The path is in local coords with +x as the direction.
  const rotation = angleDeg;

  return (
    <div
      data-wedge
      className="wedge-summary-card absolute inset-0 flex items-center justify-center overflow-visible pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <Link
        href={moduleHref}
        data-wedge
        className="wedge-summary-card-link pointer-events-auto block absolute overflow-visible"
        style={{
          left: originX,
          top: originY,
          width: length * 2,
          height: length * 2,
          marginLeft: -length,
          marginTop: -length,
          overflow: "visible",
        }}
        onClick={(e) => {
          e.preventDefault();
          onNavigate();
        }}
      >
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center center",
            width: length * 2,
            height: length * 2,
            position: "relative",
            overflow: "visible",
          }}
        >
          <svg
            width={length * 2}
            height={length * 2}
            viewBox={`${-length} ${-length} ${length * 2} ${length * 2}`}
            overflow="visible"
            className="wedge-svg"
            style={{
              transformOrigin: "center center",
              animation: `wedgeSlideIn ${ANIMATION_MS}ms ease-out forwards`,
            }}
          >
          <defs>
            <linearGradient id="wedgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0.75" />
            </linearGradient>
            <filter id="wedgeGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="wedgeClip">
              <path d={path} />
            </clipPath>
          </defs>
          <path
            d={path}
            fill="url(#wedgeGradient)"
            stroke={themeColor}
            strokeWidth="1.5"
            strokeOpacity="0.8"
            filter="url(#wedgeGlow)"
          />
          {hasSummary && lineCount > 0 && (
            <g transform={`rotate(${-rotation}, ${L * 0.55}, 0)`}>
              <text
                fill="#ffffff"
                fontSize={fontSize}
                fontFamily="ui-monospace, monospace"
                style={{
                  filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                }}
              >
                {displayLines.map((row, i) => {
                  const y = (i - (lineCount - 1) / 2) * LINE_HEIGHT;
                  if (row.value !== null) {
                    return (
                      <React.Fragment key={i}>
                        <tspan x={L * TEXT_LEFT_X} y={y} textAnchor="start">{row.label}</tspan>
                        <tspan x={L * TEXT_RIGHT_X} y={y} textAnchor="end">{row.value}</tspan>
                      </React.Fragment>
                    );
                  }
                  return (
                    <tspan key={i} x={L * 0.55} y={y} textAnchor="middle">
                      {row.label}
                    </tspan>
                  );
                })}
              </text>
            </g>
          )}
        </svg>
        </div>
      </Link>
    </div>
  );
}
