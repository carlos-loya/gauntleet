import type { SampleTest } from "@gauntleet/db";

export function SampleTests({ tests }: { tests: SampleTest[] }) {
  return (
    <div className="space-y-3">
      {tests.map((t, i) => (
        <div
          key={i}
          className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mb-1 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Example {i + 1}
          </div>
          <div className="font-mono">
            <div>
              <span className="text-slate-500 dark:text-slate-400">input:</span>{" "}
              {JSON.stringify(t.input)}
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">output:</span>{" "}
              {JSON.stringify(t.expectedOutput)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
