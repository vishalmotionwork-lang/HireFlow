import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { roles } from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const defaultRoles = [
  {
    name: "Video Editor",
    slug: "video-editor",
    icon: "Film",
    sortOrder: 0,
  },
  {
    name: "Writer/Scriptwriter",
    slug: "writer-scriptwriter",
    icon: "PenLine",
    sortOrder: 1,
  },
  {
    name: "Designer",
    slug: "designer",
    icon: "Palette",
    sortOrder: 2,
  },
  {
    name: "AI/Tech",
    slug: "ai-tech",
    icon: "Cpu",
    sortOrder: 3,
  },
];

async function seed() {
  console.log("Seeding default roles...");

  const result = await db
    .insert(roles)
    .values(defaultRoles)
    .onConflictDoNothing();

  console.log(`Seed complete. Inserted ${result.count ?? 0} roles (duplicates skipped).`);

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
