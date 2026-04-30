"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { topicLabel, type Topic } from "@gauntleet/core/topics";

type StatusFilter = "all" | "solved" | "attempted" | "unsolved";
type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "solved", label: "Solved" },
  { value: "attempted", label: "Attempted" },
  { value: "unsolved", label: "Not started" },
];

const DIFFICULTY_OPTIONS: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

interface ProblemFiltersProps {
  topics: Topic[];
  status: StatusFilter;
  difficulty: DifficultyFilter;
  topic: string;
}

export function ProblemFilters({ topics, status, difficulty, topic }: ProblemFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : (pathname ?? "/"));
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900/60 ${isPending ? "opacity-70" : ""}`}
    >
      <ChipGroup
        label="Status"
        options={STATUS_OPTIONS}
        value={status}
        onChange={(v) => updateParam("status", v)}
      />
      <Divider />
      <ChipGroup
        label="Difficulty"
        options={DIFFICULTY_OPTIONS}
        value={difficulty}
        onChange={(v) => updateParam("difficulty", v)}
      />
      <Divider />
      <label className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">
          Topic
        </span>
        <select
          value={topic}
          onChange={(e) => updateParam("topic", e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">All</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {topicLabel(t)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface ChipGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

function ChipGroup<T extends string>({ label, options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">
        {label}
      </span>
      <div className="flex gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={
                active
                  ? "rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                  : "rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />;
}
