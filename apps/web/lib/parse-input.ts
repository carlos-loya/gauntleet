import { isTopic, type Topic } from "@gauntleet/core";

export type Difficulty = "easy" | "medium" | "hard";

export interface GenerateInput {
  difficulty: Difficulty;
  topic: Topic;
}

export type ParseResult = { ok: true; value: GenerateInput } | { ok: false; error: string };

const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export function parseGenerateInput(raw: { difficulty?: unknown; topic?: unknown }): ParseResult {
  const difficulty = String(raw.difficulty ?? "").toLowerCase();
  if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) {
    return { ok: false, error: "difficulty must be easy, medium, or hard" };
  }
  const topic = String(raw.topic ?? "").trim();
  if (!topic) return { ok: false, error: "topic is required" };
  if (!isTopic(topic)) {
    return { ok: false, error: `topic "${topic}" is not in the supported set` };
  }
  return { ok: true, value: { difficulty: difficulty as Difficulty, topic } };
}
