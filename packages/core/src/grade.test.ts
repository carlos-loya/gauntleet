import { describe, expect, it } from "vitest";
import { buildGradingWrapper, interpretSandboxResult } from "./grade.js";

const TESTS = [
  { input: [1, 2], expected: 3 },
  { input: [10, 20], expected: 30 },
  { input: [-5, 5], expected: 0 },
];

function sandbox(overrides: {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  durationMs?: number;
  timedOut?: boolean;
  oom?: boolean;
}) {
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    durationMs: 50,
    timedOut: false,
    oom: false,
    ...overrides,
  };
}

describe("buildGradingWrapper", () => {
  it("inlines user code and dispatches the named function", () => {
    const wrapper = buildGradingWrapper("def add(a, b): return a + b", "add");
    expect(wrapper).toContain("def add(a, b): return a + b");
    expect(wrapper).toContain("add(*__GLT_t)");
    expect(wrapper).toContain("json.loads(sys.stdin.read())");
    expect(wrapper).toContain("json.dumps(__GLT_results)");
  });

  it("catches per-test exceptions inside the dispatch loop", () => {
    const wrapper = buildGradingWrapper("def f(x): return x", "f");
    expect(wrapper).toContain("except Exception");
    expect(wrapper).toContain('"ok": False');
  });
});

describe("interpretSandboxResult", () => {
  it("returns accepted when every per-test output matches", () => {
    const stdout = JSON.stringify([
      { ok: true, output: 3 },
      { ok: true, output: 30 },
      { ok: true, output: 0 },
    ]);
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ stdout, durationMs: 42 }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("accepted");
    expect(result.testsPassed).toBe(3);
    expect(result.testsTotal).toBe(3);
    expect(result.failedAtIndex).toBeNull();
    expect(result.failureNote).toBeNull();
    expect(result.runtimeMs).toBe(42);
    expect(result.results.every((r) => r.ok)).toBe(true);
    expect(result.results[0]?.actual).toBe(3);
  });

  it("returns wrong_answer at the first disagreement index", () => {
    const stdout = JSON.stringify([
      { ok: true, output: 3 },
      { ok: true, output: 99 },
      { ok: true, output: 0 },
    ]);
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ stdout }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("wrong_answer");
    expect(result.failedAtIndex).toBe(1);
    expect(result.testsPassed).toBe(2);
    expect(result.testsTotal).toBe(3);
    expect(result.failureNote).toContain("expected: 30");
    expect(result.failureNote).toContain("got: 99");
    expect(result.results[1]?.wrong).toBe(true);
    // Subsequent tests still execute and are still reported.
    expect(result.results[2]?.ok).toBe(true);
  });

  it("returns runtime_error at the first throwing test, even when later tests would also be wrong", () => {
    const stdout = JSON.stringify([
      { ok: true, output: 3 },
      { ok: false, error: "ZeroDivisionError: division by zero" },
      { ok: true, output: 99 },
    ]);
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ stdout }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("runtime_error");
    expect(result.failedAtIndex).toBe(1);
    expect(result.failureNote).toContain("ZeroDivisionError");
    expect(result.results[1]?.error).toContain("ZeroDivisionError");
  });

  it("prefers an earlier wrong_answer over a later runtime_error", () => {
    const stdout = JSON.stringify([
      { ok: true, output: 999 },
      { ok: false, error: "RuntimeError: nope" },
      { ok: true, output: 0 },
    ]);
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ stdout }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("wrong_answer");
    expect(result.failedAtIndex).toBe(0);
  });

  it("returns time_limit_exceeded when the sandbox timed out", () => {
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ timedOut: true, durationMs: 5000, exitCode: null }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("time_limit_exceeded");
    expect(result.failedAtIndex).toBeNull();
    expect(result.failureNote).toContain("5000ms");
    expect(result.results).toEqual([]);
    expect(result.testsPassed).toBe(0);
    expect(result.testsTotal).toBe(3);
  });

  it("returns memory_limit_exceeded when the sandbox flagged OOM", () => {
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ oom: true, exitCode: 137 }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("memory_limit_exceeded");
    expect(result.failureNote).toContain("256MB");
  });

  it("returns runtime_error with a stderr-derived note when the program crashed before the dispatch loop", () => {
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({
        stdout: "",
        stderr: 'File "<stdin>", line 1\n    def f(:\n          ^\nSyntaxError: invalid syntax',
        exitCode: 1,
      }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("runtime_error");
    expect(result.failedAtIndex).toBeNull();
    expect(result.failureNote).toContain("SyntaxError");
    expect(result.stderr).toContain("SyntaxError");
  });

  it("returns runtime_error when the dispatch loop emitted fewer results than expected", () => {
    const stdout = JSON.stringify([{ ok: true, output: 3 }]);
    const result = interpretSandboxResult({
      tests: TESTS,
      sandbox: sandbox({ stdout }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("runtime_error");
    expect(result.failureNote).toContain("expected 3 test results, got 1");
  });

  it("uses deepEqual semantics so list outputs compare structurally", () => {
    const stdout = JSON.stringify([{ ok: true, output: [1, 2, 3] }]);
    const result = interpretSandboxResult({
      tests: [{ input: [], expected: [1, 2, 3] }],
      sandbox: sandbox({ stdout }),
      timeoutMs: 5000,
      memoryMb: 256,
    });
    expect(result.verdict).toBe("accepted");
  });
});
