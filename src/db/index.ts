import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const isProduction = process.env.VERCEL === "1";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 1, // Vercel serverless: 1 per function instance
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 10, // 10 minutes
  prepare: false, // Required for Supabase connection pooler (PgBouncer)
});

export const db = drizzle(client, { schema });
