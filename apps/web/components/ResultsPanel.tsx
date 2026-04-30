"use client";

import { AlertTriangle, CheckCircle2, Clock, Cpu, XCircle } from "lucide-react";
import type { GradeResult, TestCaseResult } from "@gauntleet/core";
import { VerdictBadge } from "./VerdictBadge";

export function ResultsPanel({ mode, grade }: { mode: "run" | "submit"; grade: GradeResult }) {
  const headline =
    mode === "run"
      ? `Run · ${grade.testsPassed}/${grade.testsTotal} sample tests`
      : `Submit · ${grade.testsPassed}/${grade.testsTotal} tests`;

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <VerdictBadge verdict={grade.verdict} />
          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {headline}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          {grade.runtimeMs}ms
        </span>
      </div>

      {grade.failureNote && grade.verdict !== "accepted" && (
        <pre className="mb-3 overflow-x-auto rounded-md border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {grade.failureNote}
        </pre>
      )}

      {grade.verdict === "runtime_error" && grade.results.length === 0 && grade.stderr && (
        <details className="mb-3 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
          <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              stderr
            </span>
          </summary>
          <pre className="overflow-x-auto px-3 pb-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
            {grade.stderr}
          </pre>
        </details>
      )}

      {grade.results.length > 0 && (
        <ul className="space-y-1.5">
          {grade.results.map((r, i) => (
            <CaseRow key={i} index={i} result={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseRow({ index, result }: { index: number; result: TestCaseResult }) {
  const ok = result.ok;
  return (
    <li
      className={
        ok
          ? "rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "rounded-md border border-rose-200 bg-rose-50/50 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/20"
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          {ok ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : result.error ? (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-slate-700 dark:text-slate-200">Test {index}</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {ok ? "passed" : result.error ? "runtime error" : "wrong answer"}
        </span>
      </div>
      <dl className="space-y-0.5 font-mono text-[11px]">
        <Row label="input" value={JSON.stringify(result.input)} />
        <Row label="expected" value={JSON.stringify(result.expected)} />
        {result.error ? (
          <Row label="error" value={result.error} tone="error" />
        ) : (
          <Row label="got" value={JSON.stringify(result.actual)} tone={ok ? undefined : "error"} />
        )}
      </dl>
    </li>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "error" }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={
          tone === "error"
            ? "break-all text-rose-700 dark:text-rose-300"
            : "break-all text-slate-700 dark:text-slate-300"
        }
      >
        {value}
      </dd>
    </div>
  );
}
