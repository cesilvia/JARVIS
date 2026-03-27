"use client";

import React from "react";
import Link from "next/link";

const ANIMATION_MS = 200;
const LINE_HEIGHT = 26;
const MAX_DISPLAY_LINES = 8;

interface WedgeSummaryCardProps {
  originX: number;
  originY: number;
  angleDeg: number;
  length: number;
  wedgeAngleDeg: number;
  moduleHref: string;
  themeColor: string;
  onNavigate: () => void;
  summaryLines?: string[];
  noBullets?: boolean;
  summaryColors?: (string | undefined)[];
  summaryDefinitions?: (string | undefined)[];
  labelAlign?: "left" | "right";
  fontScale?: number;
  textCenter?: number;
  bulletsLeft?: boolean;
  statusDot?: { color: string };
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
  fontScale = 1,
  textCenter,
  bulletsLeft,
  statusDot,
}: WedgeSummaryCardProps) {
  const hasSummary = summaryLines && summaryLines.length > 0;
  const isNoAlertsMessage = hasSummary && summaryLines!.length === 1 && summaryLines![0] === "No Current Alerts";
  const skipBullets = noBullets || isNoAlertsMessage;

  const L = length;
  const halfAngleRad = (wedgeAngleDeg / 2) * (Math.PI / 180);
  const TC = textCenter ?? 0.6;
  const fontSize = Math.max(9, L * 0.08) * fontScale;
  const CHAR_WIDTH = 0.6 * fontSize;
  const availableWidth = 2 * L * TC * Math.sin(halfAngleRad) * 0.8;
  const maxChars = Math.floor(availableWidth / CHAR_WIDTH);

  // --- Build display lines ---
  type DisplayRow = { label: string; value: string | null; color?: string; isDefinition?: boolean; parentLabelLen?: number; isContinuation?: boolean };
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
        if (hasDefinitions && summaryDefinitions![li]) {
          const defText = summaryDefinitions![li]!;
          const defMaxChars = Math.floor(maxChars / 0.7);
          if (defText.length <= defMaxChars) {
            displayLines.push({ label: defText, value: null, isDefinition: true, parentLabelLen: labelLen });
          } else {
            const defWords = defText.split(" ");
            let current = "";
            for (const word of defWords) {
              const test = current + (current.length > 0 ? " " : "") + word;
              if (test.length > defMaxChars && current.length > 0) {
                displayLines.push({ label: current, value: null, isDefinition: true, parentLabelLen: labelLen });
                current = word;
              } else {
                current = test;
              }
            }
            if (current.length > 0) {
              displayLines.push({ label: current, value: null, isDefinition: true, parentLabelLen: labelLen });
            }
          }
        }
      } else {
        const bullet = "• " + line;
        if (bullet.length <= maxChars) {
          displayLines.push({ label: bullet, value: null, color: lineColor });
        } else {
          const words = line.split(" ");
          let current = "• ";
          let pastFirst = false;
          for (const word of words) {
            const test = current + (current.length > (pastFirst ? 0 : 2) ? " " : "") + word;
            if (test.length > maxChars && current.length > (pastFirst ? 0 : 2)) {
              displayLines.push({ label: current, value: null, color: lineColor, isContinuation: pastFirst });
              current = word;
              pastFirst = true;
            } else {
              current = test;
            }
          }
          if (current.length > 0) {
            displayLines.push({ label: current, value: null, color: lineColor, isContinuation: pastFirst });
          }
        }
      }
    }
  }
  const lineCount = displayLines.length;

  // --- Compute text dimensions at base font size, then auto-scale to fit inside wedge ---
  // The text is a horizontal rectangle centered at (TC*L, 0) after counter-rotation.
  // For it to fit inside the wedge (pie slice with half-angle α):
  //   H/2 < (TC*L - W/2) * tan(α)   (top-left corner inside wedge)
  //   TC*L + W/2 < L                  (right edge before arc)
  // Both W and H scale with fontSize, so we find the max scale factor.

  // Compute max line width in characters
  const maxLineChars = displayLines.reduce((max, row) => {
    if (row.value !== null) {
      const badgeMatch = row.value.match(/\s+([\u24B6-\u24E9\u2195])$/);
      const valLen = badgeMatch ? row.value.slice(0, badgeMatch.index).length + 3 : row.value.length;
      return Math.max(max, row.label.length + 2 + valLen); // "label: value"
    }
    return Math.max(max, row.label.length);
  }, 0);

  // Text dimensions at scale=1 (base fontSize)
  const baseCW = 0.6 * fontSize;
  const baseTextW = maxLineChars * baseCW;
  const baseLH = LINE_HEIGHT;
  const baseDefLH = hasDefinitions ? baseLH * 0.65 : baseLH;
  const baseNormLH = hasDefinitions ? baseLH * 0.85 : baseLH;
  let baseTextH = 0;
  for (let j = 0; j < lineCount; j++) {
    baseTextH += displayLines[j].isDefinition ? baseDefLH : baseNormLH;
    if (displayLines[j].isDefinition && j + 1 < lineCount && !displayLines[j + 1].isDefinition) {
      baseTextH += baseNormLH * 0.9; // DEF_GAP
    }
  }

  const tanAlpha = Math.tan(halfAngleRad);
  const isLeftAligned = labelAlign === "left";

  // For centered text: rectangle centered at (TC*L, 0)
  //   H/2 < (TC*L - W/2) * tan(α)  =>  s < 2*TC*L*tan(α) / (H + W*tan(α))
  // For left-aligned text: rectangle starts at left edge of chord, shifted right by padding
  //   The left edge x = TC*L - chord/2 * 0.8. Text extends rightward from there.
  //   Constraint: H/2 < leftX * tan(α)  and  leftX + W < L
  let fitScale: number;
  if (isLeftAligned) {
    // Left-aligned: rely on clipPath for edge cases, scale gently
    // Only scale down if text is dramatically oversized
    const chordAtTC = 2 * TC * L * Math.sin(halfAngleRad);
    const scaleW = baseTextW > 0 ? (chordAtTC * 0.9) / baseTextW : 1;
    const scaleH = baseTextH > 0 ? (chordAtTC * 0.85) / baseTextH : 1;
    fitScale = Math.max(0.85, Math.min(1, scaleW, scaleH));
  } else {
    // Centered: rectangle centered at TC*L
    const scale1 = baseTextH > 0 ? (2 * TC * L * tanAlpha) / (baseTextH + baseTextW * tanAlpha) : 1;
    const scale2 = baseTextW > 0 ? (2 * (1 - TC) * L) / baseTextW : 1;
    fitScale = Math.max(0.55, Math.min(1, scale1, scale2)) * 0.9;
  }

  const finalFontSize = fontSize * fitScale;
  const finalCW = 0.6 * finalFontSize;
  const baseLineHeight = LINE_HEIGHT * fitScale;
  const lineHeight = hasDefinitions ? baseLineHeight * 0.85 : baseLineHeight;
  const defLineHeight = hasDefinitions ? baseLineHeight * 0.65 : baseLineHeight;

  // --- Wedge path ---
  const x1 = L * Math.cos(-halfAngleRad);
  const y1 = L * Math.sin(-halfAngleRad);
  const x2 = L * Math.cos(halfAngleRad);
  const y2 = L * Math.sin(halfAngleRad);
  const path = `M 0 0 L ${x1} ${y1} A ${L} ${L} 0 0 1 ${x2} ${y2} Z`;
  const rotation = angleDeg;

  // --- Text positioning ---
  const COLON_X = L * TC; // rotation pivot & center for centered text
  let LABEL_RIGHT_X: number;
  let VALUE_LEFT_X: number;

  // Left-aligned: base position where middle entry looks good, then offset per row.
  // Rows above center (negative y) shift left, rows below (positive y) shift right.
  const chordHalf = TC * L * Math.sin(halfAngleRad);
  const LEFT_BASE_X = COLON_X - chordHalf * 0.75 - finalCW * 2; // shifted 2 chars left
  const rowLeftX = (yText: number): number => {
    if (!isLeftAligned) return LEFT_BASE_X;
    return LEFT_BASE_X + yText * 0.3;
  };

  if (isLeftAligned) {
    // Not used for rendering (each line positioned independently), but set for badge calculations
    LABEL_RIGHT_X = LEFT_BASE_X; // unused
    VALUE_LEFT_X = LEFT_BASE_X;  // unused
  } else {
    // Centered: colon at TC*L
    LABEL_RIGHT_X = COLON_X - finalCW * 0.5 - finalCW * 2;
    VALUE_LEFT_X = COLON_X + finalCW * 0.5 - finalCW * 2;
  }

  // Badge labels
  const BADGE_LABELS: Record<string, string> = {
    "\u24B6": "A", "\u24B9": "D", "\u24BC": "G",
    "\u24CC": "W", "\u24E5": "VK", "\u2195": "↕",
  };

  const DEF_GAP = lineHeight * 0.9;
  const rowY = (i: number) => {
    let y = 0;
    for (let j = 0; j < i; j++) {
      y += displayLines[j].isDefinition ? defLineHeight : lineHeight;
      if (displayLines[j].isDefinition && j + 1 < lineCount && !displayLines[j + 1].isDefinition) {
        y += DEF_GAP;
      }
    }
    let totalHeight = 0;
    for (let j = 0; j < lineCount; j++) {
      totalHeight += displayLines[j].isDefinition ? defLineHeight : lineHeight;
      if (displayLines[j].isDefinition && j + 1 < lineCount && !displayLines[j + 1].isDefinition) {
        totalHeight += DEF_GAP;
      }
    }
    return y - totalHeight / 2 + (displayLines[i].isDefinition ? defLineHeight : lineHeight) / 2;
  };

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
          {/* Wedge fill */}
          <path
            d={path}
            fill="url(#wedgeGradient)"
            stroke={themeColor}
            strokeWidth="1.5"
            strokeOpacity="0.8"
            filter="url(#wedgeGlow)"
          />
          {/* Clipped text group — text CANNOT extend outside the wedge */}
          {hasSummary && lineCount > 0 && (
            <g clipPath="url(#wedgeClip)">
              {/* Dark backdrop for readability */}
              <path d={path} fill="rgba(0,0,0,0.35)" />
              <g transform={`rotate(${-rotation}, ${COLON_X}, 0)`}>
                {/* Badge background rects */}
                {(() => {
                  const badgeRects: { x: number; y: number; w: number; h: number; key: number }[] = [];
                  displayLines.forEach((row, i) => {
                    if (row.value === null || labelAlign !== "left") return;
                    const badgeMatch = row.value.match(/\s+([\u24B6-\u24E9\u2195])$/);
                    if (!badgeMatch) return;
                    const mainValue = row.value.slice(0, badgeMatch.index);
                    const badgeChar = badgeMatch[1];
                    const badge = BADGE_LABELS[badgeChar] || badgeChar;
                    const y = rowY(i);
                    const startX = rowLeftX(y);
                    const lineText = `${row.label}: `;
                    const valueX = startX + lineText.length * finalCW;
                    const badgeX = valueX + mainValue.length * finalCW + finalCW * 0.8;
                    const bFontSize = finalFontSize * 0.6;
                    const bWidth = badge.length * bFontSize * 0.7 + bFontSize * 0.5;
                    const bHeight = bFontSize * 1.4;
                    const bY = y - finalFontSize * 0.45;
                    badgeRects.push({ x: badgeX - bFontSize * 0.1, y: bY - bHeight * 0.72, w: bWidth, h: bHeight, key: i });
                  });
                  return badgeRects.map(b => (
                    <rect
                      key={`badge-bg-${b.key}`}
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx={2}
                      ry={2}
                      fill="#000000"
                      stroke="#FFD700"
                      strokeWidth={1}
                    />
                  ));
                })()}
                <text
                  fill="#ffffff"
                  fontSize={finalFontSize}
                  fontFamily="ui-monospace, monospace"
                  style={{
                    filter: "drop-shadow(0 0 2px rgba(0,0,0,1)) drop-shadow(0 1px 3px rgba(0,0,0,0.8))",
                  }}
                >
                  {displayLines.map((row, i) => {
                    const y = rowY(i);

                    // Definition rows
                    if (row.isDefinition) {
                      const defX = isLeftAligned ? rowLeftX(y) + finalCW * 2 : VALUE_LEFT_X;
                      return (
                        <tspan key={i} x={defX} y={y} textAnchor="start" fill="#ffffff" fontSize={finalFontSize * 0.7}>
                          {row.label}
                        </tspan>
                      );
                    }

                    const fill = row.color || "#ffffff";

                    // Label: value rows
                    if (row.value !== null) {
                      const badgeMatch = row.value.match(/\s+([\u24B6-\u24E9\u2195])$/);
                      const mainValue = badgeMatch ? row.value.slice(0, badgeMatch.index) : row.value;
                      const badgeChar = badgeMatch ? badgeMatch[1] : null;
                      const badge = badgeChar ? (BADGE_LABELS[badgeChar] || badgeChar) : null;

                      if (isLeftAligned) {
                        // Each line starts at its own left boundary based on wedge geometry
                        const startX = rowLeftX(y);
                        const lineText = `${row.label}: `;
                        const valX = startX + lineText.length * finalCW;
                        const badgeValX = valX + mainValue.length * finalCW + finalCW * 0.8;
                        return (
                          <React.Fragment key={i}>
                            <tspan x={startX} y={y} textAnchor="start" fill="#ffffff">{row.label}: </tspan>
                            <tspan fill={fill}>{mainValue}</tspan>
                            {badge && (() => {
                              const bFontSize = finalFontSize * 0.6;
                              const bWidth = badge.length * bFontSize * 0.7 + bFontSize * 0.5;
                              const bTextX = badgeValX - bFontSize * 0.1 + bWidth / 2;
                              const bY = y - finalFontSize * 0.45;
                              return (
                                <tspan x={bTextX} y={bY} textAnchor="middle" fill="#FFD700" fontSize={bFontSize} fontWeight="bold">{badge}</tspan>
                              );
                            })()}
                          </React.Fragment>
                        );
                      }

                      // Centered mode: label right-aligns, value left-aligns around colon
                      return (
                        <React.Fragment key={i}>
                          <tspan x={LABEL_RIGHT_X} y={y} textAnchor="end" fill="#ffffff">{row.label}:</tspan>
                          <tspan x={VALUE_LEFT_X} y={y} textAnchor="start" fill={fill}>{mainValue}</tspan>
                          {badge && (() => {
                            const bFontSize = finalFontSize * 0.6;
                            const bWidth = badge.length * bFontSize * 0.7 + bFontSize * 0.5;
                            const badgeX = VALUE_LEFT_X + mainValue.length * finalCW + finalCW * 0.8;
                            const bTextX = badgeX - bFontSize * 0.1 + bWidth / 2;
                            const bY = y - finalFontSize * 0.45;
                            return (
                              <tspan x={bTextX} y={bY} textAnchor="middle" fill="#FFD700" fontSize={bFontSize} fontWeight="bold">{badge}</tspan>
                            );
                          })()}
                          {i === 0 && statusDot && (
                            <circle
                              cx={VALUE_LEFT_X + (mainValue.length) * finalCW + finalCW * 0.6}
                              cy={y - finalFontSize * 0.35}
                              r={finalFontSize * 0.25}
                              fill={statusDot.color}
                            />
                          )}
                        </React.Fragment>
                      );
                    }

                    // Plain text (bullets, nutrition text, etc.)
                    {
                      const useCenter = !bulletsLeft && !row.isContinuation;
                      const scaledAvailW = 2 * L * TC * Math.sin(halfAngleRad) * 0.8;
                      const isNutrition = useCenter && noBullets;
                      const isAlerts = useCenter && isNoAlertsMessage && !noBullets;
                      const plainX = useCenter
                        ? COLON_X + (isNutrition ? finalCW * 1 : isAlerts ? 0 : 0)
                        : (COLON_X - scaledAvailW * 0.4);
                      const anchor = useCenter ? "middle" : "start";
                      const xOffset = row.isContinuation ? finalCW * 2 : 0;
                      const yOffset = isNutrition ? lineHeight * 2 : isAlerts ? 0 : 0;
                      return (
                        <tspan key={i} x={plainX + xOffset} y={y + yOffset} textAnchor={anchor} fill={fill}>
                          {row.label}
                        </tspan>
                      );
                    }
                  })}
                </text>
              </g>
            </g>
          )}
          </svg>
        </div>
      </Link>
    </div>
  );
}
