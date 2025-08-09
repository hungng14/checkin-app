/**
 * Database configuration and Drizzle ORM setup.
 * Uses Supabase project's DATABASE_URL for server-side migrations and queries.
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export const DATABASE_URL = process.env.DATABASE_URL || "";

export function createPgClient() {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable for Postgres");
  }
  const client = new Client({ connectionString: DATABASE_URL });
  return client;
}

export function createDrizzle(): { db: NodePgDatabase; client: Client } {
  const client = createPgClient();
  const db = drizzle(client);
  return { db, client };
}

