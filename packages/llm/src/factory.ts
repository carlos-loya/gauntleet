import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { ProviderConfigError, type LLMProvider } from "./types.js";

export type Preset = "anthropic" | "openai" | "lmstudio" | "ollama" | "custom";
export type Role = "GENERATOR" | "VALIDATOR";

export interface ProviderConfig {
  preset: Preset;
  model: string;
  baseURL?: string;
  apiKey?: string;
}

interface OpenAICompatibleDefaults {
  baseURL: string;
  apiKey: string;
}

const PRESET_DEFAULTS: Record<"openai" | "lmstudio" | "ollama", OpenAICompatibleDefaults> = {
  openai: { baseURL: "https://api.openai.com/v1", apiKey: "" },
  lmstudio: { baseURL: "http://localhost:1234/v1", apiKey: "lm-studio" },
  ollama: { baseURL: "http://localhost:11434/v1", apiKey: "ollama" },
};

const PRESETS: readonly Preset[] = ["anthropic", "openai", "lmstudio", "ollama", "custom"];

function isPreset(value: string): value is Preset {
  return (PRESETS as readonly string[]).includes(value);
}

export function createProvider(config: ProviderConfig): LLMProvider {
  if (!config.model) throw new ProviderConfigError("model is required");

  if (config.preset === "anthropic") {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) throw new ProviderConfigError("ANTHROPIC_API_KEY is not set");
    return new AnthropicProvider({ apiKey, model: config.model });
  }

  if (config.preset === "custom") {
    if (!config.baseURL) {
      throw new ProviderConfigError("BASE_URL is required when preset=custom");
    }
    if (!config.apiKey) {
      throw new ProviderConfigError("API_KEY is required when preset=custom");
    }
    return new OpenAICompatibleProvider({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
    });
  }

  const defaults = PRESET_DEFAULTS[config.preset];
  const baseURL = config.baseURL ?? defaults.baseURL;
  let apiKey = config.apiKey ?? defaults.apiKey;

  if (config.preset === "openai" && !apiKey) {
    apiKey = process.env.OPENAI_API_KEY ?? "";
    if (!apiKey) throw new ProviderConfigError("OPENAI_API_KEY is not set");
  }

  return new OpenAICompatibleProvider({ baseURL, apiKey, model: config.model });
}

export function readProviderConfigFromEnv(role: Role): ProviderConfig {
  const presetRaw = (process.env[`${role}_PROVIDER`] ?? "").toLowerCase();
  if (!presetRaw) throw new ProviderConfigError(`${role}_PROVIDER is not set`);
  if (!isPreset(presetRaw)) {
    throw new ProviderConfigError(
      `${role}_PROVIDER must be one of ${PRESETS.join("|")} (got "${presetRaw}")`
    );
  }
  const preset: Preset = presetRaw;

  const model = process.env[`${role}_MODEL`];
  if (!model) throw new ProviderConfigError(`${role}_MODEL is not set`);

  const config: ProviderConfig = { preset, model };
  const baseURL = process.env[`${role}_BASE_URL`];
  const apiKey = process.env[`${role}_API_KEY`];
  if (baseURL) config.baseURL = baseURL;
  if (apiKey) config.apiKey = apiKey;
  return config;
}

export function createProviderFromEnv(role: Role): LLMProvider {
  return createProvider(readProviderConfigFromEnv(role));
}

export interface IndependenceCheck {
  independent: boolean;
  reason?: string;
}

export function checkIndependence(
  generator: LLMProvider,
  validator: LLMProvider
): IndependenceCheck {
  if (generator.familyId === validator.familyId) {
    return {
      independent: false,
      reason:
        `Generator and validator share the same backend (${generator.familyId}). ` +
        `Cross-validation is much weaker — both calls share the same training and inference biases. ` +
        `Use different model families (e.g., generator=anthropic, validator=lmstudio).`,
    };
  }
  return { independent: true };
}
