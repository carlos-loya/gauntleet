import type { Verdict } from "@gauntleet/db";

const STYLES: Record<Verdict, string> = {
  accepted:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-400/20",
  wrong_answer:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20",
  runtime_error:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-400/20",
  time_limit_exceeded:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-400/20",
  memory_limit_exceeded:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-400/20",
};

const LABELS: Record<Verdict, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  runtime_error: "Runtime Error",
  time_limit_exceeded: "Time Limit",
  memory_limit_exceeded: "Memory Limit",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[verdict]}`}
    >
      {LABELS[verdict]}
    </span>
  );
}
