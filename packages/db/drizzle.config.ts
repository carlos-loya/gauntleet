import type { Config } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL ?? "file:./data/gauntleet.db";
const dbPath = dbUrl.replace(/^file:/, "");

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
} satisfies Config;
