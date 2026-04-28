import { describe, expect, it } from "vitest";
import { buildMessages, PROMPT_VERSION } from "./prompt.js";

describe("buildMessages", () => {
  it("returns system + user content", () => {
    const messages = buildMessages({ difficulty: "easy", topic: "arrays" });
    expect(typeof messages.system).toBe("string");
    expect(typeof messages.user).toBe("string");
    expect(messages.system.length).toBeGreaterThan(0);
    expect(messages.user.length).toBeGreaterThan(0);
  });

  it("embeds the difficulty and the human-readable topic label in the user message", () => {
    const messages = buildMessages({ difficulty: "hard", topic: "dynamic-programming" });
    expect(messages.user).toContain("hard");
    expect(messages.user).toContain("Dynamic Programming");
  });

  it("describes the JSON output schema in the system prompt", () => {
    const messages = buildMessages({ difficulty: "medium", topic: "graph" });
    expect(messages.system).toContain("functionName");
    expect(messages.system).toContain("referenceSolution");
    expect(messages.system).toContain("inputGenerator");
    expect(messages.system).toContain("sampleTests");
  });

  it("omits the avoid-list when none is given", () => {
    const messages = buildMessages({ difficulty: "easy", topic: "arrays" });
    expect(messages.user).not.toMatch(/Do NOT/);
  });

  it("omits the avoid-list when the array is empty", () => {
    const messages = buildMessages({ difficulty: "easy", topic: "arrays", avoidTitles: [] });
    expect(messages.user).not.toMatch(/Do NOT/);
  });

  it("includes the avoid-list and each title when provided", () => {
    const messages = buildMessages({
      difficulty: "easy",
      topic: "arrays",
      avoidTitles: ["Two Sum", "Remove Duplicates from Sorted Array"],
    });
    expect(messages.user).toMatch(/Do NOT generate/i);
    expect(messages.user).toContain("- Two Sum");
    expect(messages.user).toContain("- Remove Duplicates from Sorted Array");
  });
});

describe("PROMPT_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});
