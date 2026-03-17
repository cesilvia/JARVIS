"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CircuitBackground from "./CircuitBackground";
import WedgeSummaryCard from "./WedgeSummaryCard";
import {
  StravaActivity,
  METERS_TO_MILES,
  METERS_TO_FEET,
  getWeekStart,
  getYearStart,
} from "../bike/strava/types";
import * as api from "../lib/api-client";

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  available: boolean;
}

const modules: Module[] = [
  {
    id: "calendar",
    name: "Calendar",
    description: "Connect and view your calendar",
    icon: "◇",
    href: "/calendar",
    color: "red",
    available: true,
  },
  {
    id: "nutrition",
    name: "Nutrition Tracker",
    description: "Track macros, ingredients, and recipes",
    icon: "◇",
    href: "/nutrition",
    color: "red",
    available: true,
  },
  {
    id: "strava",
    name: "Strava",
    description: "Cycling and bike gear",
    icon: "◇",
    href: "/bike",
    color: "red",
    available: true,
  },
  {
    id: "tasks",
    name: "Task Manager",
    description: "Manage your tasks and to-dos",
    icon: "◇",
    href: "/tasks",
    color: "red",
    available: true,
  },
  {
    id: "weather",
    name: "Weather",
    description: "Weather forecast and conditions",
    icon: "◇",
    href: "/weather",
    color: "red",
    available: true,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Notes connected to Craft",
    icon: "◇",
    href: "/notes",
    color: "red",
    available: true,
  },
  {
    id: "health",
    name: "Health",
    description: "Health metrics and activity",
    icon: "◇",
    href: "/health",
    color: "red",
    available: true,
  },
  {
    id: "german",
    name: "Deutsch",
    description: "German language learning",
    icon: "◇",
    href: "/german",
    color: "red",
    available: true,
  },
];

const bottomModules = [
  { id: "settings", name: "Settings", href: "/settings" },
  { id: "profile", name: "Profile", href: "/profile" },
  { id: "status", name: "System Status", href: "/status" },
  { id: "alerts", name: "Alerts", href: "/alerts" },
];

// Profile icon: bald head, rectangular glasses
const JarvisProfileIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Bald head: dome top, rounded chin */}
    <path d="M24 8 C34 8 38 15 38 24 C38 32 34 38 24 38 C14 38 10 32 10 24 C10 15 14 8 24 8 Z" strokeWidth="2.25" />
    {/* Glasses */}
    <rect x="12" y="18" width="8" height="5" rx="0.5" strokeWidth="2.25" fill="none" />
    <rect x="28" y="18" width="8" height="5" rx="0.5" strokeWidth="2.25" fill="none" />
    <line x1="20" y1="20" x2="28" y2="20" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style settings icon: sliders (control panel)
const JarvisSettingsIcon = ({ className = "w-8 h-8", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Three sliders: track + knob */}
    <line x1="16" y1="18" x2="32" y2="18" strokeWidth="2.25" />
    <circle cx="22" cy="18" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="16" y1="24" x2="32" y2="24" strokeWidth="2.25" />
    <circle cx="28" cy="24" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="16" y1="30" x2="32" y2="30" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="2.5" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style bike wheel icon: freesvg.org bike wheel inside circle
const JarvisBikeWheelIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const color = strokeColor ?? "currentColor";
  return (
    <div className={`${className} relative flex items-center justify-center`} style={style}>
      <svg viewBox="0 0 48 48" fill="none" stroke={color} className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      </svg>
      <img
        src="/assets/bike-wheel.svg"
        alt=""
        className="w-[62%] h-[62%] object-contain"
        style={{
          filter: "brightness(0) saturate(100%) invert(76%) sepia(65%) saturate(1000%) hue-rotate(155deg) brightness(104%) contrast(104%)",
        }}
      />
    </div>
  );
};

// JARVIS-style status icon: thin circle, gauge inside
const JarvisStatusIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Dial arc (bottom half of circle, like a speedometer) */}
    <path d="M10 24 A14 14 0 0 1 38 24" strokeWidth="2.25" />
    {/* Tick marks at 0°, 45°, 90°, 135°, 180° (radial, on the arc) */}
    <line x1="36" y1="24" x2="38" y2="24" strokeWidth="2.25" />
    <line x1="32.3" y1="15.7" x2="34" y2="14" strokeWidth="2.25" />
    <line x1="24" y1="12" x2="24" y2="10" strokeWidth="2.25" />
    <line x1="15.7" y1="15.7" x2="14" y2="14" strokeWidth="2.25" />
    <line x1="12" y1="24" x2="10" y2="24" strokeWidth="2.25" />
    {/* Center pivot (small circle) */}
    <circle cx="24" cy="24" r="2" strokeWidth="2.25" opacity="0.9" />
    {/* Needle (pivots from center, pointing up) */}
    <line x1="24" y1="24" x2="24" y2="11" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style alert/notification icon (exclamation in triangle – warning/alert)
const JarvisAlertIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Triangle (warning shape) – fully inside circle */}
    <path d="M24 12 L32 34 L16 34 Z" strokeWidth="2.25" fill="none" />
    {/* Exclamation: dot + vertical line */}
    <line x1="24" y1="19" x2="24" y2="27" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="1.25" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style notes icon: document with lines + pencil (based on Wikimedia Aufgabe-schreiben)
const JarvisNotesIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Document body — right edge stops before pencil area */}
    <path d="M14 10h14l6 6v8" strokeLinecap="butt" />
    <path d="M34 31v5a1 1 0 01-1 1H14a1 1 0 01-1-1V11a1 1 0 011-1" />
    <path d="M28 10v6h6" />
    {/* Lines on document */}
    <line x1="17" y1="20" x2="27" y2="20" />
    <line x1="17" y1="24" x2="29" y2="24" />
    <line x1="17" y1="28" x2="25" y2="28" />
    <line x1="17" y1="32" x2="23" y2="32" />
    {/* Pencil overlapping bottom-right */}
    <path d="M29 28l6-6 3 3-6 6-3.5.5z" strokeWidth="1.8" />
    <line x1="33.5" y1="23.5" x2="36.5" y2="26.5" strokeWidth="1.2" />
  </svg>
);

// JARVIS-style health icon: heart rate / EKG graph
const JarvisHealthIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* EKG: P (small bump), Q (dip), R (tall spike), S (dip), T (rounded) */}
    <path d="M14 26 L15.5 24 L17 26 L19 26 L19.5 28 L20 12 L20.5 30 L22 26 L23.5 22 L25 26 L34 26" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style weather icon: sun with rays
const JarvisWeatherIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Sun: center circle + 8 rays */}
    <circle cx="24" cy="24" r="4" strokeWidth="2.25" fill="none" />
    <line x1="24" y1="10" x2="24" y2="14" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="24" y1="34" x2="24" y2="38" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="10" y1="24" x2="14" y2="24" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="34" y1="24" x2="38" y2="24" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="13.2" y1="13.2" x2="16" y2="16" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="32" y1="32" x2="34.8" y2="34.8" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="34.8" y1="13.2" x2="32" y2="16" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="16" y1="32" x2="13.2" y2="34.8" strokeWidth="2.25" strokeLinecap="round" />
  </svg>
);

// JARVIS-style task manager icon: Wikimedia Checklist Noun Project inside circle
const JarvisTaskManagerIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const color = strokeColor ?? "currentColor";
  return (
    <div className={`${className} relative flex items-center justify-center`} style={style}>
      <svg viewBox="0 0 48 48" fill="none" stroke={color} className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      </svg>
      <img
        src="/assets/checklist.png"
        alt=""
        className="w-[62%] h-[62%] object-contain"
        style={{
          filter: "brightness(0) saturate(100%) invert(76%) sepia(65%) saturate(1000%) hue-rotate(155deg) brightness(104%) contrast(104%)",
        }}
      />
    </div>
  );
};

// JARVIS-style calendar icon: freesvg.org calendar frame with dynamic month/day
const JarvisCalendarIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const color = strokeColor ?? "currentColor";
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = now.getDate();
  return (
    <div className={`${className} relative flex items-center justify-center`} style={style}>
      <svg viewBox="0 0 48 48" fill="none" stroke={color} className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      </svg>
      <div className="relative w-[52%] h-[52%] flex flex-col items-center justify-center">
        <img
          src="/assets/calendar-frame.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            filter: "brightness(0) saturate(100%) invert(76%) sepia(65%) saturate(1000%) hue-rotate(155deg) brightness(104%) contrast(104%)",
          }}
        />
        {/* Month text on red header area */}
        <span
          className="relative z-10 font-black leading-none"
          style={{ fontSize: "105%", marginTop: "24%", color: "#0d3d52" }}
        >
          {month}
        </span>
        {/* Day number on white body area */}
        <span
          className="relative z-10 font-black leading-none"
          style={{ fontSize: "105%", marginTop: "4%", color: "#0d3d52" }}
        >
          {day}
        </span>
      </div>
    </div>
  );
};

// JARVIS-style nutrition icon: freesvg.org fork silhouette inside circle
const JarvisNutritionIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const color = strokeColor ?? "currentColor";
  return (
    <div className={`${className} relative flex items-center justify-center`} style={style}>
      <svg viewBox="0 0 48 48" fill="none" stroke={color} className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      </svg>
      <img
        src="/assets/fork-silhouette.svg"
        alt=""
        className="w-[62%] h-[62%] object-contain"
        style={{
          filter: "brightness(0) saturate(100%) invert(76%) sepia(65%) saturate(1000%) hue-rotate(155deg) brightness(104%) contrast(104%)",
        }}
      />
    </div>
  );
};

