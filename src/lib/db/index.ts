import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env, hasDatabase } from "../env";

export type Db = PostgresJsDatabase<typeof schema>;

declare global {
  var __appDb: Db | undefined;
}

/**
 * Lazily creates one shared connection pool per process. Throws a clear error
 * when DATABASE_URL is missing so callers can route to the setup page instead.
 */
export function getDb(): Db {
  if (!hasDatabase) {
    throw new Error("DATABASE_URL is not set. Open /setup for what is missing.");
  }
  if (!globalThis.__appDb) {
    const client = postgres(env.databaseUrl, { max: 5, prepare: false });
    globalThis.__appDb = drizzle(client, { schema });
  }
  return globalThis.__appDb;
}

export { schema };
