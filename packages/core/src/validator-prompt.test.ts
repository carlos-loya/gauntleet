import { describe, expect, it } from "vitest";
import {
  buildValidatorMessages,
  extractPythonCode,
  VALIDATOR_PROMPT_VERSION,
} from "./validator-prompt.js";

describe("buildValidatorMessages", () => {
  it("returns system + user content", () => {
    const messages = buildValidatorMessages({
      statement: "Add two numbers.",
      functionName: "add",
      parameters: [
        { name: "a", pythonType: "int" },
        { name: "b", pythonType: "int" },
      ],
      returnType: "int",
    });
    expect(typeof messages.system).toBe("string");
    expect(messages.system.length).toBeGreaterThan(0);
    expect(typeof messages.user).toBe("string");
    expect(messages.user.length).toBeGreaterThan(0);
  });

  it("embeds the exact function signature in the user message", () => {
    const messages = buildValidatorMessages({
      statement: "Foo.",
      functionName: "two_sum",
      parameters: [
        { name: "nums", pythonType: "list[int]" },
        { name: "target", pythonType: "int" },
      ],
      returnType: "list[int]",
    });
    expect(messages.user).toContain("def two_sum(nums: list[int], target: int) -> list[int]:");
  });

  it("includes the problem statement", () => {
    const messages = buildValidatorMessages({
      statement: "Reverse the array in place.",
      functionName: "reverse",
      parameters: [{ name: "nums", pythonType: "list[int]" }],
      returnType: "None",
    });
    expect(messages.user).toContain("Reverse the array in place.");
  });

  it("forbids prose / fences / markdown in the system prompt", () => {
    const messages = buildValidatorMessages({
      statement: "x",
      functionName: "f",
      parameters: [{ name: "x", pythonType: "int" }],
      returnType: "int",
    });
    expect(messages.system).toMatch(/no.*markdown.*fences/i);
    expect(messages.system).toMatch(/no prose/i);
  });
});

describe("VALIDATOR_PROMPT_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof VALIDATOR_PROMPT_VERSION).toBe("string");
    expect(VALIDATOR_PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});

describe("extractPythonCode", () => {
  it("returns plain code unchanged", () => {
    const code = "def f(x):\n    return x + 1\n";
    expect(extractPythonCode(code)).toBe(code.trim());
  });

  it("trims surrounding whitespace", () => {
    expect(extractPythonCode("\n\n  def f(): return 1\n\n")).toBe("def f(): return 1");
  });

  it("strips a full ```python fence", () => {
    const text = "```python\ndef f(x):\n    return x\n```";
    expect(extractPythonCode(text)).toBe("def f(x):\n    return x");
  });

  it("strips a bare ``` fence", () => {
    const text = "```\ndef f(x):\n    return x\n```";
    expect(extractPythonCode(text)).toBe("def f(x):\n    return x");
  });

  it("strips a ```py fence", () => {
    const text = "```py\ndef f(x):\n    return x\n```";
    expect(extractPythonCode(text)).toBe("def f(x):\n    return x");
  });

  it("extracts the first fenced block when there is surrounding prose", () => {
    const text = "Here is my solution:\n\n```python\ndef f(x):\n    return x\n```\n\nLet me know!";
    expect(extractPythonCode(text)).toBe("def f(x):\n    return x");
  });

  it("returns the trimmed text when there is no fence", () => {
    expect(extractPythonCode("just some code")).toBe("just some code");
  });
});