// JARVIS-style German Bundesadler — actual coat of arms eagle paths from Wikimedia
const JarvisGermanIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const fg = strokeColor ?? "currentColor";
  // Background color for cutout details — matches selected vs unselected state
  const bg = "transparent";
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke={fg}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      {/* Bundesadler paths scaled from 240x224 original to fit inside circle */}
      <g transform="translate(10, 10.5) scale(0.1167)" stroke="none">
        {/* Right half of eagle */}
        <path fill={fg} d="M118 65h27.65c16.26 0 32.34-10.5 32.34-23.98 0-7.16-3.21-12.19-7.2-17.75-2.34.38-4.47.6-6.14.6-7.37 0-11.36-3.94-11.64-7.81 0-3.49 2.82-6.13 7.23-6.13 6.85 0 19.27 6.39 31.83 6.39-1.25.94-3.3 1.92-5.78 2.87 7.36 6.59 12.28 15.47 14.14 24.99l19.23 30.75C222.88 80.1 229.72 90.2 240 98.09c-12.43 0-20.68.3-31.19-16.36l-9.85-15.78c-.73 2.05-1.64 4.05-2.69 6l19.59 31.36c3.27 5.22 10.01 15.23 20.35 23.16-12.44 0-20.69.3-31.19-16.35L188.14 83.1c-1.25 1.35-2.59 2.65-3.99 3.92l23.8 38.12c2.96 4.69 8.7 13.28 17.39 20.73l2.96 2.42c-6.65 0-12.11.06-17.35-2.41-4.56-2.14-8.96-6.21-13.84-13.95L173.9 94.77c-1.53.96-3.09 1.89-4.7 2.78l28.32 45.34 1.88 2.99c3.69 5.45 9.79 13.51 18.45 20.15-12.43 0-20.67.29-31.2-16.35l-2.36-3.8-26.79-42.9c-1.73.66-3.48 1.28-5.26 1.86l25.62 41.04 7.33 11.74c3.22 5.13 10.1 15.27 20.34 23.14-12.43 0-20.67.28-31.19-16.36l-11.57-18.52-23.55-37.74c-2.03 3.24-2.69 6.07-2.69 8.9 0 10.43 4.02 20.16 10.2 28.84 4.28 6.02 9.6 11.55 15.3 16.5-.88.39-2.43.54-3.87.54-2.87 0-4.73-.17-6.03-.39 3.22 7.32 10.15 16.79 13.64 21.69 4.56-.82 11.19-1.46 15.53-1.46 4.53 0 5.04 2.66 5.04 5.03 0 4.13-1.92 7.43-4.17 9.26-.83-2.15-2.54-4.94-10.92-4.94 1.61 2.76 9.29 8.98 9.29 13.99 0 3.3-3.62 8.26-8.42 8.26.28-1.07.24-2.06.24-2.79 0-4.03-3.57-8.77-6.6-12.08.09.98.04.88.04 2.02 0 9.58-.87 13.98-6.94 13.98-2.98 0-5.03-1.64-5.74-2.12 3.94-3.65 4.14-6.49 4.14-11.87l-.03-4.65c-.01-1.22.02-2.84.2-4.02-2.17-.3-3.04-.3-4.72-.3 0 0-8.63-.68-10.71 3.81-2.34-2.15-5.74-5.18-5.74-8.54 0-2.2 1.05-4.71 5.49-4.71 1.68 0 6.98 1.03 11.42 1.03-1.2-2.66-6.5-10.41-11.09-16.04-.7 2.19-1.78 4.56-4.18 6.48-.33-3.61-2.46-15.05-8.11-21.74-.66 4.51-1.55 9.15-1.55 18.93 0 23.79 5.72 41.36 17.86 44.73-1.58 2.76-4.93 5.21-8.39 5.21-4.44 0-6.85-5.03-9.33-9.76C127.1 215.44 123.55 224 120 224c-.7 0-1.48-.38-2-.85Z"/>
        {/* Right half detail cutouts */}
        <path fill={bg} d="M188.49 45.61c0-11.72-8.52-21-11.52-23.61l-2.16.5c3.18 3.9 8.82 10.42 8.82 19.05 0 17-17.96 31.75-38.44 32.03.24 2.9.16 8.4-.29 11.72 23.25-.41 43.59-19.33 43.59-39.69ZM156.43 186.29c-9.91 0-12.07-1.04-14.68-1.04-1.68 0-3.29.17-3.29 2.55 0 1.66 1.87 4.06 3.54 5.33 2.34-2.32 5.54-2.83 10.71-2.83 2.41 0 5.71.47 7.17.68-.2 1.43-.49 3.27-.49 5.86 0 1.38.05 2.97.05 4.66 0 5.87-.86 8.97-2.91 11.31.45.27 1.64.53 2.33.53 3.79 0 4.76-1.96 4.76-11.83 0-2.98.26-5.72.26-6.44 5.3 4.04 10.71 11.28 10.71 16.5 1.73-.87 3.79-3.5 3.79-5.47 0-3.55-5.97-8.86-12.27-15.26.88-.21 3.22-.89 5.14-.89 4.97 0 8.97.82 11.3 3.58.93-1 1.69-4.01 1.69-5.74 0-2.98-1.71-2.86-2.94-2.86-5.28 0-11.81.82-16.48 1.58-1.7-2.25-12.51-16.9-15.31-24.7-.81-.3-1.44-.54-2.76-.54-2.61 0-3.27 1.83-3.96 4.32 5.97 7.25 11.7 15.11 13.64 20.7Z"/>
        {/* Left half — mirrored */}
        <g transform="translate(240, 0) scale(-1, 1)">
          <path fill={fg} d="M118 65h27.65c16.26 0 32.34-10.5 32.34-23.98 0-7.16-3.21-12.19-7.2-17.75-2.34.38-4.47.6-6.14.6-7.37 0-11.36-3.94-11.64-7.81 0-3.49 2.82-6.13 7.23-6.13 6.85 0 19.27 6.39 31.83 6.39-1.25.94-3.3 1.92-5.78 2.87 7.36 6.59 12.28 15.47 14.14 24.99l19.23 30.75C222.88 80.1 229.72 90.2 240 98.09c-12.43 0-20.68.3-31.19-16.36l-9.85-15.78c-.73 2.05-1.64 4.05-2.69 6l19.59 31.36c3.27 5.22 10.01 15.23 20.35 23.16-12.44 0-20.69.3-31.19-16.35L188.14 83.1c-1.25 1.35-2.59 2.65-3.99 3.92l23.8 38.12c2.96 4.69 8.7 13.28 17.39 20.73l2.96 2.42c-6.65 0-12.11.06-17.35-2.41-4.56-2.14-8.96-6.21-13.84-13.95L173.9 94.77c-1.53.96-3.09 1.89-4.7 2.78l28.32 45.34 1.88 2.99c3.69 5.45 9.79 13.51 18.45 20.15-12.43 0-20.67.29-31.2-16.35l-2.36-3.8-26.79-42.9c-1.73.66-3.48 1.28-5.26 1.86l25.62 41.04 7.33 11.74c3.22 5.13 10.1 15.27 20.34 23.14-12.43 0-20.67.28-31.19-16.36l-11.57-18.52-23.55-37.74c-2.03 3.24-2.69 6.07-2.69 8.9 0 10.43 4.02 20.16 10.2 28.84 4.28 6.02 9.6 11.55 15.3 16.5-.88.39-2.43.54-3.87.54-2.87 0-4.73-.17-6.03-.39 3.22 7.32 10.15 16.79 13.64 21.69 4.56-.82 11.19-1.46 15.53-1.46 4.53 0 5.04 2.66 5.04 5.03 0 4.13-1.92 7.43-4.17 9.26-.83-2.15-2.54-4.94-10.92-4.94 1.61 2.76 9.29 8.98 9.29 13.99 0 3.3-3.62 8.26-8.42 8.26.28-1.07.24-2.06.24-2.79 0-4.03-3.57-8.77-6.6-12.08.09.98.04.88.04 2.02 0 9.58-.87 13.98-6.94 13.98-2.98 0-5.03-1.64-5.74-2.12 3.94-3.65 4.14-6.49 4.14-11.87l-.03-4.65c-.01-1.22.02-2.84.2-4.02-2.17-.3-3.04-.3-4.72-.3 0 0-8.63-.68-10.71 3.81-2.34-2.15-5.74-5.18-5.74-8.54 0-2.2 1.05-4.71 5.49-4.71 1.68 0 6.98 1.03 11.42 1.03-1.2-2.66-6.5-10.41-11.09-16.04-.7 2.19-1.78 4.56-4.18 6.48-.33-3.61-2.46-15.05-8.11-21.74-.66 4.51-1.55 9.15-1.55 18.93 0 23.79 5.72 41.36 17.86 44.73-1.58 2.76-4.93 5.21-8.39 5.21-4.44 0-6.85-5.03-9.33-9.76C127.1 215.44 123.55 224 120 224c-.7 0-1.48-.38-2-.85Z"/>
          <path fill={bg} d="M188.49 45.61c0-11.72-8.52-21-11.52-23.61l-2.16.5c3.18 3.9 8.82 10.42 8.82 19.05 0 17-17.96 31.75-38.44 32.03.24 2.9.16 8.4-.29 11.72 23.25-.41 43.59-19.33 43.59-39.69ZM156.43 186.29c-9.91 0-12.07-1.04-14.68-1.04-1.68 0-3.29.17-3.29 2.55 0 1.66 1.87 4.06 3.54 5.33 2.34-2.32 5.54-2.83 10.71-2.83 2.41 0 5.71.47 7.17.68-.2 1.43-.49 3.27-.49 5.86 0 1.38.05 2.97.05 4.66 0 5.87-.86 8.97-2.91 11.31.45.27 1.64.53 2.33.53 3.79 0 4.76-1.96 4.76-11.83 0-2.98.26-5.72.26-6.44 5.3 4.04 10.71 11.28 10.71 16.5 1.73-.87 3.79-3.5 3.79-5.47 0-3.55-5.97-8.86-12.27-15.26.88-.21 3.22-.89 5.14-.89 4.97 0 8.97.82 11.3 3.58.93-1 1.69-4.01 1.69-5.74 0-2.98-1.71-2.86-2.94-2.86-5.28 0-11.81.82-16.48 1.58-1.7-2.25-12.51-16.9-15.31-24.7-.81-.3-1.44-.54-2.76-.54-2.61 0-3.27 1.83-3.96 4.32 5.97 7.25 11.7 15.11 13.64 20.7Z"/>
        </g>
        {/* Head and beak (center) */}
        <path fill={fg} d="M96.67 66c3.37-12.02 10.46-19.17 15.93-26.17-6.56-2.39-13.88-8.62-13.88-11.45.83-.48 13.41 3.47 14.71 3.82 2.37-.46 3.64-2.69 3.64-2.92-1.34-.23-9.23-1.24-14.62-3.21-4.09-1.5-6.17-4.22-6.17-5.25 1.32-.22 6.3 2.41 13.63 2.41 2.71 0 3.23-.11 5.93-.44-1.89-4.5-5.45-8.31-9.44-8.31-1.61 0-5.12 1-8.06 2.48-2.05-3.19-3.85-7.37-3.85-9.66 0-2.7 2.67-5.86 10.2-5.86 2.81 0 6.34.34 9.92 1.65-.16-1.99.79-3.09 4.31-3.09 6.19 0 12.55 2.05 20.33 2.05 2.01 0 3.38-.09 4.54-.58-.5 1.56-2.69 3.84-4.68 5.69 1.23 1.69 4.44 5.77 4.44 12.37 0 10.6-6.97 19.34-6.97 30.04 0 6.37 4.89 11.99 6.68 16.43Z"/>
        {/* Head detail cutouts */}
        <path fill={bg} d="M119.41 25.73c1.08-2.44 2.52-5.36 2.52-8.57 0-8.9-7.37-13.14-17.24-13.14-5.07 0-7.63 1.64-7.63 3.28 0 1.64 1.67 5.26 2.33 6.38 1.82-.8 5.1-1.77 7.01-1.77 6.77 0 11.83 7.59 13.01 13.82Zm4.86-11.36c5.76 1.12 9.69-6.25 4.22-7.56.76 2.43-2.94 4.15-2.94 4.15s-1.4-3.28.41-5.12c-3.34-1.64-4.19.35-4.26 2.43 1.32 1.75 2.19 3.81 2.57 6.1Z"/>
      </g>
    </svg>
  );
};

