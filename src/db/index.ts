import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const isProduction = process.env.VERCEL === "1";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: isProduction ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
