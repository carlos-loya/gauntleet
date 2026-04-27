import { randomUUID } from "node:crypto";
import { problems, type Db, type Problem, type SampleTest } from "@gauntleet/db";
import type { LLMProvider } from "@gauntleet/llm";
import { buildMessages, PROMPT_VERSION } from "./prompt.js";
import { runInputGenerator, runReferenceSolution } from "./python-harness.js";
import { Difficulty, GeneratedProblem } from "./schema.js";

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}

export interface GenerateProblemInput {
  difficulty: Difficulty;
  topic: string;
}

export interface GenerateProblemOptions {
  generator: LLMProvider;
  db: Db;
  input: GenerateProblemInput;
}

export async function generateProblem(opts: GenerateProblemOptions): Promise<Problem> {
  const { system, user } = buildMessages(opts.input);
  const response = await opts.generator.complete({
    messages: [{ role: "user", content: user }],
    system,
    jsonMode: true,
    maxTokens: 4096,
    temperature: 0.7,
  });

  const raw = extractJSON(response.text);
  const parsed = GeneratedProblem.safeParse(raw);
  if (!parsed.success) {
    throw new GenerationError(
      `LLM response did not match schema: ${parsed.error.message}\n` +
        `--- raw response (first 1000 chars) ---\n${response.text.slice(0, 1000)}`
    );
  }
  const problem = parsed.data;

  const seeds = [0, 1, 2];
  let generatedInputs: unknown[][];
  try {
    generatedInputs = await runInputGenerator({ code: problem.inputGenerator, seeds });
  } catch (e) {
    throw new GenerationError(`input generator failed: ${(e as Error).message}`);
  }
  if (generatedInputs.length !== seeds.length) {
    throw new GenerationError(
      `input generator returned ${generatedInputs.length} cases, expected ${seeds.length}`
    );
  }

  const sampleInputs = problem.sampleTests.map((t) => t.input);
  let sampleOutputs: unknown[];
  try {
    sampleOutputs = await runReferenceSolution({
      code: problem.referenceSolution,
      functionName: problem.functionName,
      inputs: sampleInputs,
    });
  } catch (e) {
    throw new GenerationError(`reference solution failed on sample tests: ${(e as Error).message}`);
  }

  for (let i = 0; i < problem.sampleTests.length; i++) {
    const expected = problem.sampleTests[i]!.expectedOutput;
    const got = sampleOutputs[i];
    if (!deepEqual(expected, got)) {
      throw new GenerationError(
        `reference solution output mismatch on sample test ${i}: ` +
          `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`
      );
    }
  }

  const row = {
    id: randomUUID(),
    createdAt: new Date(),
    difficulty: opts.input.difficulty,
    topic: opts.input.topic,
    title: problem.title,
    statement: problem.statement,
    functionName: problem.functionName,
    parameters: problem.parameters,
    returnType: problem.returnType,
    referenceSolution: problem.referenceSolution,
    inputGenerator: problem.inputGenerator,
    sampleTests: problem.sampleTests as SampleTest[],
    generatorProvider: opts.generator.familyId,
    generatorModel: opts.generator.model,
    promptVersion: PROMPT_VERSION,
    status: "draft" as const,
    validationNotes: null,
  };

  const inserted = opts.db.insert(problems).values(row).returning().get();
  if (!inserted) throw new GenerationError("insert did not return a row");
  return inserted;
}

export function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to bracket-extraction
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new GenerationError("could not find a JSON object in LLM response");
  }
  return JSON.parse(match[0]);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === "object") {
    if (typeof b !== "object" || b === null) return false;
    const aKeys = Object.keys(a as object).sort();
    const bKeys = Object.keys(b as object).sort();
    if (aKeys.length !== bKeys.length) return false;
    if (!aKeys.every((k, i) => k === bKeys[i])) return false;
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    return aKeys.every((k) => deepEqual(ao[k], bo[k]));
  }
  return false;
}
