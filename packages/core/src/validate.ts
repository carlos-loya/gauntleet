import { eq } from "drizzle-orm";
import { problems, type Db, type Problem } from "@gauntleet/db";
import type { LLMProvider } from "@gauntleet/llm";
import { compareOutputs } from "./compare.js";
import { runInputGenerator, runReferenceSolution } from "./python-harness.js";
import { buildValidatorMessages, extractPythonCode } from "./validator-prompt.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface ValidateProblemOptions {
  validator: LLMProvider;
  db: Db;
  problemId: string;
  seedCount?: number;
  /** Per-execution timeout for sandbox runs of the reference + validator solutions. */
  solutionTimeoutMs?: number;
}

export interface ValidationResult {
  problem: Problem;
  agreed: boolean;
  total: number;
  firstDisagreementIndex: number | null;
  note: string;
}

const DEFAULT_SEED_COUNT = 20;
const DEFAULT_SOLUTION_TIMEOUT_MS = 5_000;

export async function validateProblem(opts: ValidateProblemOptions): Promise<ValidationResult> {
  const seedCount = opts.seedCount ?? DEFAULT_SEED_COUNT;
  const solutionTimeoutMs = opts.solutionTimeoutMs ?? DEFAULT_SOLUTION_TIMEOUT_MS;

  const problem = opts.db.select().from(problems).where(eq(problems.id, opts.problemId)).get();
  if (!problem) {
    throw new ValidationError(`problem ${opts.problemId} not found`);
  }

  // 1. Ask the validator to solve the problem.
  const messages = buildValidatorMessages({
    statement: problem.statement,
    functionName: problem.functionName,
    parameters: problem.parameters,
    returnType: problem.returnType,
  });
  const response = await opts.validator.complete({
    messages: [{ role: "user", content: messages.user }],
    system: messages.system,
    maxTokens: 4096,
    temperature: 0.2,
  });
  const validatorSolution = extractPythonCode(response.text);
  if (!validatorSolution.trim()) {
    return persistResult(opts, problem, {
      agreed: false,
      total: 0,
      firstDisagreementIndex: null,
      note: "validator returned empty solution",
      validatorSolution,
      seedCount,
    });
  }

  // 2. Generate seedCount random inputs via the problem's input generator.
  const seeds = Array.from({ length: seedCount }, (_, i) => i);
  let randomInputs: unknown[][];
  try {
    randomInputs = await runInputGenerator({ code: problem.inputGenerator, seeds });
  } catch (err) {
    return persistResult(opts, problem, {
      agreed: false,
      total: 0,
      firstDisagreementIndex: null,
      note: `input generator failed during validation: ${(err as Error).message}`,
      validatorSolution,
      seedCount,
    });
  }

  // 3. Run reference + validator solutions on the same inputs.
  let referenceOutputs: unknown[];
  try {
    referenceOutputs = await runReferenceSolution({
      code: problem.referenceSolution,
      functionName: problem.functionName,
      inputs: randomInputs,
      timeoutMs: solutionTimeoutMs,
    });
  } catch (err) {
    return persistResult(opts, problem, {
      agreed: false,
      total: seedCount,
      firstDisagreementIndex: null,
      note: `reference solution failed on random inputs: ${(err as Error).message}`,
      validatorSolution,
      seedCount,
    });
  }

  let validatorOutputs: unknown[];
  try {
    validatorOutputs = await runReferenceSolution({
      code: validatorSolution,
      functionName: problem.functionName,
      inputs: randomInputs,
      timeoutMs: solutionTimeoutMs,
    });
  } catch (err) {
    return persistResult(opts, problem, {
      agreed: false,
      total: seedCount,
      firstDisagreementIndex: null,
      note: `validator solution failed on random inputs: ${(err as Error).message}`,
      validatorSolution,
      seedCount,
    });
  }

  // 4. Compare.
  const agreement = compareOutputs(randomInputs, referenceOutputs, validatorOutputs);
  return persistResult(opts, problem, {
    agreed: agreement.agreed,
    total: agreement.total,
    firstDisagreementIndex: agreement.firstDisagreementIndex,
    note: agreement.note,
    validatorSolution,
    seedCount,
  });
}

interface PersistArgs {
  agreed: boolean;
  total: number;
  firstDisagreementIndex: number | null;
  note: string;
  validatorSolution: string;
  seedCount: number;
}

function persistResult(
  opts: ValidateProblemOptions,
  problem: Problem,
  args: PersistArgs
): ValidationResult {
  const status: Problem["status"] = args.agreed ? "validated" : "rejected";
  const updated = opts.db
    .update(problems)
    .set({
      status,
      validationNotes: args.note,
      validatorProvider: opts.validator.familyId,
      validatorModel: opts.validator.model,
      validatorSolution: args.validatorSolution,
      validatedAt: new Date(),
      validationSeedCount: args.seedCount,
    })
    .where(eq(problems.id, problem.id))
    .returning()
    .get();
  if (!updated) throw new ValidationError("update did not return a row");
  return {
    problem: updated,
    agreed: args.agreed,
    total: args.total,
    firstDisagreementIndex: args.firstDisagreementIndex,
    note: args.note,
  };
}
