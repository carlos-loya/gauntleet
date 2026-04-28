import type { Problem } from "@gauntleet/db";

const STYLES: Record<Problem["status"], string> = {
  draft:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-400/20",
  validated:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-400/20",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20",
};

export function StatusBadge({ status }: { status: Problem["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
