import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tweak how Gauntleet runs on this machine.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Coming in the next PR.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Default difficulty + topic, model overrides, sandbox limits, and a read-only
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800">
              .env.local
            </code>{" "}
            preview.
          </p>
        </div>
      </div>
    </main>
  );
}
