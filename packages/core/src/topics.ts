/**
 * The closed set of topics gauntleet will generate problems for. Free-text user
 * input is a prompt-injection vector, so callers — both the CLI and the web UI —
 * must pick from this list. The server action and parseGenerateInput both
 * validate against it.
 *
 * Loosely modeled on LeetCode's tag taxonomy. Add cautiously; every entry needs
 * to be a topic the generator model can actually produce coherent algorithmic
 * problems for.
 */
export const TOPICS = [
  "arrays",
  "strings",
  "hash-table",
  "linked-list",
  "two-pointers",
  "sliding-window",
  "binary-search",
  "stack",
  "queue",
  "heap",
  "tree",
  "graph",
  "recursion",
  "backtracking",
  "dynamic-programming",
  "greedy",
  "bit-manipulation",
  "math",
  "sorting",
  "intervals",
] as const;

export type Topic = (typeof TOPICS)[number];

const TOPIC_SET: ReadonlySet<string> = new Set(TOPICS);

export function isTopic(value: string): value is Topic {
  return TOPIC_SET.has(value);
}

/** Human-readable display label for a topic, e.g. "dynamic-programming" → "Dynamic Programming". */
export function topicLabel(topic: Topic): string {
  return topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
