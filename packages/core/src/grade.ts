import { randomUUID } from "node:crypto";
import { runPython } from "@gauntleet/sandbox";
import { eq } from "drizzle-orm";
import {
  problems,
  submissions,
  type Db,
  type Problem,
  type Submission,
  type Verdict,
} from "@gauntleet/db";
import { deepEqual } from "./generate.js";
import { runInputGenerator, runReferenceSolution } from "./python-harness.js";

export class GradeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradeError";
  }
}

export interface TestCaseResult {
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  ok: boolean;
  /** Short error string (e.g. "ZeroDivisionError: division by zero") if the user's code threw on this case. */
  error?: string;
  /** True if user output disagreed with expected output (ran without throwing but wrong). */
  wrong?: boolean;
}

export interface GradeResult {
  verdict: Verdict;
  testsPassed: number;
  testsTotal: number;
  failedAtIndex: number | null;
  failureNote: string | null;
  /** Wall-clock duration of the sandbox run, in ms. */
  runtimeMs: number;
  /** Per-test detail. May be empty if the program failed before the dispatch loop ran. */
  results: TestCaseResult[];
  /** stderr from the sandbox run, truncated. Useful for surfacing syntax/import errors. */
  stderr: string;
}

const DEFAULT_RANDOM_SEED_COUNT = 20;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MEMORY_MB = 256;

/**
 * Build the wrapper that executes user code, dispatches the named function on
 * each input tuple, and emits a JSON list of per-case results. Each result is
 * either {"ok": true, "output": <value>} or {"ok": false, "error": <string>}.
 */
export function buildGradingWrapper(userCode: string, functionName: string): string {
  return [
    "import json, sys",
    userCode,
    "",
    "__GLT_tests = json.loads(sys.stdin.read())",
    "__GLT_results = []",
    "for __GLT_t in __GLT_tests:",
    "    try:",
    `        __GLT_out = ${functionName}(*__GLT_t)`,
    '        __GLT_results.append({"ok": True, "output": __GLT_out})',
    "    except Exception as __GLT_e:",
    '        __GLT_results.append({"ok": False, "error": f"{type(__GLT_e).__name__}: {__GLT_e}"})',
    "sys.stdout.write(json.dumps(__GLT_results))",
    "",
  ].join("\n");
}

interface RunGradedOpts {
  code: string;
  functionName: string;
  tests: { input: unknown[]; expected: unknown }[];
  timeoutMs?: number;
  memoryMb?: number;
}

/**
 * Run `code` against the given test cases inside the sandbox and produce a
 * per-test breakdown plus an overall verdict. Reused for both Run (sample
 * tests) and Submit (sample + random tests from the input generator).
 */
export async function runUserCode(opts: RunGradedOpts): Promise<GradeResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const memoryMb = opts.memoryMb ?? DEFAULT_MEMORY_MB;
  const wrapper = buildGradingWrapper(opts.code, opts.functionName);

  const inputs = opts.tests.map((t) => t.input);
  const result = await runPython({
    code: wrapper,
    stdin: JSON.stringify(inputs),
    timeoutMs,
    memoryMb,
  });

  return interpretSandboxResult({
    tests: opts.tests,
    sandbox: result,
    timeoutMs,
    memoryMb,
  });
}

export interface InterpretInput {
  tests: { input: unknown[]; expected: unknown }[];
  sandbox: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    durationMs: number;
    timedOut: boolean;
    oom: boolean;
  };
  timeoutMs: number;
  memoryMb: number;
}

/**
 * Pure transformation from a sandbox run result to a graded `GradeResult`.
 * Split out from `runUserCode` so the verdict logic can be unit-tested without
 * actually invoking Docker.
 */
