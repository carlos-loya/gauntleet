import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { config as loadDotenv } from "dotenv";
import { createDb, migrate } from "@gauntleet/db";
import { checkIndependence, createProviderFromEnv } from "@gauntleet/llm";
import {
  Difficulty,
  generateProblem,
  GenerationError,
  validateProblem,
  ValidationError,
} from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
loadDotenv({ path: path.join(repoRoot, ".env.local"), override: true });
loadDotenv({ path: path.join(repoRoot, ".env") });

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (expected something like 'file:./data/gauntleet.db')");
  }
  const filePart = url.replace(/^file:/, "");
  return path.isAbsolute(filePart) ? filePart : path.resolve(repoRoot, filePart);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      difficulty: { type: "string", default: "medium" },
      topic: { type: "string", default: "arrays" },
      "skip-validation": { type: "boolean", default: false },
      seeds: { type: "string", default: "20" },
    },
  });

  const difficulty = Difficulty.safeParse(values.difficulty);
  if (!difficulty.success) {
    console.error(`--difficulty must be one of easy|medium|hard (got "${values.difficulty}")`);
    process.exit(2);
  }
  const topic = (values.topic ?? "").trim();
  if (!topic) {
    console.error("--topic is required");
    process.exit(2);
  }
  const seedCount = Number.parseInt(values.seeds ?? "20", 10);
  if (!Number.isFinite(seedCount) || seedCount < 1) {
    console.error(`--seeds must be a positive integer (got "${values.seeds}")`);
    process.exit(2);
  }
  const skipValidation = values["skip-validation"] === true;

  const dbPath = resolveDbPath();
  const db = createDb(dbPath);
  migrate(db);

  const generator = createProviderFromEnv("GENERATOR");
  console.log(`Generator: family=${generator.familyId} model=${generator.model}`);

  let validator = null;
  if (!skipValidation) {
    try {
      validator = createProviderFromEnv("VALIDATOR");
      console.log(`Validator: family=${validator.familyId} model=${validator.model}`);
      const independence = checkIndependence(generator, validator);
      if (!independence.independent) {
        console.warn(`⚠ ${independence.reason}`);
      }
    } catch (err) {
      console.error(
        `\n✗ Validator config error: ${(err as Error).message}\n` +
          `Pass --skip-validation to generate a draft without cross-validation.`
      );
      process.exit(2);
    }
  }

  console.log(`\nGenerating: difficulty=${difficulty.data} topic=${topic}`);

  const generatedAt = Date.now();
  let problem;
  try {
    problem = await generateProblem({
      generator,
      db,
      input: { difficulty: difficulty.data, topic },
    });
  } catch (err) {
    const ms = Date.now() - generatedAt;
    if (err instanceof GenerationError) {
      console.error(`\n✗ Generation failed after ${ms}ms\n${err.message}`);
    } else {
      console.error(`\n✗ Unexpected error after ${ms}ms`);
      console.error(err);
    }
    process.exit(1);
  }
  const generationMs = Date.now() - generatedAt;

  console.log(`\n✓ Generated problem in ${generationMs}ms`);
  console.log(`  id:        ${problem.id}`);
  console.log(`  title:     ${problem.title}`);
  console.log(
    `  signature: def ${problem.functionName}(${problem.parameters
      .map((p) => `${p.name}: ${p.pythonType}`)
      .join(", ")}) -> ${problem.returnType}`
  );
  console.log(`  status:    ${problem.status}`);
  console.log(`  saved to:  ${dbPath}`);

  if (skipValidation || !validator) {
    console.log(`\n(validation skipped — problem stored as draft)`);
    return;
  }

  console.log(`\nValidating against ${seedCount} random inputs...`);
  const validateAt = Date.now();
  let result;
  try {
    result = await validateProblem({ validator, db, problemId: problem.id, seedCount });
  } catch (err) {
    const ms = Date.now() - validateAt;
    if (err instanceof ValidationError) {
      console.error(`\n✗ Validation crashed after ${ms}ms\n${err.message}`);
    } else {
      console.error(`\n✗ Unexpected error after ${ms}ms`);
      console.error(err);
    }
    process.exit(1);
  }
  const validationMs = Date.now() - validateAt;

  if (result.agreed) {
    console.log(`\n✓ Validated in ${validationMs}ms — ${result.note}`);
    console.log(`  status: ${result.problem.status}`);
  } else {
    console.error(`\n✗ Rejected after ${validationMs}ms`);
    console.error(`  status: ${result.problem.status}`);
    console.error(`  ${result.note.replace(/\n/g, "\n  ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
