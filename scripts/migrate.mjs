/**
 * Applies pending SQL migrations from ./drizzle.
 *
 *   node scripts/migrate.mjs             build mode: skips quietly when DATABASE_URL is unset
 *   node scripts/migrate.mjs --required  manual mode: fails when DATABASE_URL is unset
 *
 * Reads .env.local and .env when a variable is not already exported, takes a
 * Postgres advisory lock so concurrent builds against one database apply the
 * migrations one at a time, and releases it afterwards.
 */
import { existsSync, readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const LOCK_KEY = 739184213; // arbitrary, fixed: identifies "schema migration" for this app
const required = process.argv.includes("--required");

function loadEnvFiles(names) {
  for (const name of names) {
    if (!existsSync(name)) continue;
    for (const line of readFileSync(name, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let value = m[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  }
}

loadEnvFiles([".env.local", ".env"]);
const url = process.env.DATABASE_URL;
if (!url) {
  if (required) {
    console.error("[migrate] DATABASE_URL is not set. Put it in .env.local or export it, then run again.");
    process.exit(1);
  }
  console.log("[migrate] DATABASE_URL not set; skipping migrations.");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false });
let locked = false;
try {
  await client.unsafe(`select pg_advisory_lock(${LOCK_KEY})`);
  locked = true;
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("[migrate] database is up to date.");
} catch (err) {
  console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  if (locked) {
    try {
      await client.unsafe(`select pg_advisory_unlock(${LOCK_KEY})`);
    } catch {
      /* the session ends anyway */
    }
  }
  await client.end();
}
