import { describe, expect, it } from "vitest";
import { parseGenerateInput } from "./parse-input.js";

describe("parseGenerateInput", () => {
  it("accepts a well-formed easy/medium/hard payload", () => {
    expect(parseGenerateInput({ difficulty: "easy", topic: "arrays" })).toEqual({
      ok: true,
      value: { difficulty: "easy", topic: "arrays" },
    });
    expect(parseGenerateInput({ difficulty: "medium", topic: "graphs" }).ok).toBe(true);
    expect(parseGenerateInput({ difficulty: "hard", topic: "DP" }).ok).toBe(true);
  });

  it("normalizes difficulty case", () => {
    const result = parseGenerateInput({ difficulty: "EASY", topic: "arrays" });
    expect(result).toEqual({ ok: true, value: { difficulty: "easy", topic: "arrays" } });
  });

  it("trims surrounding whitespace from the topic", () => {
    const result = parseGenerateInput({ difficulty: "easy", topic: "  arrays  " });
    expect(result.ok && result.value.topic).toBe("arrays");
  });

  it("rejects an unknown difficulty", () => {
    expect(parseGenerateInput({ difficulty: "trivial", topic: "arrays" }).ok).toBe(false);
    expect(parseGenerateInput({ difficulty: "", topic: "arrays" }).ok).toBe(false);
    expect(parseGenerateInput({ topic: "arrays" }).ok).toBe(false);
  });

  it("rejects an empty topic", () => {
    expect(parseGenerateInput({ difficulty: "easy", topic: "" }).ok).toBe(false);
    expect(parseGenerateInput({ difficulty: "easy", topic: "   " }).ok).toBe(false);
    expect(parseGenerateInput({ difficulty: "easy" }).ok).toBe(false);
  });

  it("rejects a topic longer than 80 chars", () => {
    expect(parseGenerateInput({ difficulty: "easy", topic: "x".repeat(81) }).ok).toBe(false);
  });
});
