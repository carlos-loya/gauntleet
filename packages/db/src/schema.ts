import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type ParameterDef = {
  name: string;
  pythonType: string;
};

export type SampleTest = {
  input: unknown[];
  expectedOutput: unknown;
};

export type ProblemStatus = "draft" | "validated" | "rejected";

export const problems = sqliteTable("problems", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),

  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).notNull(),
  topic: text("topic").notNull(),

  title: text("title").notNull(),
  statement: text("statement").notNull(),
  functionName: text("function_name").notNull(),
  parameters: text("parameters", { mode: "json" }).$type<ParameterDef[]>().notNull(),
  returnType: text("return_type").notNull(),

  referenceSolution: text("reference_solution").notNull(),
  inputGenerator: text("input_generator").notNull(),
  sampleTests: text("sample_tests", { mode: "json" }).$type<SampleTest[]>().notNull(),

  generatorProvider: text("generator_provider").notNull(),
  generatorModel: text("generator_model").notNull(),
  promptVersion: text("prompt_version").notNull(),

  status: text("status", { enum: ["draft", "validated", "rejected"] })
    .notNull()
    .default("draft"),
  validationNotes: text("validation_notes"),
  validatorProvider: text("validator_provider"),
  validatorModel: text("validator_model"),
  validatorSolution: text("validator_solution"),
  validatedAt: integer("validated_at", { mode: "timestamp_ms" }),
  validationSeedCount: integer("validation_seed_count"),
});

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;
