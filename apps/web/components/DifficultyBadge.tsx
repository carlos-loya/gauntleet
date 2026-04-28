import type { Problem } from "@gauntleet/db";

const STYLES: Record<Problem["difficulty"], { wrap: string; dot: string }> = {
  easy: {
    wrap: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  medium: {
    wrap: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  hard: {
    wrap: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20",
    dot: "bg-rose-500",
  },
};

export function DifficultyBadge({ difficulty }: { difficulty: Problem["difficulty"] }) {
  const s = STYLES[difficulty];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${s.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {difficulty}
    </span>
  );
}
