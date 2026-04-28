import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

let loaded = false;
let cachedRepoRoot: string | null = null;

/** Walk up from cwd looking for pnpm-workspace.yaml to anchor the repo root. */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume we're running from apps/web and the repo root is two levels up.
  return path.resolve(process.cwd(), "../..");
}

export function ensureEnv(): void {
  if (loaded) return;
  const repoRoot = getRepoRoot();
  // Load both repo-root and cwd .env.local so either layout works.
  loadDotenv({ path: path.join(repoRoot, ".env.local"), override: true });
  loadDotenv({ path: path.join(repoRoot, ".env") });
  loadDotenv({ path: path.join(process.cwd(), ".env.local") });
  loaded = true;
}

export function getRepoRoot(): string {
  if (!cachedRepoRoot) cachedRepoRoot = findRepoRoot();
  return cachedRepoRoot;
}
