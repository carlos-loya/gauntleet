import { runPython, type RunPythonResult } from "@gauntleet/sandbox";

export class HarnessError extends Error {
  readonly result: RunPythonResult;
  constructor(message: string, result: RunPythonResult) {
    super(`${message}\n--- stderr ---\n${result.stderr}\n--- stdout ---\n${result.stdout}`);
    this.name = "HarnessError";
    this.result = result;
  }
}

export interface RunOptions {
  timeoutMs?: number;
  memoryMb?: number;
}

/**
 * Runs `code` (which must define `functionName`) against each entry in `inputs`
 * (a list of positional-argument arrays) inside the sandbox. Returns the list of
 * JSON-decoded results, one per input.
 */
export async function runReferenceSolution(opts: {
  code: string;
  functionName: string;
  inputs: unknown[][];
  timeoutMs?: number;
  memoryMb?: number;
}): Promise<unknown[]> {
  const wrapper = [
    "import json, sys",
    opts.code,
    "",
    "__GLT_inputs__ = json.loads(sys.stdin.read())",
    `__GLT_outputs__ = [${opts.functionName}(*__GLT_args__) for __GLT_args__ in __GLT_inputs__]`,
    "sys.stdout.write(json.dumps(__GLT_outputs__))",
    "",
  ].join("\n");

  const result = await runPython({
    code: wrapper,
    stdin: JSON.stringify(opts.inputs),
    ...(opts.timeoutMs !== undefined && { timeoutMs: opts.timeoutMs }),
    ...(opts.memoryMb !== undefined && { memoryMb: opts.memoryMb }),
  });

  if (result.timedOut) throw new HarnessError("reference solution timed out", result);
  if (result.exitCode !== 0) {
    throw new HarnessError(`reference solution exited with code ${result.exitCode}`, result);
  }
  try {
    return JSON.parse(result.stdout) as unknown[];
  } catch {
    throw new HarnessError("reference solution did not produce valid JSON output", result);
  }
}

/**
 * Runs an input generator (`def gen(seed: int) -> list`) for each of `seeds`,
 * returning a list of arg-tuples (one per seed). Each arg-tuple is the positional
 * arguments the reference solution should be called with.
 */
export async function runInputGenerator(opts: {
  code: string;
  seeds: number[];
  timeoutMs?: number;
  memoryMb?: number;
}): Promise<unknown[][]> {
  const wrapper = [
    "import json, sys",
    opts.code,
    "",
    "__GLT_seeds__ = json.loads(sys.stdin.read())",
    "__GLT_outputs__ = [gen(s) for s in __GLT_seeds__]",
    "sys.stdout.write(json.dumps(__GLT_outputs__))",
    "",
  ].join("\n");

  const result = await runPython({
    code: wrapper,
    stdin: JSON.stringify(opts.seeds),
    ...(opts.timeoutMs !== undefined && { timeoutMs: opts.timeoutMs }),
    ...(opts.memoryMb !== undefined && { memoryMb: opts.memoryMb }),
  });

  if (result.timedOut) throw new HarnessError("input generator timed out", result);
  if (result.exitCode !== 0) {
    throw new HarnessError(`input generator exited with code ${result.exitCode}`, result);
  }
  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(Array.isArray)) {
      throw new Error("not a list of arg-tuples");
    }
    return parsed as unknown[][];
  } catch {
    throw new HarnessError("input generator did not produce a JSON list of arg-tuples", result);
  }
}
