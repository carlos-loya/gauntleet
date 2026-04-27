import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate as drizzleMigrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../drizzle");

export function migrate(db: Db): void {
  drizzleMigrate(db, { migrationsFolder });
}
