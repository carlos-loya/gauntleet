"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Braces, ListChecks, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Problems", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 md:flex dark:border-slate-800 dark:bg-slate-950/40">
      <Link
        href="/"
        className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-base font-semibold tracking-tight text-slate-900 transition-colors hover:text-slate-700 dark:border-slate-800 dark:text-slate-100 dark:hover:text-slate-300"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-slate-100 shadow-sm dark:bg-slate-100 dark:text-slate-900">
          <Braces className="h-4 w-4" strokeWidth={2.5} />
        </span>
        Gauntleet
      </Link>
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-2.5 rounded-md bg-slate-200/70 px-3 py-2 text-sm font-medium text-slate-900 dark:bg-slate-800/70 dark:text-slate-100"
                  : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200"
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 px-5 py-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Local-first MVP
      </div>
    </aside>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname.startsWith("/p/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
