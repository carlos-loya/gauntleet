"use client";

import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { TOPICS, topicLabel } from "@gauntleet/core/topics";
import { saveSettingsAction, type SaveSettingsResult } from "../app/actions";
import type { EnvSnapshot, UserSettings } from "../lib/settings-core";

const PRESETS = ["anthropic", "openai", "lmstudio", "ollama", "custom"] as const;
type Preset = (typeof PRESETS)[number];

const INITIAL: SaveSettingsResult = { ok: false, message: "" };

interface SettingsFormProps {
  settings: UserSettings;
  envSnapshot: EnvSnapshot;
}

export function SettingsForm({ settings, envSnapshot }: SettingsFormProps) {
  const [state, formAction] = useActionState(saveSettingsAction, INITIAL);

  return (
    <form action={formAction} className="space-y-8">
      <Section title="Defaults" description="What the Generate form starts with on the home page.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Default difficulty" htmlFor="default_difficulty">
            <select
              id="default_difficulty"
              name="default_difficulty"
              defaultValue={settings.defaultDifficulty ?? ""}
              className={selectStyles}
            >
              <option value="">No default (choose each time)</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Default topic" htmlFor="default_topic">
            <select
              id="default_topic"
              name="default_topic"
              defaultValue={settings.defaultTopic ?? ""}
              className={selectStyles}
            >
              <option value="">No default (choose each time)</option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {topicLabel(t)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title="Generator model"
        description="Used to write new problems. Leave blank to use the .env.local value."
      >
        <ProviderFields
          role="generator"
          overrides={settings.generator}
          envProvider={envSnapshot.generator.provider}
          envModel={envSnapshot.generator.model}
          envBaseUrl={envSnapshot.generator.baseUrl}
        />
      </Section>

      <Section
        title="Validator model"
        description="Independently solves each problem to cross-check the generator. Should ideally be a different model family."
      >
        <ProviderFields
          role="validator"
          overrides={settings.validator}
          envProvider={envSnapshot.validator.provider}
          envModel={envSnapshot.validator.model}
          envBaseUrl={envSnapshot.validator.baseUrl}
        />
      </Section>

      <Section
        title="Sandbox limits"
        description="Applied to every Run, Submit, and validation execution."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Timeout (ms)" htmlFor="sandbox_timeout_ms">
            <input
              type="number"
              id="sandbox_timeout_ms"
              name="sandbox_timeout_ms"
              defaultValue={settings.sandboxTimeoutMs}
              min={100}
              max={60000}
              step={100}
              className={inputStyles}
            />
          </Field>
          <Field label="Memory (MB)" htmlFor="sandbox_memory_mb">
            <input
              type="number"
              id="sandbox_memory_mb"
              name="sandbox_memory_mb"
              defaultValue={settings.sandboxMemoryMb}
              min={32}
              max={4096}
              step={32}
              className={inputStyles}
            />
          </Field>
        </div>
      </Section>

      <Section
        title=".env.local snapshot"
        description="What the running process sees from the .env.local file. Read-only — edit the file and restart to change."
      >
        <EnvPanel snapshot={envSnapshot} />
      </Section>

      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
        {state.message ? (
          state.ok ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {state.message}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
              {state.message}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Settings persist in <code className="font-mono">data/gauntleet.db</code>.
          </span>
        )}
        <SaveButton />
      </div>
    </form>
  );
}

function ProviderFields({
  role,
  overrides,
  envProvider,
  envModel,
  envBaseUrl,
}: {
  role: "generator" | "validator";
  overrides: { preset: Preset | null; model: string | null; baseUrl: string | null };
  envProvider: string | null;
  envModel: string | null;
  envBaseUrl: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field
        label="Provider"
        htmlFor={`${role}_preset`}
        hint={envProvider ? `env: ${envProvider}` : undefined}
      >
        <select
          id={`${role}_preset`}
          name={`${role}_preset`}
          defaultValue={overrides.preset ?? ""}
          className={selectStyles}
        >
          <option value="">Use .env.local</option>
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Model"
        htmlFor={`${role}_model`}
        hint={envModel ? `env: ${envModel}` : undefined}
      >
        <input
          type="text"
          id={`${role}_model`}
          name={`${role}_model`}
          defaultValue={overrides.model ?? ""}
          placeholder={envModel ?? "e.g. claude-3-opus"}
          className={inputStyles}
        />
      </Field>
      <Field
        label="Base URL"
        htmlFor={`${role}_base_url`}
        hint={envBaseUrl ? `env: ${envBaseUrl}` : "preset default"}
      >
        <input
          type="text"
          id={`${role}_base_url`}
          name={`${role}_base_url`}
          defaultValue={overrides.baseUrl ?? ""}
          placeholder={envBaseUrl ?? "leave blank for preset default"}
          className={inputStyles}
        />
      </Field>
    </div>
  );
}

function EnvPanel({ snapshot }: { snapshot: EnvSnapshot }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
      <table className="w-full text-xs">
        <thead className="bg-slate-100/60 text-left text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            <th className="px-4 py-2 font-medium">Var</th>
            <th className="px-4 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 font-mono dark:divide-slate-800">
          <EnvRow name="GENERATOR_PROVIDER" value={snapshot.generator.provider} />
          <EnvRow name="GENERATOR_MODEL" value={snapshot.generator.model} />
          <EnvRow name="GENERATOR_BASE_URL" value={snapshot.generator.baseUrl} />
          <EnvRow name="GENERATOR_API_KEY" value={maskKey(snapshot.generator.apiKeySet)} />
          <EnvRow name="VALIDATOR_PROVIDER" value={snapshot.validator.provider} />
          <EnvRow name="VALIDATOR_MODEL" value={snapshot.validator.model} />
          <EnvRow name="VALIDATOR_BASE_URL" value={snapshot.validator.baseUrl} />
          <EnvRow name="VALIDATOR_API_KEY" value={maskKey(snapshot.validator.apiKeySet)} />
          <EnvRow name="ANTHROPIC_API_KEY" value={maskKey(snapshot.anthropicApiKeySet)} />
          <EnvRow name="OPENAI_API_KEY" value={maskKey(snapshot.openaiApiKeySet)} />
        </tbody>
      </table>
    </div>
  );
}

function EnvRow({ name, value }: { name: string; value: string | null }) {
  return (
    <tr>
      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{name}</td>
      <td className="px-4 py-2">
        {value === null ? (
          <span className="text-slate-400 dark:text-slate-600">unset</span>
        ) : (
          <span className="text-slate-700 dark:text-slate-200">{value}</span>
        )}
      </td>
    </tr>
  );
}

function maskKey(set: boolean): string | null {
  return set ? "(set)" : null;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-400 dark:text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save settings
        </>
      )}
    </button>
  );
}

const inputStyles =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono shadow-sm transition-colors hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-slate-600 dark:focus:border-slate-500";

const selectStyles =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-slate-600 dark:focus:border-slate-500";
