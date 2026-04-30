import "server-only";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import {
  createDb,
  migrate,
  problems,
  submissions,
  type Db,
  type Problem,
  type Submission,
} from "@gauntleet/db";
import { ensureEnv, getRepoRoot } from "./env";

let dbSingleton: Db | null = null;

export function getDb(): Db {
  if (dbSingleton) return dbSingleton;
  ensureEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (expected something like 'file:./data/gauntleet.db')");
  }
  const filePart = url.replace(/^file:/, "");
  const filePath = path.isAbsolute(filePart) ? filePart : path.resolve(getRepoRoot(), filePart);
  const db = createDb(filePath);
  migrate(db);
  dbSingleton = db;
  return db;
}

export interface ListProblemsFilter {
  difficulty?: Problem["difficulty"];
  topic?: string;
  status?: Problem["status"];
}

export function listProblems(filter: ListProblemsFilter = {}): Problem[] {
  const db = getDb();
  const conditions = [eq(problems.status, filter.status ?? "validated")];
  if (filter.difficulty) conditions.push(eq(problems.difficulty, filter.difficulty));
  if (filter.topic) conditions.push(eq(problems.topic, filter.topic));
  return db
    .select()
    .from(problems)
    .where(and(...conditions))
    .orderBy(desc(problems.createdAt))
    .all();
}

export function getProblem(id: string): Problem | null {
  const db = getDb();
  const row = db.select().from(problems).where(eq(problems.id, id)).get();
  return row ?? null;
}

export function listSubmissions(problemId: string, limit = 50): Submission[] {
  const db = getDb();
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.problemId, problemId))
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .all();
}

export function listAllTopics(): string[] {
  const db = getDb();
  const rows = db
    .selectDistinct({ topic: problems.topic })
    .from(problems)
    .where(eq(problems.status, "validated"))
    .all();
  return rows.map((r) => r.topic).sort((a, b) => a.localeCompare(b));
}
