import Link from "next/link";
import { Braces } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-slate-100 shadow-sm dark:bg-slate-100 dark:text-slate-900">
            <Braces className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Gauntleet
        </Link>
        <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
          AI-generated algorithm practice
        </p>
      </div>
    </header>
  );
}
