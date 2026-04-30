import { Settings as SettingsIcon } from "lucide-react";
import { SettingsForm } from "../../components/SettingsForm";
import { ensureEnv } from "../../lib/env";
import { getSettings, snapshotEnv } from "../../lib/settings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  ensureEnv();
  const settings = getSettings();
  const envSnapshot = snapshotEnv(process.env);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <SettingsIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tweak how Gauntleet runs on this machine. Overrides win over{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800">
                .env.local
              </code>
              .
            </p>
          </div>
        </div>
        <SettingsForm settings={settings} envSnapshot={envSnapshot} />
      </div>
    </main>
  );
}
