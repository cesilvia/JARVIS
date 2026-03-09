"use client";

import React from "react";
import Link from "next/link";

const ANIMATION_MS = 200;
const MAX_CHARS_PER_LINE = 12; /* wrap earlier so full words (e.g. nutrition) stay visible inside wedge */
const LINE_HEIGHT = 20;
const TEXT_LEFT_X = 0.2; /* bullet close to left margin of wedge */
/* Continuation indent = width of "• " in same font so wrap lines align under first word */
const BULLET_SPACE_EM = 1.2; /* approx. 2 chars in monospace */
const MAX_DISPLAY_LINES = 8;

/** Break text into lines that fit within the wedge width */
function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

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
}: WedgeSummaryCardProps) {
  const hasSummary = summaryLines && summaryLines.length > 0;
  const isNoAlertsMessage = hasSummary && summaryLines!.length === 1 && summaryLines![0] === "No Current Alerts";
  // Build wrapped lines: first line of each alert has "• ", continuation lines align with text
  const displayLines: { text: string; isContinuation: boolean }[] = [];
  if (hasSummary) {
    for (const line of summaryLines!.slice(0, 5)) {
      const prefixed = isNoAlertsMessage ? line : "• " + line;
      const wrapped = wrapLine(prefixed, MAX_CHARS_PER_LINE);
      wrapped.forEach((text, i) => {
        displayLines.push({ text, isContinuation: !isNoAlertsMessage && i > 0 });
      });
      if (displayLines.length >= MAX_DISPLAY_LINES) break;
    }
  }
  const lineCount = Math.min(displayLines.length, MAX_DISPLAY_LINES);
  const L = length;
  const halfAngleRad = (wedgeAngleDeg / 2) * (Math.PI / 180);
  const fontSize = Math.max(9, Math.min(L * 0.08, (L * 0.9) / lineCount));
  const continuationIndent = fontSize * BULLET_SPACE_EM; /* align under first word */

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
        className="wedge-summary-card-link pointer-events-auto block absolute"
        style={{
          left: originX,
          top: originY,
          width: length * 2,
          height: length * 2,
          marginLeft: -length,
          marginTop: -length,
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
          }}
        >
          <svg
            width={length * 2}
            height={length * 2}
            viewBox={`${-length} ${-length} ${length * 2} ${length * 2}`}
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
            <g clipPath="url(#wedgeClip)" transform={`rotate(${-rotation}, ${L * 0.5}, 0)`}>
              <text
                x={isNoAlertsMessage ? L * 0.5 : L * TEXT_LEFT_X}
                y={0}
                textAnchor={isNoAlertsMessage ? "middle" : "start"}
                fill="#ffffff"
                fontSize={fontSize}
                fontFamily="ui-monospace, monospace"
                style={{
                  filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                }}
              >
                {displayLines.slice(0, MAX_DISPLAY_LINES).map((row, i) => {
                  const x = isNoAlertsMessage ? L * 0.5 : (row.isContinuation ? L * TEXT_LEFT_X + continuationIndent : L * TEXT_LEFT_X);
                  const y = (i - (lineCount - 1) / 2) * LINE_HEIGHT;
                  return (
                    <tspan key={i} x={x} y={y}>
                      {row.text}
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
