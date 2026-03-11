"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const JARVIS_HUB_URL = "/hub";

type NavigationProps = { linkClassName?: string };

export default function Navigation({ linkClassName }: NavigationProps) {
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
        className={linkClassName ?? "inline-block transition-transform hover:scale-110"}
        title="Return to JARVIS"
        aria-label="Return to JARVIS"
      >
        <img
          src="/assets/jarvis-frame.png"
          alt="JARVIS"
          className="jarvis-hud hud-element object-contain"
          style={{ width: 80, height: 80, minWidth: 80, minHeight: 80, background: "transparent", border: "none", boxShadow: "none" }}
        />
      </Link>
    </nav>
  );
}
