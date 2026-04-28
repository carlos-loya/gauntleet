import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type DatabaseConstructor from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

// better-sqlite3 is a native CommonJS module. Loading it via createRequire forces
// Node to resolve it at runtime instead of letting bundlers (Next/webpack) try to
// inline its require() calls — which strips its native binding and breaks the
// constructor with a misleading "indexOf of undefined" error.
const requireFromHere = createRequire(import.meta.url);
const Database: typeof DatabaseConstructor = requireFromHere("better-sqlite3");

export type Db = ReturnType<typeof drizzle>;

export function createDb(filePath: string): Db {
  mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite);
}

export { migrate } from "./migrate.js";
export * from "./schema.js";
