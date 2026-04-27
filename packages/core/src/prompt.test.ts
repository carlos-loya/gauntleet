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

  it("embeds the requested difficulty and topic in the user message", () => {
    const messages = buildMessages({ difficulty: "hard", topic: "dynamic programming" });
    expect(messages.user).toContain("hard");
    expect(messages.user).toContain("dynamic programming");
  });

  it("describes the JSON output schema in the system prompt", () => {
    const messages = buildMessages({ difficulty: "medium", topic: "graphs" });
    expect(messages.system).toContain("functionName");
    expect(messages.system).toContain("referenceSolution");
    expect(messages.system).toContain("inputGenerator");
    expect(messages.system).toContain("sampleTests");
  });
});

describe("PROMPT_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});
