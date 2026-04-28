import type { Problem } from "@gauntleet/db";

const STYLES: Record<Problem["status"], string> = {
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
  validated: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function StatusBadge({ status }: { status: Problem["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
