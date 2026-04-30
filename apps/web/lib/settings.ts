import "server-only";
import { settings as settingsTable, type Db } from "@gauntleet/db";
import { getDb } from "./db.js";
import {
  mergeSettings,
  type Difficulty,
  type ProviderOverrides,
  type UserSettings,
} from "./settings-core.js";

export {
  DEFAULT_SETTINGS,
  PROVIDER_PRESETS,
  SANDBOX_MEMORY_DEFAULT,
  SANDBOX_TIMEOUT_DEFAULT,
  mergeSettings,
  resolveProviderConfig,
  snapshotEnv,
  type Difficulty,
  type EnvSnapshot,
  type ProviderOverrides,
  type UserSettings,
} from "./settings-core.js";

export function getSettings(db: Db = getDb()): UserSettings {
  const rows = db.select().from(settingsTable).all();
  return mergeSettings(rows);
}

export interface SettingsUpdate {
  defaultDifficulty?: Difficulty | null;
  defaultTopic?: string | null;
  generator?: ProviderOverrides;
  validator?: ProviderOverrides;
  sandboxTimeoutMs?: number;
  sandboxMemoryMb?: number;
}

export function updateSettings(db: Db, patch: SettingsUpdate): void {
  const now = new Date();
  const upsert = (key: string, value: unknown) => {
    db.insert(settingsTable)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: now } })
      .run();
  };
  if (patch.defaultDifficulty !== undefined) upsert("default_difficulty", patch.defaultDifficulty);
  if (patch.defaultTopic !== undefined) upsert("default_topic", patch.defaultTopic);
  if (patch.generator !== undefined) upsert("generator", patch.generator);
  if (patch.validator !== undefined) upsert("validator", patch.validator);
  if (patch.sandboxTimeoutMs !== undefined) upsert("sandbox_timeout_ms", patch.sandboxTimeoutMs);
  if (patch.sandboxMemoryMb !== undefined) upsert("sandbox_memory_mb", patch.sandboxMemoryMb);
}
