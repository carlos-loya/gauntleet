import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

export type Db = ReturnType<typeof drizzle>;

export function createDb(filePath: string): Db {
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite);
}

export * as schema from "./schema.js";
