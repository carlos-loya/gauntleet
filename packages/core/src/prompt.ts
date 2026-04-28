import type { Difficulty } from "./schema.js";
import { topicLabel, type Topic } from "./topics.js";

export const PROMPT_VERSION = "v2";

const SYSTEM_PROMPT = `You generate algorithmic practice problems for a LeetCode-style site.

Hard constraints:
- The problem must have a single correct answer per input — deterministic I/O only.
- Solvable in Python in well under 5 seconds with the intended approach.
- The intended solution is a single function whose arguments and return value are JSON-serializable (numbers, strings, booleans, lists, dicts, null). No custom classes, no I/O.
- The function must be self-contained (no I/O, no globals, no network, no filesystem).

Reply with EXACTLY ONE JSON object — no prose, no markdown fences, no commentary — matching this schema:

{
  "title": string,                        // short and descriptive, e.g. "Two Sum"
  "statement": string,                    // markdown problem statement; include constraints, examples, and edge cases
  "functionName": string,                 // valid python identifier
  "parameters": [{ "name": string, "pythonType": string }],
  "returnType": string,                   // python type annotation, e.g. "int" or "list[int]"
  "referenceSolution": string,            // full python source defining the function above; correct and reasonably efficient
  "inputGenerator": string,               // full python source defining "def gen(seed: int) -> list" that returns the positional arguments to pass to the function for that seed
  "sampleTests": [                        // 3-5 hand-picked tests; "input" is the list of positional args, "expectedOutput" is the function's return value
    { "input": [...], "expectedOutput": ... }
  ]
}

Additional guidance:
- The reference solution must define exactly the function in functionName with the exact parameters listed.
- The input generator must use the seed deterministically (e.g., random.Random(seed)) so the same seed always produces the same input.
- Do not import non-stdlib packages.
- Keep the problem statement self-contained — readers should not need outside context.`;

export interface BuildMessagesInput {
  difficulty: Difficulty;
  topic: Topic;
  /** Existing problem titles for the same (difficulty, topic) pair to avoid duplicating. */
  avoidTitles?: string[];
}

export function buildMessages(input: BuildMessagesInput): { system: string; user: string } {
  const lines: string[] = [
    `Generate one ${input.difficulty} problem on the topic "${topicLabel(input.topic)}".`,
  ];
  if (input.avoidTitles && input.avoidTitles.length > 0) {
    lines.push("");
    lines.push(
      "Do NOT generate any of the following problems or close variants of them. Pick a meaningfully different problem with a different core idea, not just a renamed version:"
    );
    for (const title of input.avoidTitles) {
      lines.push(`- ${title}`);
    }
  }
  return { system: SYSTEM_PROMPT, user: lines.join("\n") };
}
