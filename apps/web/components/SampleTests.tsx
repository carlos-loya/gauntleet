import type { SampleTest } from "@gauntleet/db";

export function SampleTests({ tests }: { tests: SampleTest[] }) {
  return (
    <div className="space-y-2.5">
      {tests.map((t, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Example {i + 1}
          </div>
          <dl className="space-y-1 font-mono text-xs">
            <div className="flex gap-3">
              <dt className="w-14 shrink-0 text-slate-500 dark:text-slate-400">input</dt>
              <dd className="break-all text-slate-700 dark:text-slate-300">
                {JSON.stringify(t.input)}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-14 shrink-0 text-slate-500 dark:text-slate-400">output</dt>
              <dd className="break-all text-slate-700 dark:text-slate-300">
                {JSON.stringify(t.expectedOutput)}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
