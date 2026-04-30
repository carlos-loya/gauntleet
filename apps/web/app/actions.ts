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
import { checkIndependence, createProviderFromEnv } from "@gauntleet/llm";
import { ensureEnv } from "../lib/env";
import { getDb, getProblem } from "../lib/db";
import { parseGenerateInput } from "../lib/parse-input";

export interface GenerateState {
  status: "idle" | "error";
  message: string;
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

  let generator;
  let validator;
  try {
    generator = createProviderFromEnv("GENERATOR");
    validator = createProviderFromEnv("VALIDATOR");
  } catch (err) {
    return { status: "error", message: `Provider config error: ${(err as Error).message}` };
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
    await validateProblem({ validator, db, problemId, seedCount: 20 });
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

  try {
    const grade = await runAgainstSamples({ problem, code: codeCheck.code });
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
  try {
    const { grade } = await gradeSubmission({ db, problemId, code: codeCheck.code });
    revalidatePath(`/p/${problemId}`);
    return { ok: true, grade };
  } catch (err) {
    if (err instanceof GradeError) {
      return { ok: false, error: `grading crashed: ${err.message}` };
    }
    throw err;
  }
}
