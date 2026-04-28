export type Difficulty = "easy" | "medium" | "hard";

export interface GenerateInput {
  difficulty: Difficulty;
  topic: string;
}

export type ParseResult = { ok: true; value: GenerateInput } | { ok: false; error: string };

const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const MAX_TOPIC_LENGTH = 80;

export function parseGenerateInput(raw: { difficulty?: unknown; topic?: unknown }): ParseResult {
  const difficulty = String(raw.difficulty ?? "").toLowerCase();
  if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) {
    return { ok: false, error: "difficulty must be easy, medium, or hard" };
  }
  const topic = String(raw.topic ?? "").trim();
  if (!topic) return { ok: false, error: "topic is required" };
  if (topic.length > MAX_TOPIC_LENGTH) {
    return { ok: false, error: `topic must be ${MAX_TOPIC_LENGTH} characters or fewer` };
  }
  return { ok: true, value: { difficulty: difficulty as Difficulty, topic } };
}
