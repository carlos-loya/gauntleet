import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkIndependence,
  createProviderFromEnv,
  type LLMProvider,
  type Role,
} from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
loadDotenv({ path: path.join(repoRoot, ".env.local"), override: true });
loadDotenv({ path: path.join(repoRoot, ".env") });

interface PingResult {
  role: Role;
  ok: boolean;
  provider?: LLMProvider;
}

async function ping(role: Role): Promise<PingResult> {
  let provider: LLMProvider;
  try {
    provider = createProviderFromEnv(role);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${role}] config error: ${msg}`);
    return { role, ok: false };
  }

  const start = Date.now();
  try {
    const result = await provider.complete({
      messages: [{ role: "user", content: "Reply with exactly one word: hello" }],
      maxTokens: 32,
    });
    const ms = Date.now() - start;
    const preview = result.text.trim().slice(0, 80);
    console.log(
      `[${role}] OK (${ms}ms) family=${provider.familyId} model=${provider.model} → ${JSON.stringify(preview)}`
    );
    return { role, ok: true, provider };
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[${role}] FAILED (${ms}ms) family=${provider.familyId} model=${provider.model}: ${msg}`
    );
    return { role, ok: false, provider };
  }
}

async function main(): Promise<void> {
  console.log("Pinging providers...\n");
  const [generator, validator] = await Promise.all([ping("GENERATOR"), ping("VALIDATOR")]);

  console.log();
  if (generator.provider && validator.provider) {
    const independence = checkIndependence(generator.provider, validator.provider);
    if (independence.independent) {
      console.log("✓ Generator and validator are independent.");
    } else {
      console.warn(`⚠ ${independence.reason}`);
    }
  } else {
    console.log("(skipping independence check — one or both providers failed to initialize)");
  }

  if (!generator.ok || !validator.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("smoke test crashed:", err);
  process.exit(1);
});
