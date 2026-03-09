"use client";

import React from "react";
import Link from "next/link";

const ELECTRIC_BLUE = "#00D9FF";

const NUTRITION_ICON_SVG = (strokeColor: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="${strokeColor}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="14" stroke-width="2.25"/><circle cx="24" cy="24" r="5" stroke-width="2.25" opacity="0.9"/><line x1="24" y1="24" x2="24" y2="10" stroke-width="2.25"/><line x1="24" y1="24" x2="12" y2="17" stroke-width="2.25"/><line x1="24" y1="24" x2="36" y2="17" stroke-width="2.25"/></svg>`;

const SIZE = 512;

function downloadJpg() {
  const svgString = NUTRITION_ICON_SVG(ELECTRIC_BLUE);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const jpgUrl = canvas.toDataURL("image/jpeg", 0.95);
    const a = document.createElement("a");
    a.href = jpgUrl;
    a.download = "nutrition-icon.jpg";
    a.click();
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

export default function NutritionIconPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/hub" className="text-slate-400 hover:text-slate-200 text-sm font-mono">
          ← Back to JARVIS
        </Link>
        <h1 className="text-2xl font-bold font-mono">Nutrition icon</h1>
        <p className="text-slate-400 font-mono text-sm">
          JARVIS-style macro wheel. Download as JPG (white background, electric blue icon).
        </p>
        <div className="flex flex-col items-center gap-6 p-6 rounded-lg bg-slate-900/50 border border-slate-700">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke={ELECTRIC_BLUE}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-32 h-32"
          >
            <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
            <circle cx="24" cy="24" r="5" strokeWidth="2.25" opacity="0.9" />
            <line x1="24" y1="24" x2="24" y2="10" strokeWidth="2.25" />
            <line x1="24" y1="24" x2="12" y2="17" strokeWidth="2.25" />
            <line x1="24" y1="24" x2="36" y2="17" strokeWidth="2.25" />
          </svg>
          <button
            type="button"
            onClick={downloadJpg}
            className="px-4 py-2 rounded-lg font-mono text-sm bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600"
          >
            Download as JPG
          </button>
        </div>
      </div>
    </div>
  );
}