// J.A.R.V.I.S. frame wrapper component - using the uploaded image
const JarvisFrame = ({ isLarge }: { isLarge: boolean }) => {
  return (
      <img
        src="/assets/jarvis-frame.png"
        alt="JARVIS Frame"
        className="jarvis-hud hud-element"
      />
  );
};

// Helper component to render stylized icons
const StylizedIcon = ({ moduleId, size = "text-4xl", iconColor }: { moduleId: string; size?: string; iconColor?: string }) => {
  const isLarge = size === "text-4xl";
  const isMedium = size === "text-2xl";
  const isSmall = size === "text-xl";
  
  // Adjust frame size based on icon size - smaller for compact display
  const frameSize = isLarge ? "w-12 h-12" : isMedium ? "w-8 h-8" : isSmall ? "w-10 h-10" : "w-6 h-6";
  const iconSize = isLarge ? "w-12 h-12" : isMedium ? "w-8 h-8" : isSmall ? "w-10 h-10" : "w-6 h-6";
  const nutritionIconSize = isLarge ? "w-32 h-32" : isMedium ? "w-20 h-20" : isSmall ? "w-[90px] h-[90px]" : "w-16 h-16";
  const borderWidth = isLarge ? "border-[3px]" : "border-2";

  const iconStyles: { [key: string]: React.ReactElement } = {
    calendar: <JarvisCalendarIcon className={nutritionIconSize} stroke={iconColor} />,
    nutrition: <JarvisNutritionIcon className={nutritionIconSize} stroke={iconColor} />,
    strava: <JarvisBikeWheelIcon className={nutritionIconSize} stroke={iconColor} />,
    tasks: <JarvisTaskManagerIcon className={nutritionIconSize} stroke={iconColor} />,
    weather: <JarvisWeatherIcon className={nutritionIconSize} stroke={iconColor} />,
    notes: <JarvisNotesIcon className={nutritionIconSize} stroke={iconColor} />,
    health: <JarvisHealthIcon className={nutritionIconSize} stroke={iconColor} />,
    german: <JarvisGermanIcon className={nutritionIconSize} stroke={iconColor} />,
  };

  const icon = iconStyles[moduleId] || <div className={`${iconSize} ${borderWidth} border-[#FBCA03]`}></div>;
  return iconColor ? <span style={{ color: iconColor, display: "inline-flex" }}>{icon}</span> : icon;
};