export function interpretSandboxResult(args: InterpretInput): GradeResult {
  const { tests, sandbox, timeoutMs, memoryMb } = args;
  const stderr = truncate(sandbox.stderr, 4000);

  if (sandbox.timedOut) {
    return {
      verdict: "time_limit_exceeded",
      testsPassed: 0,
      testsTotal: tests.length,
      failedAtIndex: null,
      failureNote: `exceeded ${timeoutMs}ms time limit`,
      runtimeMs: sandbox.durationMs,
      results: [],
      stderr,
    };
  }
  if (sandbox.oom) {
    return {
      verdict: "memory_limit_exceeded",
      testsPassed: 0,
      testsTotal: tests.length,
      failedAtIndex: null,
      failureNote: `exceeded ${memoryMb}MB memory limit`,
      runtimeMs: sandbox.durationMs,
      results: [],
      stderr,
    };
  }

  // Parse the per-case JSON output. If the program crashed before the dispatch
  // loop ran (syntax error, ImportError, etc.) stdout is empty and parsing fails.
  let parsed: { ok: boolean; output?: unknown; error?: string }[];
  try {
    const raw = JSON.parse(sandbox.stdout) as unknown;
    if (!Array.isArray(raw)) throw new Error("not an array");
    parsed = raw as { ok: boolean; output?: unknown; error?: string }[];
  } catch {
    return {
      verdict: "runtime_error",
      testsPassed: 0,
      testsTotal: tests.length,
      failedAtIndex: null,
      failureNote: stderr ? firstStderrLine(stderr) : "program crashed before any test ran",
      runtimeMs: sandbox.durationMs,
      results: [],
      stderr,
    };
  }

  if (parsed.length !== tests.length) {
    return {
      verdict: "runtime_error",
      testsPassed: 0,
      testsTotal: tests.length,
      failedAtIndex: null,
      failureNote: `expected ${tests.length} test results, got ${parsed.length}`,
      runtimeMs: sandbox.durationMs,
      results: [],
      stderr,
    };
  }

  const results: TestCaseResult[] = [];
  let firstErrorIndex: number | null = null;
  let firstWrongIndex: number | null = null;
  let testsPassed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]!;
    const r = parsed[i]!;
    if (!r.ok) {
      results.push({ input: test.input, expected: test.expected, ok: false, error: r.error });
      if (firstErrorIndex === null) firstErrorIndex = i;
      continue;
    }
    const actual = r.output;
    const passed = deepEqual(actual, test.expected);
    if (passed) {
      testsPassed++;
      results.push({ input: test.input, expected: test.expected, actual, ok: true });
    } else {
      results.push({
        input: test.input,
        expected: test.expected,
        actual,
        ok: false,
        wrong: true,
      });
      if (firstWrongIndex === null) firstWrongIndex = i;
    }
  }

  // Runtime errors take precedence over wrong answers when picking the verdict
  // and the leading failure index, so users see the most actionable signal first.
  if (
    firstErrorIndex !== null &&
    (firstWrongIndex === null || firstErrorIndex <= firstWrongIndex)
  ) {
    const err = results[firstErrorIndex]!.error ?? "runtime error";
    return {
      verdict: "runtime_error",
      testsPassed,
      testsTotal: tests.length,
      failedAtIndex: firstErrorIndex,
      failureNote: `test ${firstErrorIndex}: ${err}`,
      runtimeMs: sandbox.durationMs,
      results,
      stderr,
    };
  }
  if (firstWrongIndex !== null) {
    const r = results[firstWrongIndex]!;
    return {
      verdict: "wrong_answer",
      testsPassed,
      testsTotal: tests.length,
      failedAtIndex: firstWrongIndex,
      failureNote: formatWrongAnswer(firstWrongIndex, r.input, r.expected, r.actual),
      runtimeMs: sandbox.durationMs,
      results,
      stderr,
    };
  }
  return {
    verdict: "accepted",
    testsPassed,
    testsTotal: tests.length,
    failedAtIndex: null,
    failureNote: null,
    runtimeMs: sandbox.durationMs,
    results,
    stderr,
  };
}

export interface RunSamplesResult {
  problem: Problem;
  grade: GradeResult;
}

/**
 * Lightweight Run flow: execute user code only against the problem's hand-picked
 * sample tests. Does not touch the database — Run is a probe, Submit is the
 * record of attempt.
 */
