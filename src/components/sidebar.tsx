"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/auth";

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/youth-mps", label: "Youth MPs" },
  { href: "/dashboard/appointees", label: "Appointees" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/proposals", label: "Project Proposals" },
  { href: "/dashboard/project-reports", label: "Project Reports" },
  { href: "/dashboard/letters", label: "Letters & Correspondence" },
  { href: "/dashboard/action-plans", label: "Action Plans" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/reports", label: "Reports & Analytics" },
  { href: "/dashboard/activity-log", label: "Activity Log" },
  { href: "/dashboard/settings", label: "Settings", roles: ["super_admin"] },
];

export function Sidebar({ role, fullName, roleLabel }: { role: Role; fullName: string; roleLabel: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col bg-forest-950 text-paper">
      <div className="border-b border-forest-800 px-5 py-5">
        <p className="font-serif text-sm font-semibold leading-tight">Youth Parliament Ghana</p>
        <p className="mt-0.5 text-xs text-gold-200/80">Programmes, Projects &amp; Logistics</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {items.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 flex items-center rounded px-3 py-2 text-sm transition-colors ${
                active ? "bg-forest-800 text-paper" : "text-paper/70 hover:bg-forest-900 hover:text-paper"
              } ${active ? "border-l-2 border-gold-500" : "border-l-2 border-transparent"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-forest-800 px-4 py-4">
        <p className="truncate text-sm font-medium">{fullName}</p>
        <p className="text-xs text-gold-200/80">{roleLabel}</p>
        <button onClick={logout} className="mt-3 text-xs text-paper/60 underline hover:text-paper">
          Log out
        </button>
      </div>
    </aside>
  );
}