// JARVIS 4.0 theme (only theme)
const currentTheme = {
  name: "JARVIS 4.0",
  primary: "#00D9FF",
  secondary: "#67C7EB",
  accent: "#00FF88",
  background: "#000000",
  cardBg: "rgba(0, 217, 255, 0.05)",
  text: "#00D9FF",
  textSecondary: "#67C7EB",
  style: "classic" as const,
  glow: "#00D9FF",
  circuit: "#00D9FF"
};

const ALERT_ICON_ORANGE = "#FF6600";

// Same logic as alerts page: backup overdue + helmet reminders
const BACKUP_REMINDER_DAYS = 7;
const FULL_BACKUP_REMINDER_DAYS = 1;
const HELMET_REMINDER_DAYS = 30;
const ZONE_REVIEW_DAYS = 28;

async function hubGetAlertSummaries(): Promise<string[]> {
  const lines: string[] = [];
  // localStorage → SQLite migration check
  let jarvisKeyCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i)?.startsWith("jarvis-")) jarvisKeyCount++;
  }
  if (jarvisKeyCount > 0) {
    try {
      const kvData = await api.getAllKV();
      if (Object.keys(kvData).length === 0) {
        lines.push("Migrate localStorage to SQLite");
      }
    } catch {
      lines.push("Migrate localStorage to SQLite");
    }
  }
  // Daily full JARVIS backup check
  const lastFullBackup = await api.getKV<string>("last-full-backup");
  if (!lastFullBackup) {
    lines.push("Back up JARVIS to iCloud");
  } else {
    const fullDays = (Date.now() - new Date(lastFullBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (fullDays >= FULL_BACKUP_REMINDER_DAYS) {
      lines.push("Back up JARVIS to iCloud");
    }
  }
  // Weekly nutrition backup check
  const lastBackup = await api.getKV<string>("last-nutrition-backup");
  if (!lastBackup) {
    lines.push("Back up nutrition data");
  } else {
    const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= BACKUP_REMINDER_DAYS) {
      lines.push("Back up nutrition data");
    }
  }
  try {
    const items = (await api.getGearItems()) as { name: string; category: string; purchaseDate?: string; replaceReminderYears?: number }[];
    const cutoff = Date.now() + HELMET_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    for (const item of items) {
      if (item.category !== "Helmets" || !item.purchaseDate || !item.replaceReminderYears) continue;
      const d = new Date(item.purchaseDate);
      if (isNaN(d.getTime())) continue;
      d.setFullYear(d.getFullYear() + item.replaceReminderYears);
      if (d.getTime() <= cutoff) {
        lines.push(`Helmet: ${item.name} — replace by ${d.toLocaleDateString()}`);
      }
    }
  } catch {
    // ignore
  }
  try {
    const zones = await api.getKV<{ zonesUpdatedAt?: string; ftp?: number }>("strava-zones");
    if (zones?.zonesUpdatedAt) {
      const zoneDays = (Date.now() - new Date(zones.zonesUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (zoneDays >= ZONE_REVIEW_DAYS) {
        lines.push(`Review training zones (${Math.floor(zoneDays)} days old)`);
      }
    }
  } catch {
    // ignore
  }
  return lines;
}

export default function HubPage() {
  const router = useRouter();
  const [wedgeModule, setWedgeModule] = useState<string | null>(null);
  const [nutritionStats, setNutritionStats] = useState({ recipes: 0, ingredients: 0 });
  const [hasAlerts, setHasAlerts] = useState(false);
  const [alertSummaries, setAlertSummaries] = useState<string[]>([]);
  const [stravaSummary, setStravaSummary] = useState<string[]>([]);
  const centerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Load nutrition stats
  useEffect(() => {
    async function loadNutritionStats() {
      try {
        const [recipes, ingredients] = await Promise.all([
          api.getRecipes(),
          api.getIngredients(),
        ]);
        setNutritionStats({ recipes: recipes.length, ingredients: ingredients.length });
      } catch {
        // Ignore
      }
    }
    loadNutritionStats();
  }, []);

  // Load Strava summary stats from SQLite
  useEffect(() => {
    async function loadStravaSummary() {
      try {
        const activities = await api.getActivities<StravaActivity>();
        if (activities.length === 0) { setStravaSummary(["No rides yet"]); return; }

        const now = new Date();
        const yearStart = getYearStart();
        const weekStart = getWeekStart(now);
        const ytd = activities.filter((a) => new Date(a.start_date) >= yearStart);
        const thisWeek = activities.filter((a) => new Date(a.start_date) >= weekStart);

        const weekMiles = Math.round(thisWeek.reduce((s, a) => s + a.distance * METERS_TO_MILES, 0));
        const ytdMiles = Math.round(ytd.reduce((s, a) => s + a.distance * METERS_TO_MILES, 0));
        const ytdElev = Math.round(ytd.reduce((s, a) => s + a.total_elevation_gain * METERS_TO_FEET, 0));

        // CTL/ATL/TSB
        let tsbLabel = "";
        try {
          const zones = await api.getKV<{ ftp?: number }>("strava-zones");
          const ftp = zones?.ftp;
          if (ftp) {
            let ctl = 0, atl = 0;
            const dailyTSS = new Map<string, number>();
            for (const a of activities) {
              const np = a.weighted_average_watts;
              if (!np) continue;
              const iff = np / ftp;
              const tss = (a.moving_time * np * iff) / (ftp * 3600) * 100;
              const day = a.start_date.slice(0, 10);
              dailyTSS.set(day, (dailyTSS.get(day) || 0) + tss);
            }
            const sorted = Array.from(dailyTSS.keys()).sort();
            if (sorted.length > 0) {
              const start = new Date(sorted[0]);
              for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().slice(0, 10);
                const tss = dailyTSS.get(key) || 0;
                ctl = ctl + (tss - ctl) / 42;
                atl = atl + (tss - atl) / 7;
              }
              const tsb = ctl - atl;
              const status = tsb > -10 ? "Fresh" : tsb > -30 ? "Training" : "Overreaching";
              tsbLabel = `TSB: ${Math.round(tsb)} (${status})`;
            }
          }
        } catch { /* ignore */ }

        const lines: string[] = [];
        lines.push(`Week: ${weekMiles} mi`);
        lines.push(`YTD: ${ytdMiles.toLocaleString()} mi`);
        lines.push(`Elev: ${ytdElev.toLocaleString()} ft`);
        if (tsbLabel) lines.push(tsbLabel);

        setStravaSummary(lines);
      } catch {
        setStravaSummary(["Data error"]);
      }
    }
    loadStravaSummary();
  }, []);

  // Check for alerts (same conditions as alerts page: backup overdue, helmet reminders)
  useEffect(() => {
    async function loadAlerts() {
      const summaries = await hubGetAlertSummaries();
      setAlertSummaries(summaries);
      setHasAlerts(summaries.length > 0);
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Wedge geometry: compute from center and icon positions
  const [wedgeProps, setWedgeProps] = useState<{
    originX: number;
    originY: number;
    angleDeg: number;
    length: number;
    wedgeAngleDeg: number;
  } | null>(null);
  const computeWedgeProps = React.useCallback(() => {
    if (!wedgeModule || !centerRef.current || !contentAreaRef.current) {
      setWedgeProps(null);
      return;
    }
    const centerRect = centerRef.current.getBoundingClientRect();
    const contentRect = contentAreaRef.current.getBoundingClientRect();
    const centerX = centerRect.left - contentRect.left + centerRect.width / 2;
    const centerY = centerRect.top - contentRect.top + centerRect.height / 2;

    const iconEl = iconRefs.current[wedgeModule];
    if (!iconEl) {
      setWedgeProps(null);
      return;
    }
    const iconRect = iconEl.getBoundingClientRect();
    const iconX = iconRect.left - contentRect.left + iconRect.width / 2;
    const iconY = iconRect.top - contentRect.top + iconRect.height / 2;

    const dx = iconX - centerX;
    const dy = iconY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    // Angle: 0 = east, 90 = south (screen coords). atan2(dy, dx) gives standard math angle.
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Wedge angle: standardized at 120° for all
    const wedgeAngleDeg = 120;

    // Use Strava wedge as reference - all wedges stop at same Y (same distance from icon row).
    const healthEl = iconRefs.current["health"];
    const healthDist = healthEl
      ? (() => {
          const r = healthEl.getBoundingClientRect();
          const ix = r.left - contentRect.left + r.width / 2;
          const iy = r.top - contentRect.top + r.height / 2;
          return Math.sqrt((ix - centerX) ** 2 + (iy - centerY) ** 2);
        })()
      : distance;
    const stravaLength = healthDist * 0.6;

    // All wedges: same dimensions, size, shape as Strava wedge.
    const length = stravaLength;

    setWedgeProps({
      originX: centerX,
      originY: centerY,
      angleDeg,
      length,
      wedgeAngleDeg,
    });
  }, [wedgeModule]);

  useEffect(() => {
    computeWedgeProps();
  }, [computeWedgeProps]);

  useEffect(() => {
    if (!wedgeModule) return;
    window.addEventListener("resize", computeWedgeProps);
    return () => window.removeEventListener("resize", computeWedgeProps);
  }, [wedgeModule, computeWedgeProps]);

  // Click outside to close wedge
  useEffect(() => {
    if (!wedgeModule) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-wedge]") || target.closest("[data-module-icon]") || target.closest("[data-bottom-icon]")) return;
      setWedgeModule(null);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [wedgeModule]);

  const handleIconClick = useCallback((moduleId: string) => {
    const topModule = modules.find((m) => m.id === moduleId);
    const bottomModule = bottomModules.find((m) => m.id === moduleId);
    if (topModule && !topModule.available) return;
    setWedgeModule((prev) => (prev === moduleId ? null : moduleId));
  }, []);

  const handleIconDoubleClick = useCallback(
    (moduleId: string, href: string) => {
      router.push(href);
    },
    [router]
  );

  const handleWedgeNavigate = useCallback(
    (moduleId: string) => {
      const topModule = modules.find((m) => m.id === moduleId);
      const bottomModule = bottomModules.find((m) => m.id === moduleId);
      const href = topModule?.href ?? bottomModule?.href;
      if (!href) return;
      setWedgeModule(null);
      router.push(href);
    },
    [router]
  );

  return (
    <div className="min-h-screen hud-scifi-bg" style={{ 
      backgroundColor: currentTheme.background,
      color: currentTheme.primary
    }}>
      <CircuitBackground />
      <main className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10 overflow-visible">
        <div ref={contentAreaRef} className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center gap-6 relative overflow-visible">
            {/* Top Module Frames - z-30 so icons stay clickable above wedge overlay */}
            <div className="flex-shrink-0 mb-4 relative z-30">
              <div className="flex items-center justify-center gap-2">
                {modules.map((module) => {
                  const isSelected = wedgeModule === module.id;
                  const isAvailable = module.available;
                  const isNutrition = module.id === "nutrition";
                  const isStrava = module.id === "strava";
                  const isCalendar = module.id === "calendar";
                  const isTasks = module.id === "tasks";
                  const isWeather = module.id === "weather";
                  const isNotes = module.id === "notes";
                  const isHealth = module.id === "health";
                  const isGerman = module.id === "german";
                  const frameSize = (isNutrition || isStrava || isCalendar || isTasks || isWeather || isNotes || isHealth || isGerman) ? 90 : 50;
                  return (
                    <button
                      key={module.id}
                      ref={(el) => { iconRefs.current[module.id] = el; }}
                      data-module-icon
                      onClick={() => handleIconClick(module.id)}
                      onDoubleClick={() => handleIconDoubleClick(module.id, module.href)}
                      className={`relative transition-all bg-transparent border-none p-0 ${
                        isAvailable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-40"
                      }`}
                      style={{
                        width: `${frameSize}px`,
                        height: `${frameSize}px`,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        boxShadow: "none"
                      }}
                      title={module.name}
                    >
                      <div
                        className={`w-full h-full flex items-center justify-center transition-all rounded-full ${
                          isSelected ? "hud-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: isSelected ? currentTheme.primary : "transparent",
                          filter: isSelected
                            ? `drop-shadow(0 0 4px ${currentTheme.background}) drop-shadow(0 0 8px ${currentTheme.background}80)`
                            : `drop-shadow(0 0 3px ${currentTheme.primary}) drop-shadow(0 0 6px ${currentTheme.primary}60)`
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center rounded-full" style={{ background: "transparent", color: isSelected ? currentTheme.background : currentTheme.primary }}>
                          <StylizedIcon moduleId={module.id} size="text-xl" iconColor={isSelected ? currentTheme.background : currentTheme.primary} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area - Center Frame Only (no left panel) */}
            <div className="flex-1 flex items-center justify-center min-h-0 relative overflow-visible">
              <div
                ref={centerRef}
                className="w-80 h-80 md:w-96 md:h-96 flex items-center justify-center flex-shrink-0 overflow-visible"
                style={{ background: "transparent" }}
              >
                <img
                  src="/assets/jarvis-frame.png"
                  alt="JARVIS Frame"
                  className="jarvis-hud hud-element"
                  style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
                />
              </div>
            </div>
            {/* Wedge summary overlay - positioned relative to content area */}
            {wedgeModule && wedgeProps && (() => {
              const topModule = modules.find((m) => m.id === wedgeModule);
              const bottomModule = bottomModules.find((m) => m.id === wedgeModule);
              const href = topModule?.href ?? bottomModule?.href;
              if (!href) return null;
              const themeColor = wedgeModule === "alerts" && hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary;
              return (
                <div className="absolute inset-0 overflow-visible" style={{ zIndex: 20, pointerEvents: "none" }}>
                  <div style={{ pointerEvents: "auto", overflow: "visible" }}>
                    <WedgeSummaryCard
                      originX={wedgeProps.originX}
                      originY={wedgeProps.originY}
                      angleDeg={wedgeProps.angleDeg}
                      length={wedgeProps.length}
                      wedgeAngleDeg={wedgeProps.wedgeAngleDeg}
                      moduleHref={href}
                      themeColor={themeColor}
                      onNavigate={() => handleWedgeNavigate(wedgeModule)}
                      summaryLines={
                        wedgeModule === "alerts" ? (alertSummaries.length > 0 ? alertSummaries : ["No Current Alerts"])
                        : wedgeModule === "strava" ? (stravaSummary.length > 0 ? stravaSummary : undefined)
                        : undefined
                      }
                      noBullets={wedgeModule === "strava"}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Bottom Frames - Settings, Profile, Status, Notifications - z-30 so icons stay clickable */}
            <div className="flex-shrink-0 mt-4 relative z-30">
              <div className="flex items-center justify-center gap-4">
                {bottomModules.map((module) => {
                  const isSelected = wedgeModule === module.id;
                  const iconColor = module.id === "alerts" && hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary;
                  const BottomIcon = module.id === "settings" ? JarvisSettingsIcon : module.id === "profile" ? JarvisProfileIcon : module.id === "status" ? JarvisStatusIcon : JarvisAlertIcon;
                  return (
                    <button
                      key={module.id}
                      ref={(el) => { iconRefs.current[module.id] = el; }}
                      data-bottom-icon
                      onClick={() => handleIconClick(module.id)}
                      onDoubleClick={() => handleIconDoubleClick(module.id, module.href)}
                      className="flex items-center justify-center w-24 h-24 flex-shrink-0 p-2 transition-all hover:scale-105 focus:outline-none focus:ring-0 border-0 bg-transparent cursor-pointer"
                      title={module.name}
                    >
                      <div
                        className={`w-full h-full flex items-center justify-center transition-all rounded-full ${
                          isSelected ? "hud-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: isSelected ? iconColor : "transparent",
                          filter: isSelected
                            ? `drop-shadow(0 0 4px ${currentTheme.background}) drop-shadow(0 0 8px ${currentTheme.background}80)`
                            : `drop-shadow(0 0 3px ${iconColor}) drop-shadow(0 0 6px ${iconColor}60)`,
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center rounded-full" style={{ background: "transparent", color: isSelected ? currentTheme.background : iconColor }}>
                          <BottomIcon className="w-24 h-24" stroke={isSelected ? currentTheme.background : iconColor} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}