export async function runAgainstSamples(opts: {
  problem: Problem;
  code: string;
  timeoutMs?: number;
  memoryMb?: number;
}): Promise<GradeResult> {
  return runUserCode({
    code: opts.code,
    functionName: opts.problem.functionName,
    tests: opts.problem.sampleTests.map((t) => ({ input: t.input, expected: t.expectedOutput })),
    ...(opts.timeoutMs !== undefined && { timeoutMs: opts.timeoutMs }),
    ...(opts.memoryMb !== undefined && { memoryMb: opts.memoryMb }),
  });
}

export interface GradeSubmissionOptions {
  db: Db;
  problemId: string;
  code: string;
  /** How many random inputs to generate via the problem's input generator (in addition to the sample tests). */
  randomSeedCount?: number;
  timeoutMs?: number;
  memoryMb?: number;
}

export interface GradeSubmissionResult {
  submission: Submission;
  grade: GradeResult;
}

/**
 * Full Submit flow: assemble sample tests + N random tests via the problem's
 * input generator (with the reference solution producing ground truth), grade
 * the user's code against them, and persist the resulting submission.
 */
export async function gradeSubmission(
  opts: GradeSubmissionOptions
): Promise<GradeSubmissionResult> {
  const randomSeedCount = opts.randomSeedCount ?? DEFAULT_RANDOM_SEED_COUNT;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const memoryMb = opts.memoryMb ?? DEFAULT_MEMORY_MB;

  const problem = opts.db.select().from(problems).where(eq(problems.id, opts.problemId)).get();
  if (!problem) throw new GradeError(`problem ${opts.problemId} not found`);

  const sampleTests = problem.sampleTests.map((t) => ({
    input: t.input,
    expected: t.expectedOutput,
  }));

  let randomTests: { input: unknown[]; expected: unknown }[] = [];
  if (randomSeedCount > 0) {
    const seeds = Array.from({ length: randomSeedCount }, (_, i) => i);
    let randomInputs: unknown[][];
    try {
      randomInputs = await runInputGenerator({ code: problem.inputGenerator, seeds, timeoutMs });
    } catch (err) {
      throw new GradeError(`input generator failed: ${(err as Error).message}`);
    }
    let referenceOutputs: unknown[];
    try {
      referenceOutputs = await runReferenceSolution({
        code: problem.referenceSolution,
        functionName: problem.functionName,
        inputs: randomInputs,
        timeoutMs,
      });
    } catch (err) {
      throw new GradeError(`reference solution failed on random inputs: ${(err as Error).message}`);
    }
    if (referenceOutputs.length !== randomInputs.length) {
      throw new GradeError(
        `reference produced ${referenceOutputs.length} outputs for ${randomInputs.length} inputs`
      );
    }
    randomTests = randomInputs.map((input, i) => ({ input, expected: referenceOutputs[i] }));
  }

  const allTests = [...sampleTests, ...randomTests];
  const grade = await runUserCode({
    code: opts.code,
    functionName: problem.functionName,
    tests: allTests,
    timeoutMs,
    memoryMb,
  });

  const submission = opts.db
    .insert(submissions)
    .values({
      id: randomUUID(),
      problemId: problem.id,
      createdAt: new Date(),
      code: opts.code,
      verdict: grade.verdict,
      failedAtIndex: grade.failedAtIndex,
      failureNote: grade.failureNote,
      runtimeMs: grade.runtimeMs,
      testsPassed: grade.testsPassed,
      testsTotal: grade.testsTotal,
    })
    .returning()
    .get();
  if (!submission) throw new GradeError("submission insert did not return a row");

  return { submission, grade };
}

function formatWrongAnswer(
  index: number,
  input: unknown,
  expected: unknown,
  actual: unknown
): string {
  return [
    `test ${index}:`,
    `  input: ${truncate(JSON.stringify(input), 200)}`,
    `  expected: ${truncate(JSON.stringify(expected), 200)}`,
    `  got: ${truncate(JSON.stringify(actual), 200)}`,
  ].join("\n");
}

function firstStderrLine(stderr: string): string {
  const lines = stderr.split("\n").filter((l) => l.trim().length > 0);
  return lines[lines.length - 1] ?? stderr.slice(0, 200);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
