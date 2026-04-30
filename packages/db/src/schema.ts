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

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "time_limit_exceeded"
  | "memory_limit_exceeded";

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),

  code: text("code").notNull(),
  verdict: text("verdict", {
    enum: [
      "accepted",
      "wrong_answer",
      "runtime_error",
      "time_limit_exceeded",
      "memory_limit_exceeded",
    ],
  }).notNull(),
  /** Index of the failing test case (0-based), or null if all passed. */
  failedAtIndex: integer("failed_at_index"),
  /** Short human-readable note explaining the verdict (stderr snippet, etc.). */
  failureNote: text("failure_note"),
  /** Wall-clock duration of the user solution sandbox run, in ms. */
  runtimeMs: integer("runtime_ms"),
  testsPassed: integer("tests_passed").notNull(),
  testsTotal: integer("tests_total").notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

/**
 * Single-row-per-key settings store. Values are JSON-encoded so the UI can
 * persist heterogeneous data (numbers, strings, nullable provider configs)
 * without a migration each time we add a knob. Validation lives in the app
 * layer, not in the DB.
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;
