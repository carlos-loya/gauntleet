import type { Preset, ProviderConfig, Role } from "@gauntleet/llm";

export type Difficulty = "easy" | "medium" | "hard";

const PRESETS: readonly Preset[] = ["anthropic", "openai", "lmstudio", "ollama", "custom"];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export const PROVIDER_PRESETS: readonly Preset[] = PRESETS;

export interface ProviderOverrides {
  preset: Preset | null;
  model: string | null;
  baseUrl: string | null;
}

export interface UserSettings {
  defaultDifficulty: Difficulty | null;
  /** Topic slug. Validated against the closed TOPICS set at the page boundary, not here. */
  defaultTopic: string | null;
  generator: ProviderOverrides;
  validator: ProviderOverrides;
  sandboxTimeoutMs: number;
  sandboxMemoryMb: number;
}

export const SANDBOX_TIMEOUT_DEFAULT = 5_000;
export const SANDBOX_MEMORY_DEFAULT = 256;

export const DEFAULT_SETTINGS: UserSettings = {
  defaultDifficulty: null,
  defaultTopic: null,
  generator: { preset: null, model: null, baseUrl: null },
  validator: { preset: null, model: null, baseUrl: null },
  sandboxTimeoutMs: SANDBOX_TIMEOUT_DEFAULT,
  sandboxMemoryMb: SANDBOX_MEMORY_DEFAULT,
};

/**
 * Merge a list of stored key/value rows on top of the defaults. Pure so it
 * can be unit-tested without a DB. Unknown keys are ignored; malformed values
 * fall back to the default for that key (we'd rather render a working UI than
 * crash if the JSON column is corrupted).
 */
export function mergeSettings(rows: { key: string; value: unknown }[]): UserSettings {
  const out: UserSettings = {
    ...DEFAULT_SETTINGS,
    generator: { ...DEFAULT_SETTINGS.generator },
    validator: { ...DEFAULT_SETTINGS.validator },
  };
  for (const row of rows) {
    switch (row.key) {
      case "default_difficulty":
        out.defaultDifficulty = parseDifficulty(row.value);
        break;
      case "default_topic":
        out.defaultTopic = parseString(row.value);
        break;
      case "generator":
        out.generator = parseProviderOverrides(row.value);
        break;
      case "validator":
        out.validator = parseProviderOverrides(row.value);
        break;
      case "sandbox_timeout_ms":
        out.sandboxTimeoutMs = parsePositiveInt(row.value, SANDBOX_TIMEOUT_DEFAULT);
        break;
      case "sandbox_memory_mb":
        out.sandboxMemoryMb = parsePositiveInt(row.value, SANDBOX_MEMORY_DEFAULT);
        break;
    }
  }
  return out;
}

/**
 * Build a fully-resolved ProviderConfig for the given role by layering:
 *   settings override → env vars → preset defaults (handled inside createProvider).
 *
 * Pure on its inputs (we pass `env` instead of touching process.env) so the
 * fallback logic is unit-testable.
 */
export function resolveProviderConfig(
  role: Role,
  settings: UserSettings,
  env: Record<string, string | undefined>
): ProviderConfig | { error: string } {
  const overrides = role === "GENERATOR" ? settings.generator : settings.validator;

  const presetRaw = overrides.preset ?? env[`${role}_PROVIDER`]?.toLowerCase();
  if (!presetRaw) {
    return { error: `${role} provider not configured: set it in Settings or ${role}_PROVIDER` };
  }
  if (!isPreset(presetRaw)) {
    return { error: `${role} provider must be one of ${PRESETS.join("|")} (got "${presetRaw}")` };
  }

  const model = overrides.model ?? env[`${role}_MODEL`];
  if (!model) {
    return { error: `${role} model not configured: set it in Settings or ${role}_MODEL` };
  }

  const baseUrl = overrides.baseUrl ?? env[`${role}_BASE_URL`];
  // API keys are intentionally NEVER overridden via settings — they stay in
  // the .env.local file. Pull from env at the role-level first so role-scoped
  // keys win over the shared ANTHROPIC_API_KEY / OPENAI_API_KEY fallbacks
  // that createProvider reads internally.
  const apiKey = env[`${role}_API_KEY`];

  const config: ProviderConfig = { preset: presetRaw, model };
  if (baseUrl) config.baseURL = baseUrl;
  if (apiKey) config.apiKey = apiKey;
  return config;
}

/**
 * Snapshot of which provider env vars are present, with API keys reduced to a
 * boolean flag. Used by the read-only env panel on the settings page so users
 * can see what `.env.local` is contributing without exposing secrets.
 */
export interface EnvSnapshot {
  generator: {
    provider: string | null;
    model: string | null;
    baseUrl: string | null;
    apiKeySet: boolean;
  };
  validator: {
    provider: string | null;
    model: string | null;
    baseUrl: string | null;
    apiKeySet: boolean;
  };
  anthropicApiKeySet: boolean;
  openaiApiKeySet: boolean;
}

export function snapshotEnv(env: Record<string, string | undefined>): EnvSnapshot {
  const role = (r: Role) => ({
    provider: env[`${r}_PROVIDER`] ?? null,
    model: env[`${r}_MODEL`] ?? null,
    baseUrl: env[`${r}_BASE_URL`] ?? null,
    apiKeySet: Boolean(env[`${r}_API_KEY`]),
  });
  return {
    generator: role("GENERATOR"),
    validator: role("VALIDATOR"),
    anthropicApiKeySet: Boolean(env["ANTHROPIC_API_KEY"]),
    openaiApiKeySet: Boolean(env["OPENAI_API_KEY"]),
  };
}

// Parsers ─────────────────────────────────────────────────────────────────────

function isPreset(v: string): v is Preset {
  return (PRESETS as readonly string[]).includes(v);
}

function parseDifficulty(v: unknown): Difficulty | null {
  if (typeof v !== "string") return null;
  return (DIFFICULTIES as readonly string[]).includes(v) ? (v as Difficulty) : null;
}

function parseString(v: unknown): string | null {
  if (typeof v !== "string" || v.length === 0) return null;
  return v;
}

function parsePositiveInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  return fallback;
}

function parseProviderOverrides(v: unknown): ProviderOverrides {
  if (!v || typeof v !== "object") return { preset: null, model: null, baseUrl: null };
  const o = v as Record<string, unknown>;
  const preset = typeof o.preset === "string" && isPreset(o.preset) ? o.preset : null;
  const model = typeof o.model === "string" && o.model.length > 0 ? o.model : null;
  const baseUrl = typeof o.baseUrl === "string" && o.baseUrl.length > 0 ? o.baseUrl : null;
  return { preset, model, baseUrl };
}
