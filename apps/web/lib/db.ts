import "server-only";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
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
import type { ProblemStats } from "./problem-status.js";

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

export type ProblemWithStats = Problem & ProblemStats;

/**
 * Same as `listProblems` but each row carries the user's submission stats so
 * the UI can render solved/attempted/unsolved status and acceptance rate
 * without an N+1 query per problem.
 */
export function listProblemsWithStats(filter: ListProblemsFilter = {}): ProblemWithStats[] {
  const db = getDb();
  const counts = aggregateSubmissionCounts(db);
  const rows = listProblems(filter);
  return rows.map((p) => ({
    ...p,
    totalSubmissions: counts.get(p.id)?.totalSubmissions ?? 0,
    acceptedSubmissions: counts.get(p.id)?.acceptedSubmissions ?? 0,
  }));
}

export function getProblemStats(problemId: string): ProblemStats {
  const db = getDb();
  const row = db
    .select({
      total: sql<number>`COUNT(*)`,
      accepted: sql<number>`SUM(CASE WHEN ${submissions.verdict} = 'accepted' THEN 1 ELSE 0 END)`,
    })
    .from(submissions)
    .where(eq(submissions.problemId, problemId))
    .get();
  return {
    totalSubmissions: Number(row?.total ?? 0),
    acceptedSubmissions: Number(row?.accepted ?? 0),
  };
}

function aggregateSubmissionCounts(db: Db): Map<string, ProblemStats> {
  const rows = db
    .select({
      problemId: submissions.problemId,
      total: sql<number>`COUNT(*)`,
      accepted: sql<number>`SUM(CASE WHEN ${submissions.verdict} = 'accepted' THEN 1 ELSE 0 END)`,
    })
    .from(submissions)
    .groupBy(submissions.problemId)
    .all();
  const map = new Map<string, ProblemStats>();
  for (const r of rows) {
    map.set(r.problemId, {
      totalSubmissions: Number(r.total),
      acceptedSubmissions: Number(r.accepted),
    });
  }
  return map;
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
