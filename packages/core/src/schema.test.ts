import { describe, expect, it } from "vitest";
import { Difficulty, GeneratedProblem } from "./schema.js";

describe("Difficulty", () => {
  it.each(["easy", "medium", "hard"] as const)("accepts %s", (d) => {
    expect(Difficulty.parse(d)).toBe(d);
  });

  it("rejects unknown values", () => {
    expect(Difficulty.safeParse("trivial").success).toBe(false);
    expect(Difficulty.safeParse("").success).toBe(false);
    expect(Difficulty.safeParse(undefined).success).toBe(false);
  });
});

const validProblem = {
  title: "Two Sum",
  statement: "Find indices that sum to target.",
  functionName: "two_sum",
  parameters: [
    { name: "nums", pythonType: "list[int]" },
    { name: "target", pythonType: "int" },
  ],
  returnType: "list[int]",
  referenceSolution: "def two_sum(nums, target): return [0, 1]",
  inputGenerator: "def gen(seed): return [[1, 2, 3], 3]",
  sampleTests: [{ input: [[1, 2], 3], expectedOutput: [0, 1] }],
};

describe("GeneratedProblem", () => {
  it("accepts a well-formed problem", () => {
    const result = GeneratedProblem.safeParse(validProblem);
    expect(result.success).toBe(true);
  });

  it("rejects when title is missing", () => {
    const { title: _title, ...rest } = validProblem;
    expect(GeneratedProblem.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid Python identifier as functionName", () => {
    const r = GeneratedProblem.safeParse({ ...validProblem, functionName: "two-sum" });
    expect(r.success).toBe(false);
  });

  it("accepts underscore-prefixed identifiers", () => {
    const r = GeneratedProblem.safeParse({ ...validProblem, functionName: "_solve" });
    expect(r.success).toBe(true);
  });

  it("rejects an empty parameters list", () => {
    const r = GeneratedProblem.safeParse({ ...validProblem, parameters: [] });
    expect(r.success).toBe(false);
  });

  it("rejects more than 8 parameters", () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => ({
      name: `p${i}`,
      pythonType: "int",
    }));
    const r = GeneratedProblem.safeParse({ ...validProblem, parameters: tooMany });
    expect(r.success).toBe(false);
  });

  it("rejects an empty sampleTests list", () => {
    const r = GeneratedProblem.safeParse({ ...validProblem, sampleTests: [] });
    expect(r.success).toBe(false);
  });

  it("rejects an empty referenceSolution", () => {
    const r = GeneratedProblem.safeParse({ ...validProblem, referenceSolution: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a parameter with an empty name", () => {
    const r = GeneratedProblem.safeParse({
      ...validProblem,
      parameters: [{ name: "", pythonType: "int" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a title longer than 120 chars", () => {
    const r = GeneratedProblem.safeParse({ ...validProblem, title: "x".repeat(121) });
    expect(r.success).toBe(false);
  });
});
