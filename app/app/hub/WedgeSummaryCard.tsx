"use client";

import React from "react";
import Link from "next/link";

const ANIMATION_MS = 200;
const LINE_HEIGHT = 26;
const TEXT_LEFT_X = 0.15; /* label left margin (fraction of L) */
const TEXT_LABEL_RIGHT_X = 0.32; /* right edge of label column (for label: value alignment) */
const TEXT_VALUE_LEFT_X = 0.35; /* left edge of value column */
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
  /** Optional per-line colors (same length as summaryLines) */
  summaryColors?: (string | undefined)[];
  /** Optional definitions shown in small text below each line */
  summaryDefinitions?: (string | undefined)[];
  /** Label alignment: "right" (default) or "left" */
  labelAlign?: "left" | "right";
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
  summaryColors,
  summaryDefinitions,
  labelAlign = "right",
}: WedgeSummaryCardProps) {
  const hasSummary = summaryLines && summaryLines.length > 0;
  const isNoAlertsMessage = hasSummary && summaryLines!.length === 1 && summaryLines![0] === "No Current Alerts";
  const skipBullets = noBullets || isNoAlertsMessage;
  // When skipBullets, split on ": " for left-label / right-value alignment.
  // Bullet lines wrap if too long, with continuation lines indented.
  const L = length;
  const halfAngleRad = (wedgeAngleDeg / 2) * (Math.PI / 180);
  const TEXT_CENTER = 0.6; // radial position of text center (fraction of L)
  const fontSize = Math.max(9, L * 0.08);
  const CHAR_WIDTH = 0.6 * fontSize; // approximate monospace char width
  // Available chord width at the text's radial position, with padding
  const availableWidth = 2 * L * TEXT_CENTER * Math.sin(halfAngleRad) * 0.8;
  const maxChars = Math.floor(availableWidth / CHAR_WIDTH);
  const INDENT = "   "; // continuation indent (past bullet)

  type DisplayRow = { label: string; value: string | null; color?: string; isDefinition?: boolean; parentLabelLen?: number };
  const displayLines: DisplayRow[] = [];
  const hasDefinitions = summaryDefinitions && summaryDefinitions.some(d => d);
  if (hasSummary) {
    for (let li = 0; li < Math.min(summaryLines!.length, MAX_DISPLAY_LINES); li++) {
      const line = summaryLines![li];
      const lineColor = summaryColors?.[li];
      if (skipBullets) {
        const idx = line.indexOf(": ");
        let labelLen = 0;
        if (idx >= 0) {
          labelLen = idx;
          displayLines.push({ label: line.slice(0, idx), value: line.slice(idx + 2), color: lineColor });
        } else {
          displayLines.push({ label: line, value: null, color: lineColor });
        }
        // Add definition row if provided, tracking parent label width for alignment
        if (hasDefinitions && summaryDefinitions![li]) {
          displayLines.push({ label: summaryDefinitions![li]!, value: null, isDefinition: true, parentLabelLen: labelLen });
        }
      } else {
        const bullet = "• " + line;
        if (bullet.length <= maxChars) {
          displayLines.push({ label: bullet, value: null, color: lineColor });
        } else {
          // Word-wrap: first line gets bullet, continuations get indent
          const words = line.split(" ");
          let current = "• ";
          for (const word of words) {
            const test = current + (current.length > 2 ? " " : "") + word;
            if (test.length > maxChars && current.length > 2) {
              displayLines.push({ label: current, value: null, color: lineColor });
              current = INDENT + word;
            } else {
              current = test;
            }
          }
          if (current.length > 0) {
            displayLines.push({ label: current, value: null, color: lineColor });
          }
        }
      }
    }
  }
  const lineCount = displayLines.length;
  // Adaptive line height: shrink if lines would overflow the wedge's vertical space
  const availableHeight = 2 * L * TEXT_CENTER * Math.sin(halfAngleRad) * 0.7;
  const baseLineHeight = lineCount > 1 ? Math.min(LINE_HEIGHT, availableHeight / lineCount) : LINE_HEIGHT;
  // When definitions are present, definition rows are shorter (small text)
  const lineHeight = hasDefinitions ? baseLineHeight * 0.85 : baseLineHeight;
  const defLineHeight = hasDefinitions ? baseLineHeight * 0.65 : baseLineHeight;

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
            <g transform={`rotate(${-rotation}, ${L * TEXT_CENTER}, 0)`}>
              <text
                fill="#ffffff"
                fontSize={fontSize}
                fontFamily="ui-monospace, monospace"
                style={{
                  filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                }}
              >
                {(() => {
                  // Gap between definition and next word group
                  const DEF_GAP = lineHeight * 0.9;

                  // For left-aligned mode: longest label starts at TEXT_LEFT_X,
                  // shorter labels shift left so colons align and words start at the same X
                  const labelRows = displayLines.filter(r => r.value !== null);
                  const maxLabelLen = labelRows.length > 0 ? Math.max(...labelRows.map(r => r.label.length)) : 0;
                  const labelStartX = (label: string) => {
                    let x = L * TEXT_LEFT_X - (maxLabelLen - label.length) * CHAR_WIDTH;
                    if (label === "n") x += CHAR_WIDTH * 1.0; // nudge n: right of v:
                    return x;
                  };
                  // Each row's value X: right after its own colon + 1 space
                  const rowValueX = (label: string) => {
                    return labelStartX(label) + (label.length + 2) * CHAR_WIDTH;
                  };

                  return displayLines.map((row, i) => {
                    // Compute y: accumulate heights with extra gap after definitions
                    let y = 0;
                    for (let j = 0; j < i; j++) {
                      y += displayLines[j].isDefinition ? defLineHeight : lineHeight;
                      if (displayLines[j].isDefinition && j + 1 < lineCount && !displayLines[j + 1].isDefinition) {
                        y += DEF_GAP;
                      }
                    }
                    // Center vertically
                    let totalHeight = 0;
                    for (let j = 0; j < lineCount; j++) {
                      totalHeight += displayLines[j].isDefinition ? defLineHeight : lineHeight;
                      if (displayLines[j].isDefinition && j + 1 < lineCount && !displayLines[j + 1].isDefinition) {
                        totalHeight += DEF_GAP;
                      }
                    }
                    y = y - totalHeight / 2 + (row.isDefinition ? defLineHeight : lineHeight) / 2;

                    if (row.isDefinition) {
                      // Find the parent label to align definition with its German word
                      let parentLabel = "";
                      for (let pi = i - 1; pi >= 0; pi--) {
                        if (!displayLines[pi].isDefinition && displayLines[pi].value !== null) {
                          parentLabel = displayLines[pi].label;
                          break;
                        }
                      }
                      const defX = labelAlign === "left" ? rowValueX(parentLabel) : L * TEXT_VALUE_LEFT_X;
                      return (
                        <tspan key={i} x={defX} y={y} textAnchor="start" fill="#ffffff" fontSize={fontSize * 0.7}>
                          {row.label}
                        </tspan>
                      );
                    }
                    const fill = row.color || "#ffffff";
                    if (row.value !== null) {
                      if (labelAlign === "left") {
                        return (
                          <React.Fragment key={i}>
                            <tspan x={labelStartX(row.label)} y={y} textAnchor="start" fill="#ffffff">{row.label}:</tspan>
                            <tspan x={rowValueX(row.label)} y={y} textAnchor="start" fill={fill}>{row.value}</tspan>
                          </React.Fragment>
                        );
                      }
                      return (
                        <React.Fragment key={i}>
                          <tspan x={L * TEXT_LABEL_RIGHT_X} y={y} textAnchor="end" fill="#ffffff">{row.label}:</tspan>
                          <tspan x={L * TEXT_VALUE_LEFT_X} y={y} textAnchor="start" fill={fill}>{row.value}</tspan>
                        </React.Fragment>
                      );
                    }
                    return (
                      <tspan key={i} x={skipBullets ? L * TEXT_LEFT_X : L * TEXT_CENTER} y={y} textAnchor={skipBullets ? "start" : "middle"} fill={fill}>
                        {row.label}
                      </tspan>
                    );
                  });
                })()}
              </text>
            </g>
          )}
        </svg>
        </div>
      </Link>
    </div>
  );
}
