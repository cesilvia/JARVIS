"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const JARVIS_HUB_URL = "/hub";

export default function Navigation() {
  const pathname = usePathname();
  const isHubPage = pathname === "/hub";

  // Don't show on hub since we're already there
  if (isHubPage) {
    return null;
  }

  return (
    <nav className="mb-6">
      <Link
        href={JARVIS_HUB_URL}
        className="inline-flex items-center px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        Return to JARVIS
      </Link>
    </nav>
  );
}
