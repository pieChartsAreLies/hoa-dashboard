"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Map", href: "/" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Analytics", href: "/analytics" },
  { label: "Community", href: "/community" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex flex-col justify-center">
          <span className="text-lg font-semibold tracking-tight text-white">
            Los Paseos Dashboard
          </span>
          <span className="-mt-1 text-[11px] font-medium tracking-wide text-slate-400">
            Neighborhood Analytics
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-500/15 text-teal-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
