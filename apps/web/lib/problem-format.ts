import type { ParameterDef } from "@gauntleet/db";

export interface ProblemSignatureInput {
  functionName: string;
  parameters: ParameterDef[];
  returnType: string;
}

export function formatSignature(input: ProblemSignatureInput): string {
  const params = input.parameters.map((p) => `${p.name}: ${p.pythonType}`).join(", ");
  return `def ${input.functionName}(${params}) -> ${input.returnType}:`;
}

export function formatStarterCode(input: ProblemSignatureInput): string {
  return [formatSignature(input), "    # write your solution here", "    pass", ""].join("\n");
}
