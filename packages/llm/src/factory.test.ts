import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnthropicProvider } from "./anthropic.js";
import {
  checkIndependence,
  createProvider,
  createProviderFromEnv,
  readProviderConfigFromEnv,
} from "./factory.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { ProviderConfigError } from "./types.js";

const RELEVANT_ENV = [
  "GENERATOR_PROVIDER",
  "GENERATOR_MODEL",
  "GENERATOR_BASE_URL",
  "GENERATOR_API_KEY",
  "VALIDATOR_PROVIDER",
  "VALIDATOR_MODEL",
  "VALIDATOR_BASE_URL",
  "VALIDATOR_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
];

describe("createProvider", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const k of RELEVANT_ENV) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of RELEVANT_ENV) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  describe("anthropic preset", () => {
    it("uses ANTHROPIC_API_KEY from env when no apiKey is given", () => {
      process.env.ANTHROPIC_API_KEY = "from-env";
      const p = createProvider({ preset: "anthropic", model: "claude-x" });
      expect(p).toBeInstanceOf(AnthropicProvider);
      expect(p.model).toBe("claude-x");
      expect(p.familyId).toBe("anthropic");
    });

    it("uses an explicit apiKey over the env var", () => {
      process.env.ANTHROPIC_API_KEY = "from-env";
      const p = createProvider({ preset: "anthropic", model: "claude-x", apiKey: "explicit" });
      expect(p).toBeInstanceOf(AnthropicProvider);
    });

    it("throws when neither apiKey nor ANTHROPIC_API_KEY is set", () => {
      expect(() => createProvider({ preset: "anthropic", model: "claude-x" })).toThrow(
        ProviderConfigError
      );
    });

    it("throws when model is missing", () => {
      expect(() => createProvider({ preset: "anthropic", model: "", apiKey: "k" })).toThrow(
        /model is required/
      );
    });
  });

  describe("openai preset", () => {
    it("uses defaults + OPENAI_API_KEY from env", () => {
      process.env.OPENAI_API_KEY = "from-env";
      const p = createProvider({ preset: "openai", model: "gpt-4o" });
      expect(p).toBeInstanceOf(OpenAICompatibleProvider);
      expect(p.familyId).toBe("https://api.openai.com/v1");
    });

    it("throws when OPENAI_API_KEY is missing and no apiKey given", () => {
      expect(() => createProvider({ preset: "openai", model: "gpt-4o" })).toThrow(
        ProviderConfigError
      );
    });
  });

  describe("lmstudio preset", () => {
    it("supplies localhost:1234/v1 + 'lm-studio' key by default", () => {
      const p = createProvider({ preset: "lmstudio", model: "qwen3" });
      expect(p).toBeInstanceOf(OpenAICompatibleProvider);
      expect(p.familyId).toBe("http://localhost:1234/v1");
    });

    it("honors explicit baseURL override", () => {
      const p = createProvider({
        preset: "lmstudio",
        model: "qwen3",
        baseURL: "http://lan.local:1234/v1",
      });
      expect(p.familyId).toBe("http://lan.local:1234/v1");
    });
  });

  describe("ollama preset", () => {
    it("supplies localhost:11434/v1 + 'ollama' key by default", () => {
      const p = createProvider({ preset: "ollama", model: "llama3" });
      expect(p).toBeInstanceOf(OpenAICompatibleProvider);
      expect(p.familyId).toBe("http://localhost:11434/v1");
    });
  });

  describe("custom preset", () => {
    it("requires baseURL", () => {
      expect(() => createProvider({ preset: "custom", model: "x", apiKey: "k" })).toThrow(
        /BASE_URL is required/
      );
    });

    it("requires apiKey", () => {
      expect(() =>
        createProvider({ preset: "custom", model: "x", baseURL: "http://x/v1" })
      ).toThrow(/API_KEY is required/);
    });

    it("constructs an OpenAICompatibleProvider when both are provided", () => {
      const p = createProvider({
        preset: "custom",
        model: "x",
        baseURL: "http://x/v1",
        apiKey: "k",
      });
      expect(p).toBeInstanceOf(OpenAICompatibleProvider);
      expect(p.familyId).toBe("http://x/v1");
    });
  });
});

