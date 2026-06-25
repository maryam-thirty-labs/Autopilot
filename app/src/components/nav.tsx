"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/loop", label: "Company Loop" },
  { href: "/dashboard", label: "Autopilot" },
  { href: "/scout", label: "Scout" },
  { href: "/submit", label: "Submit" },
  { href: "/safety", label: "Safety" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav>
      <Link href="/" className="brand">
        <span className="brand-pulse" />
        THIRTY LABS
      </Link>
      <div className="nav-links">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${active ? " active" : ""}`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      <div className="nav-right">
        <span className={`running-badge${isSupabaseConfigured ? "" : " demo"}`}>
          {isSupabaseConfigured ? "AUTOPILOT RUNNING" : "DEMO MODE"}
        </span>
      </div>
    </nav>
  );
}
