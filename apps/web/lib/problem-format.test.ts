import { describe, expect, it } from "vitest";
import { formatSignature, formatStarterCode } from "./problem-format.js";

describe("formatSignature", () => {
  it("composes a Python signature with name + typed params + return type", () => {
    expect(
      formatSignature({
        functionName: "two_sum",
        parameters: [
          { name: "nums", pythonType: "list[int]" },
          { name: "target", pythonType: "int" },
        ],
        returnType: "list[int]",
      })
    ).toBe("def two_sum(nums: list[int], target: int) -> list[int]:");
  });

  it("handles a single-parameter function", () => {
    expect(
      formatSignature({
        functionName: "reverse",
        parameters: [{ name: "s", pythonType: "str" }],
        returnType: "str",
      })
    ).toBe("def reverse(s: str) -> str:");
  });

  it("handles complex generic types", () => {
    expect(
      formatSignature({
        functionName: "f",
        parameters: [{ name: "g", pythonType: "dict[str, list[int]]" }],
        returnType: "tuple[int, int]",
      })
    ).toBe("def f(g: dict[str, list[int]]) -> tuple[int, int]:");
  });
});

describe("formatStarterCode", () => {
  it("returns a signature followed by a TODO body and trailing newline", () => {
    const code = formatStarterCode({
      functionName: "f",
      parameters: [{ name: "x", pythonType: "int" }],
      returnType: "int",
    });
    expect(code).toMatch(/^def f\(x: int\) -> int:\n/);
    expect(code).toContain("# write your solution here");
    expect(code).toContain("pass");
    expect(code.endsWith("\n")).toBe(true);
  });
});
