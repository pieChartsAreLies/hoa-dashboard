"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const tabs = [
  { label: "Map", href: "/" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Analytics", href: "/analytics" },
  { label: "Community", href: "/community" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Community Selector */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
          >
            <div className="flex flex-col items-start">
              <span className="text-lg font-semibold leading-tight tracking-tight text-white">
                Los Paseos of Via Verde
              </span>
              <span className="text-[11px] font-medium tracking-wide text-slate-400">
                Neighborhood Analytics
              </span>
            </div>
            <svg
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
              {/* Active community */}
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-white">
                <span className="h-2 w-2 shrink-0 rounded-full bg-teal-400" />
                Los Paseos of Via Verde
              </div>

              <hr className="my-1 border-slate-700" />

              {/* Disabled coming soon */}
              <div className="px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed">
                More communities coming soon
              </div>

              <hr className="my-1 border-slate-700" />

              {/* Request link */}
              <a
                href="mailto:michael@michaelgerstl.com"
                className="block px-4 py-2.5 text-xs text-teal-400 transition-colors hover:text-teal-300"
              >
                Request your community
              </a>
            </div>
          )}
        </div>

        {/* Tabs + Methodology */}
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

          {/* Subtle separator */}
          <span className="mx-1.5 h-4 w-px bg-slate-700" />

          {/* Methodology link - styled subtly */}
          <Link
            href="/methodology"
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              pathname === "/methodology"
                ? "bg-teal-500/15 text-teal-400"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            Methodology
          </Link>
        </div>
      </div>
    </nav>
  );
}
