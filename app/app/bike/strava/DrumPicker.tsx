"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface DrumPickerOption {
  value: number;
  label: string;
}

interface DrumPickerProps {
  options: DrumPickerOption[];
  value: number | null;
  onChange: (value: number) => void;
  itemHeight?: number;
  visibleItems?: number;
}

/**
 * iOS-style drum/scroll-wheel picker.
 * Touch-scrollable with snap-to-item and momentum.
 */
export default function DrumPicker({
  options,
  value,
  onChange,
  itemHeight = 36,
  visibleItems = 5,
}: DrumPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  });

  // Scroll to selected on mount and when value changes externally
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0 && idx !== selectedIdx) {
      setSelectedIdx(idx);
      scrollToIndex(idx, "auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const el = containerRef.current;
      if (!el) return;
      const padding = Math.floor(visibleItems / 2) * itemHeight;
      el.scrollTo({ top: idx * itemHeight - padding + padding, behavior });
    },
    [itemHeight, visibleItems]
  );

  // Snap to nearest item after scroll ends
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const scrollTop = el.scrollTop;
      const idx = Math.round(scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(idx, options.length - 1));
      // Snap
      el.scrollTo({ top: clamped * itemHeight, behavior: "smooth" });
      if (clamped !== selectedIdx) {
        setSelectedIdx(clamped);
        onChange(options[clamped].value);
      }
    }, 80);
  }, [itemHeight, options, selectedIdx, onChange]);

  const handleClick = useCallback(
    (idx: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });
      setSelectedIdx(idx);
      onChange(options[idx].value);
    },
    [itemHeight, options, onChange]
  );

  // Initialize scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = options.findIndex((o) => o.value === value);
    const target = idx >= 0 ? idx : 0;
    el.scrollTop = target * itemHeight;
  }, [options, value, itemHeight]);

  const containerHeight = visibleItems * itemHeight;
  const paddingItems = Math.floor(visibleItems / 2);

  return (
    <div className="relative" style={{ height: containerHeight }}>
      {/* Selection highlight band */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 border-y border-[#00D9FF]/40 bg-[rgba(0,217,255,0.08)]"
        style={{
          top: paddingItems * itemHeight,
          height: itemHeight,
        }}
      />
      {/* Fade edges */}
      <div
        className="absolute left-0 right-0 top-0 pointer-events-none z-20"
        style={{
          height: paddingItems * itemHeight,
          background: "linear-gradient(to bottom, rgba(15,23,42,0.95), transparent)",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 pointer-events-none z-20"
        style={{
          height: paddingItems * itemHeight,
          background: "linear-gradient(to top, rgba(15,23,42,0.95), transparent)",
        }}
      />
      {/* Scrollable area */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll scrollbar-hide"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={handleScroll}
      >
        {/* Top padding */}
        <div style={{ height: paddingItems * itemHeight }} />
        {options.map((opt, i) => {
          const isSelected = i === selectedIdx;
          return (
            <div
              key={opt.value}
              onClick={() => handleClick(i)}
              className="flex items-center justify-center cursor-pointer select-none transition-all"
              style={{
                height: itemHeight,
                scrollSnapAlign: "start",
                color: isSelected ? "#00D9FF" : "#67C7EB",
                opacity: isSelected ? 1 : 0.5,
                fontSize: isSelected ? "13px" : "11px",
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              <span className="font-mono">{opt.value}</span>
              <span className="ml-1.5 text-[10px] font-normal opacity-75">{opt.label}</span>
            </div>
          );
        })}
        {/* Bottom padding */}
        <div style={{ height: paddingItems * itemHeight }} />
      </div>
    </div>
  );
}
