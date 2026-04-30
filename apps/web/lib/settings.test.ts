import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  resolveProviderConfig,
  snapshotEnv,
  SANDBOX_MEMORY_DEFAULT,
  SANDBOX_TIMEOUT_DEFAULT,
} from "./settings-core.js";

describe("mergeSettings", () => {
  it("returns defaults when no rows are stored", () => {
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("layers known keys on top of defaults", () => {
    const result = mergeSettings([
      { key: "default_difficulty", value: "hard" },
      { key: "default_topic", value: "graph" },
      { key: "sandbox_timeout_ms", value: 8000 },
      { key: "sandbox_memory_mb", value: 512 },
      {
        key: "generator",
        value: { preset: "anthropic", model: "claude-3-opus", baseUrl: null },
      },
    ]);
    expect(result.defaultDifficulty).toBe("hard");
    expect(result.defaultTopic).toBe("graph");
    expect(result.sandboxTimeoutMs).toBe(8000);
    expect(result.sandboxMemoryMb).toBe(512);
    expect(result.generator).toEqual({
      preset: "anthropic",
      model: "claude-3-opus",
      baseUrl: null,
    });
    // Untouched keys still take their defaults.
    expect(result.validator).toEqual(DEFAULT_SETTINGS.validator);
  });

  it("ignores unknown keys", () => {
    const result = mergeSettings([{ key: "totally_made_up", value: "x" }]);
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back to defaults when stored values are malformed", () => {
    const result = mergeSettings([
      { key: "default_difficulty", value: "extra-spicy" },
      { key: "default_topic", value: 42 },
      { key: "sandbox_timeout_ms", value: -100 },
      { key: "sandbox_memory_mb", value: "two hundred" },
      { key: "generator", value: "not an object" },
    ]);
    expect(result.defaultDifficulty).toBeNull();
    expect(result.defaultTopic).toBeNull();
    expect(result.sandboxTimeoutMs).toBe(SANDBOX_TIMEOUT_DEFAULT);
    expect(result.sandboxMemoryMb).toBe(SANDBOX_MEMORY_DEFAULT);
    expect(result.generator).toEqual({ preset: null, model: null, baseUrl: null });
  });

  it("rejects non-preset values inside generator/validator overrides", () => {
    const result = mergeSettings([
      { key: "generator", value: { preset: "magic", model: "x", baseUrl: "" } },
    ]);
    expect(result.generator).toEqual({ preset: null, model: "x", baseUrl: null });
  });
});

describe("resolveProviderConfig", () => {
  const settingsNoOverrides = mergeSettings([]);
  const settingsWithOverrides = mergeSettings([
    {
      key: "generator",
      value: {
        preset: "lmstudio",
        model: "qwen3-coder-30b",
        baseUrl: "http://192.168.1.73:1234/v1",
      },
    },
  ]);

  it("uses env when no overrides are stored", () => {
    const config = resolveProviderConfig("GENERATOR", settingsNoOverrides, {
      GENERATOR_PROVIDER: "anthropic",
      GENERATOR_MODEL: "claude-3-opus",
    });
    expect(config).toEqual({ preset: "anthropic", model: "claude-3-opus" });
  });

  it("prefers settings overrides over env", () => {
    const config = resolveProviderConfig("GENERATOR", settingsWithOverrides, {
      GENERATOR_PROVIDER: "anthropic",
      GENERATOR_MODEL: "claude-3-opus",
      GENERATOR_BASE_URL: "https://example.com",
    });
    expect(config).toEqual({
      preset: "lmstudio",
      model: "qwen3-coder-30b",
      baseURL: "http://192.168.1.73:1234/v1",
    });
  });

  it("threads role-scoped API key through (never overridden by settings)", () => {
    const config = resolveProviderConfig("GENERATOR", settingsWithOverrides, {
      GENERATOR_API_KEY: "sk-from-env",
    });
    if ("error" in config) throw new Error("expected config, got error");
    expect(config.apiKey).toBe("sk-from-env");
  });

  it("returns an error when neither overrides nor env define a provider", () => {
    const config = resolveProviderConfig("VALIDATOR", settingsNoOverrides, {});
    expect("error" in config && config.error).toMatch(/VALIDATOR provider not configured/);
  });

  it("returns an error when the provider value is not a known preset", () => {
    const config = resolveProviderConfig("GENERATOR", settingsNoOverrides, {
      GENERATOR_PROVIDER: "vibes",
      GENERATOR_MODEL: "x",
    });
    expect("error" in config && config.error).toMatch(/must be one of/);
  });

  it("returns an error when model is missing", () => {
    const config = resolveProviderConfig("GENERATOR", settingsNoOverrides, {
      GENERATOR_PROVIDER: "anthropic",
    });
    expect("error" in config && config.error).toMatch(/model not configured/);
  });
});

describe("snapshotEnv", () => {
  it("redacts API keys to a boolean flag", () => {
    const snap = snapshotEnv({
      GENERATOR_PROVIDER: "anthropic",
      GENERATOR_MODEL: "claude-3-opus",
      GENERATOR_API_KEY: "sk-secret",
      ANTHROPIC_API_KEY: "sk-fallback",
    });
    expect(snap.generator).toEqual({
      provider: "anthropic",
      model: "claude-3-opus",
      baseUrl: null,
      apiKeySet: true,
    });
    expect(snap.anthropicApiKeySet).toBe(true);
    expect(snap.openaiApiKeySet).toBe(false);
  });

  it("flags both roles independently", () => {
    const snap = snapshotEnv({
      VALIDATOR_PROVIDER: "lmstudio",
      VALIDATOR_MODEL: "qwen",
    });
    expect(snap.generator.provider).toBeNull();
    expect(snap.validator.provider).toBe("lmstudio");
    expect(snap.validator.apiKeySet).toBe(false);
  });
});
