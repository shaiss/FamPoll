/**
 * Applies pending SQL migrations from ./drizzle before `next build`.
 * Skips quietly when DATABASE_URL is not set, so a deployment without a
 * database still builds and shows the /setup checklist.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping migrations.");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("[migrate] database is up to date.");
} catch (err) {
  console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
