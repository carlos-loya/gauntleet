"use server";

import { redirect } from "next/navigation";
import {
  generateProblem,
  GenerationError,
  validateProblem,
  ValidationError,
} from "@gauntleet/core";
import { checkIndependence, createProviderFromEnv } from "@gauntleet/llm";
import { ensureEnv } from "../lib/env";
import { getDb } from "../lib/db";
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
