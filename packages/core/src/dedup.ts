import { and, desc, eq } from "drizzle-orm";
import { problems, type Db } from "@gauntleet/db";
import type { Difficulty } from "./schema.js";
import type { Topic } from "./topics.js";

/**
 * Lowercase, strip punctuation, collapse whitespace. Used to compare titles for
 * near-duplicate detection — "Two Sum", "two sum", and "Two-Sum!" all collapse
 * to "two sum".
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Fetch recent existing titles for the same (difficulty, topic) pair. Used to
 * (a) seed the avoid-list in the prompt, and (b) check for normalized title
 * collisions after generation.
 */
export function getRecentTitles(
  db: Db,
  filter: { difficulty: Difficulty; topic: Topic },
  limit: number
): string[] {
  return db
    .select({ title: problems.title })
    .from(problems)
    .where(and(eq(problems.difficulty, filter.difficulty), eq(problems.topic, filter.topic)))
    .orderBy(desc(problems.createdAt))
    .limit(limit)
    .all()
    .map((r) => r.title);
}

/**
 * True if `candidate` normalizes to any title already stored for the same
 * (difficulty, topic) pair.
 */
export function isDuplicateTitle(existing: string[], candidate: string): boolean {
  const normCandidate = normalizeTitle(candidate);
  if (!normCandidate) return false;
  return existing.some((t) => normalizeTitle(t) === normCandidate);
}
