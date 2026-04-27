import { z } from "zod";

export const Difficulty = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const ParameterDef = z.object({
  name: z.string().min(1),
  pythonType: z.string().min(1),
});

export const SampleTest = z.object({
  input: z.array(z.unknown()),
  expectedOutput: z.unknown(),
});

export const GeneratedProblem = z.object({
  title: z.string().min(1).max(120),
  statement: z.string().min(1),
  functionName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "must be a valid Python identifier"),
  parameters: z.array(ParameterDef).min(1).max(8),
  returnType: z.string().min(1),
  referenceSolution: z.string().min(1),
  inputGenerator: z.string().min(1),
  sampleTests: z.array(SampleTest).min(1).max(8),
});

export type GeneratedProblem = z.infer<typeof GeneratedProblem>;