describe("readProviderConfigFromEnv", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const k of RELEVANT_ENV) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of RELEVANT_ENV) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("reads preset, model, baseURL, apiKey for the given role", () => {
    process.env.GENERATOR_PROVIDER = "lmstudio";
    process.env.GENERATOR_MODEL = "qwen3";
    process.env.GENERATOR_BASE_URL = "http://1.2.3.4:1234/v1";
    process.env.GENERATOR_API_KEY = "lm-studio";
    const cfg = readProviderConfigFromEnv("GENERATOR");
    expect(cfg).toEqual({
      preset: "lmstudio",
      model: "qwen3",
      baseURL: "http://1.2.3.4:1234/v1",
      apiKey: "lm-studio",
    });
  });

  it("omits baseURL/apiKey when not set", () => {
    process.env.GENERATOR_PROVIDER = "anthropic";
    process.env.GENERATOR_MODEL = "claude-x";
    const cfg = readProviderConfigFromEnv("GENERATOR");
    expect(cfg.preset).toBe("anthropic");
    expect(cfg.model).toBe("claude-x");
    expect(cfg.baseURL).toBeUndefined();
    expect(cfg.apiKey).toBeUndefined();
  });

  it("normalizes the preset to lowercase", () => {
    process.env.GENERATOR_PROVIDER = "LMStudio";
    process.env.GENERATOR_MODEL = "qwen3";
    const cfg = readProviderConfigFromEnv("GENERATOR");
    expect(cfg.preset).toBe("lmstudio");
  });

  it("throws when GENERATOR_PROVIDER is missing", () => {
    process.env.GENERATOR_MODEL = "qwen3";
    expect(() => readProviderConfigFromEnv("GENERATOR")).toThrow(/GENERATOR_PROVIDER/);
  });

  it("throws when GENERATOR_MODEL is missing", () => {
    process.env.GENERATOR_PROVIDER = "lmstudio";
    expect(() => readProviderConfigFromEnv("GENERATOR")).toThrow(/GENERATOR_MODEL/);
  });

  it("throws when preset is not a known value", () => {
    process.env.GENERATOR_PROVIDER = "made-up";
    process.env.GENERATOR_MODEL = "x";
    expect(() => readProviderConfigFromEnv("GENERATOR")).toThrow(
      /must be one of anthropic\|openai\|lmstudio\|ollama\|custom/
    );
  });

  it("uses VALIDATOR_ prefix for the validator role", () => {
    process.env.VALIDATOR_PROVIDER = "ollama";
    process.env.VALIDATOR_MODEL = "llama3";
    const cfg = readProviderConfigFromEnv("VALIDATOR");
    expect(cfg.preset).toBe("ollama");
    expect(cfg.model).toBe("llama3");
  });
});

describe("createProviderFromEnv", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const k of RELEVANT_ENV) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of RELEVANT_ENV) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("ties readProviderConfigFromEnv and createProvider together", () => {
    process.env.GENERATOR_PROVIDER = "lmstudio";
    process.env.GENERATOR_MODEL = "qwen3";
    const p = createProviderFromEnv("GENERATOR");
    expect(p).toBeInstanceOf(OpenAICompatibleProvider);
    expect(p.model).toBe("qwen3");
  });
});

describe("checkIndependence", () => {
  it("flags two anthropic providers as non-independent", () => {
    const a = createProvider({ preset: "anthropic", model: "claude-x", apiKey: "k" });
    const b = createProvider({ preset: "anthropic", model: "claude-y", apiKey: "k" });
    const result = checkIndependence(a, b);
    expect(result.independent).toBe(false);
    expect(result.reason).toMatch(/same backend/);
  });

  it("flags two providers sharing the same baseURL as non-independent", () => {
    const a = createProvider({ preset: "lmstudio", model: "qwen3" });
    const b = createProvider({ preset: "lmstudio", model: "llama3" });
    const result = checkIndependence(a, b);
    expect(result.independent).toBe(false);
  });

  it("considers different baseURLs independent even if both are openai-compatible", () => {
    const a = createProvider({ preset: "lmstudio", model: "qwen3" });
    const b = createProvider({ preset: "ollama", model: "llama3" });
    const result = checkIndependence(a, b);
    expect(result.independent).toBe(true);
  });

  it("considers anthropic + lmstudio independent", () => {
    const a = createProvider({ preset: "anthropic", model: "claude-x", apiKey: "k" });
    const b = createProvider({ preset: "lmstudio", model: "qwen3" });
    const result = checkIndependence(a, b);
    expect(result.independent).toBe(true);
  });
});
