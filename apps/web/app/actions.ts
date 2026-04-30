"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  generateProblem,
  GenerationError,
  GradeError,
  gradeSubmission,
  runAgainstSamples,
  validateProblem,
  ValidationError,
  type GradeResult,
} from "@gauntleet/core";
import { checkIndependence, createProvider, type LLMProvider, type Role } from "@gauntleet/llm";
import { ensureEnv } from "../lib/env";
import { getDb, getProblem } from "../lib/db";
import { parseGenerateInput } from "../lib/parse-input";
import { getSettings, resolveProviderConfig, updateSettings } from "../lib/settings";
import type { ProviderOverrides, UserSettings } from "../lib/settings-core";
import { isTopic, TOPICS } from "@gauntleet/core/topics";

export interface GenerateState {
  status: "idle" | "error";
  message: string;
}

function buildProvider(role: Role, settings: UserSettings): LLMProvider | { error: string } {
  const config = resolveProviderConfig(role, settings, process.env);
  if ("error" in config) return config;
  try {
    return createProvider(config);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function generateNewProblem(
  _prevState: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  ensureEnv();
  const parsed = parseGenerateInput({
    difficulty: formData.get("difficulty"),
    topic: formData.get("topic"),
  });
  if (!parsed.ok) {
    return { status: "error", message: parsed.error };
  }

  const db = getDb();
  const settings = getSettings(db);

  const generator = buildProvider("GENERATOR", settings);
  if ("error" in generator) {
    return { status: "error", message: `Generator config error: ${generator.error}` };
  }
  const validator = buildProvider("VALIDATOR", settings);
  if ("error" in validator) {
    return { status: "error", message: `Validator config error: ${validator.error}` };
  }

  const independence = checkIndependence(generator, validator);
  // Independence is informational here; we still proceed even when shared.
  // The CLI prints the warning; the UI surfaces it on the problem page.
  void independence;

  let problemId: string;
  try {
    const problem = await generateProblem({ generator, db, input: parsed.value });
    problemId = problem.id;
  } catch (err) {
    if (err instanceof GenerationError) {
      return { status: "error", message: `Generation failed: ${err.message}` };
    }
    throw err;
  }

  try {
    await validateProblem({
      validator,
      db,
      problemId,
      seedCount: 20,
      solutionTimeoutMs: settings.sandboxTimeoutMs,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return { status: "error", message: `Validation crashed: ${err.message}` };
    }
    throw err;
  }

  redirect(`/p/${problemId}`);
}

export type RunActionResult = { ok: true; grade: GradeResult } | { ok: false; error: string };

const MAX_CODE_LENGTH = 100_000;

function validateCode(code: unknown): { ok: true; code: string } | { ok: false; error: string } {
  if (typeof code !== "string") return { ok: false, error: "code must be a string" };
  if (!code.trim()) return { ok: false, error: "code is empty" };
  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, error: `code exceeds ${MAX_CODE_LENGTH} characters` };
  }
  return { ok: true, code };
}

export async function runUserCodeAction(problemId: string, code: string): Promise<RunActionResult> {
  ensureEnv();
  const codeCheck = validateCode(code);
  if (!codeCheck.ok) return { ok: false, error: codeCheck.error };

  const problem = getProblem(problemId);
  if (!problem) return { ok: false, error: "problem not found" };

  const settings = getSettings();
  try {
    const grade = await runAgainstSamples({
      problem,
      code: codeCheck.code,
      timeoutMs: settings.sandboxTimeoutMs,
      memoryMb: settings.sandboxMemoryMb,
    });
    return { ok: true, grade };
  } catch (err) {
    return { ok: false, error: `run failed: ${(err as Error).message}` };
  }
}

export async function submitUserCodeAction(
  problemId: string,
  code: string
): Promise<RunActionResult> {
  ensureEnv();
  const codeCheck = validateCode(code);
  if (!codeCheck.ok) return { ok: false, error: codeCheck.error };

  const problem = getProblem(problemId);
  if (!problem) return { ok: false, error: "problem not found" };

  const db = getDb();
  const settings = getSettings(db);
  try {
    const { grade } = await gradeSubmission({
      db,
      problemId,
      code: codeCheck.code,
      timeoutMs: settings.sandboxTimeoutMs,
      memoryMb: settings.sandboxMemoryMb,
    });
    revalidatePath(`/p/${problemId}`);
    return { ok: true, grade };
  } catch (err) {
    if (err instanceof GradeError) {
      return { ok: false, error: `grading crashed: ${err.message}` };
    }
    throw err;
  }
}

export interface SaveSettingsResult {
  ok: boolean;
  message: string;
}

export async function saveSettingsAction(
  _prevState: SaveSettingsResult,
  formData: FormData
): Promise<SaveSettingsResult> {
  ensureEnv();
  const parsed = parseSettingsForm(formData);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  try {
    updateSettings(getDb(), parsed.value);
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true, message: "Settings saved." };
}

interface ParsedSettingsForm {
  defaultDifficulty: UserSettings["defaultDifficulty"];
  defaultTopic: UserSettings["defaultTopic"];
  generator: ProviderOverrides;
  validator: ProviderOverrides;
  sandboxTimeoutMs: number;
  sandboxMemoryMb: number;
}

function parseSettingsForm(
  fd: FormData
): { ok: true; value: ParsedSettingsForm } | { ok: false; error: string } {
  const difficultyRaw = String(fd.get("default_difficulty") ?? "");
  const difficulty: UserSettings["defaultDifficulty"] =
    difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
      ? difficultyRaw
      : null;

  const topicRaw = String(fd.get("default_topic") ?? "");
  const topic: UserSettings["defaultTopic"] =
    topicRaw === "" ? null : isTopic(topicRaw) ? topicRaw : null;
  if (topicRaw !== "" && !isTopic(topicRaw)) {
    return { ok: false, error: `default topic "${topicRaw}" is not in the supported set` };
  }

  const generator = parseProviderForm(fd, "generator");
  const validator = parseProviderForm(fd, "validator");

  const timeoutRaw = String(fd.get("sandbox_timeout_ms") ?? "");
  const timeout = parseInt(timeoutRaw, 10);
  if (!Number.isFinite(timeout) || timeout < 100 || timeout > 60_000) {
    return { ok: false, error: "sandbox timeout must be between 100 and 60000 ms" };
  }

  const memoryRaw = String(fd.get("sandbox_memory_mb") ?? "");
  const memory = parseInt(memoryRaw, 10);
  if (!Number.isFinite(memory) || memory < 32 || memory > 4096) {
    return { ok: false, error: "sandbox memory must be between 32 and 4096 MB" };
  }

  // Touch TOPICS so it's referenced (we re-validate at the page boundary too).
  void TOPICS;

  return {
    ok: true,
    value: {
      defaultDifficulty: difficulty,
      defaultTopic: topic,
      generator,
      validator,
      sandboxTimeoutMs: timeout,
      sandboxMemoryMb: memory,
    },
  };
}

const PRESET_VALUES = ["anthropic", "openai", "lmstudio", "ollama", "custom"] as const;

function parseProviderForm(fd: FormData, role: "generator" | "validator"): ProviderOverrides {
  const presetRaw = String(fd.get(`${role}_preset`) ?? "").toLowerCase();
  const preset = (PRESET_VALUES as readonly string[]).includes(presetRaw)
    ? (presetRaw as (typeof PRESET_VALUES)[number])
    : null;
  const model = String(fd.get(`${role}_model`) ?? "").trim();
  const baseUrl = String(fd.get(`${role}_base_url`) ?? "").trim();
  return {
    preset,
    model: model.length > 0 ? model : null,
    baseUrl: baseUrl.length > 0 ? baseUrl : null,
  };
}
