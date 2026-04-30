import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { ProblemUserStatus } from "../lib/problem-status";

const LABELS: Record<ProblemUserStatus, string> = {
  solved: "Solved",
  attempted: "Attempted",
  unsolved: "Not started",
};

const SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
} as const;

interface StatusIconProps {
  status: ProblemUserStatus;
  size?: keyof typeof SIZES;
  withLabel?: boolean;
}

export function StatusIcon({ status, size = "sm", withLabel = false }: StatusIconProps) {
  const sizeClass = SIZES[size];
  const icon =
    status === "solved" ? (
      <CheckCircle2 className={`${sizeClass} text-emerald-600 dark:text-emerald-400`} />
    ) : status === "attempted" ? (
      <CircleDot className={`${sizeClass} text-amber-500 dark:text-amber-400`} />
    ) : (
      <Circle className={`${sizeClass} text-slate-300 dark:text-slate-600`} />
    );
  if (!withLabel) {
    return (
      <span className="inline-flex" title={LABELS[status]} aria-label={LABELS[status]}>
        {icon}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      {icon}
      {LABELS[status]}
    </span>
  );
}
