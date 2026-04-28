import type { ParameterDef } from "@gauntleet/db";

export const VALIDATOR_PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `You solve algorithmic Python problems for an automated grading system.

Hard constraints:
- Reply with ONLY Python source code. No prose, no markdown fences, no comments outside the function.
- Define exactly the function signature given (same name, same parameter names, same return type). Do not add or rename parameters.
- Use only the Python standard library.
- The function must be self-contained — no I/O, no globals, no network, no filesystem.
- The function will be called many times; do not include test code, sample inputs, or print statements.`;

export interface ValidatorPromptInput {
  statement: string;
  functionName: string;
  parameters: ParameterDef[];
  returnType: string;
}

export function buildValidatorMessages(input: ValidatorPromptInput): {
  system: string;
  user: string;
} {
  const params = input.parameters.map((p) => `${p.name}: ${p.pythonType}`).join(", ");
  const signature = `def ${input.functionName}(${params}) -> ${input.returnType}:`;
  const user = [
    "Solve the following problem in Python.",
    "",
    "Problem:",
    input.statement,
    "",
    "Function signature (use exactly):",
    "```",
    signature,
    "    ...",
    "```",
    "",
    "Reply with the full source for that function and any helper code it needs — and nothing else.",
  ].join("\n");
  return { system: SYSTEM_PROMPT, user };
}

/**
 * Strips a single leading/trailing markdown fence if present, plus surrounding whitespace.
 * Tolerant of `\`\`\`python` or `\`\`\`` fences. Falls back to the raw text if no fence.
 */
export function extractPythonCode(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:python|py)?\s*\n([\s\S]*?)\n```$/);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    return fenceMatch[1].trim();
  }
  // First fenced block anywhere in the text
  const innerFence = trimmed.match(/```(?:python|py)?\s*\n([\s\S]*?)\n```/);
  if (innerFence && innerFence[1] !== undefined) {
    return innerFence[1].trim();
  }
  return trimmed;
}
