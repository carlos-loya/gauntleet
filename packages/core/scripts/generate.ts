import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { config as loadDotenv } from "dotenv";
import { createDb, migrate } from "@gauntleet/db";
import { createProviderFromEnv } from "@gauntleet/llm";
import { Difficulty, generateProblem, GenerationError } from "../src/index.js";

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

  const dbPath = resolveDbPath();
  const db = createDb(dbPath);
  migrate(db);

  const generator = createProviderFromEnv("GENERATOR");
  console.log(
    `Generating: difficulty=${difficulty.data} topic=${topic}\n` +
      `Generator: family=${generator.familyId} model=${generator.model}`
  );

  const startedAt = Date.now();
  try {
    const problem = await generateProblem({
      generator,
      db,
      input: { difficulty: difficulty.data, topic },
    });
    const ms = Date.now() - startedAt;
    console.log(`\n✓ Generated problem in ${ms}ms`);
    console.log(`  id:        ${problem.id}`);
    console.log(`  title:     ${problem.title}`);
    console.log(
      `  signature: def ${problem.functionName}(${problem.parameters
        .map((p) => `${p.name}: ${p.pythonType}`)
        .join(", ")}) -> ${problem.returnType}`
    );
    console.log(`  status:    ${problem.status}`);
    console.log(`  saved to:  ${dbPath}`);
    console.log(`\n--- statement ---\n${problem.statement}\n`);
  } catch (err) {
    const ms = Date.now() - startedAt;
    if (err instanceof GenerationError) {
      console.error(`\n✗ Generation failed after ${ms}ms\n${err.message}`);
    } else {
      console.error(`\n✗ Unexpected error after ${ms}ms`);
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
