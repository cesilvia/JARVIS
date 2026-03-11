"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

const NUTRITION_URL = "/nutrition";
const PRIMARY = "#00D9FF";
const DOUBLE_CLICK_MS = 300;

// Same as hub JarvisNutritionIcon: plate with fork (left) and knife (right), 80x80 to match frame
function FoodIcon({ stroke = PRIMARY }: { stroke?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke={stroke}
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}
      aria-hidden
    >
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <circle cx="24" cy="24" r="9" strokeWidth="2.25" fill="none" />
      <line x1="11" y1="15" x2="11" y2="33" strokeWidth="2.25" />
      <line x1="9" y1="15" x2="9" y2="20" strokeWidth="2.25" />
      <line x1="11" y1="15" x2="11" y2="20" strokeWidth="2.25" />
      <line x1="13" y1="15" x2="13" y2="20" strokeWidth="2.25" />
      <line x1="9" y1="15" x2="13" y2="15" strokeWidth="2.25" />
      <line x1="37" y1="15" x2="37" y2="33" strokeWidth="2.25" />
    </svg>
  );
}

/**
 * Food/nutrition icon for pages under Food and Nutrition.
 * Single click: go back to previous page.
 * Double click: go to Food and Nutrition (/nutrition).
 */
export default function NutritionBackIcon() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickRef = useRef(0);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (now - lastClickRef.current < DOUBLE_CLICK_MS) {
      lastClickRef.current = 0;
      router.push(NUTRITION_URL);
      return;
    }
    lastClickRef.current = now;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      router.back();
    }, DOUBLE_CLICK_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-block transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/50 rounded"
      title="Click: back · Double-click: Food and Nutrition"
      aria-label="Click to go back, double-click to go to Food and Nutrition"
    >
      <FoodIcon stroke={PRIMARY} />
    </button>
  );
}
