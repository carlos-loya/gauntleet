import { Clock } from "lucide-react";
import type { Submission } from "@gauntleet/db";
import { VerdictBadge } from "./VerdictBadge";

export function SubmissionHistory({ submissions }: { submissions: Submission[] }) {
  if (submissions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No submissions yet. Hit Submit to grade your code against random inputs.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {submissions.map((s) => (
        <li
          key={s.id}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="flex items-center justify-between gap-2">
            <VerdictBadge verdict={s.verdict} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {formatRelative(s.createdAt)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-mono">
              {s.testsPassed}/{s.testsTotal} tests
            </span>
            {s.runtimeMs !== null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {s.runtimeMs}ms
              </span>
            )}
            {s.failedAtIndex !== null && (
              <span className="font-mono text-rose-600 dark:text-rose-400">
                failed @ test {s.failedAtIndex}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const t = date.getTime();
  const diffSec = Math.max(0, Math.round((now - t) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
