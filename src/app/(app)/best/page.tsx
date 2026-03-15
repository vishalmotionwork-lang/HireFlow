export const dynamic = "force-dynamic";

import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBestCandidates } from "@/lib/queries/candidates";
import { BestCandidatesClient } from "@/components/best/best-candidates-client";

export default async function BestCandidatesPage() {
  const [activeRoles, bestCandidates] = await Promise.all([
    db
      .select()
      .from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(roles.sortOrder),
    getBestCandidates(),
  ]);

  return (
    <BestCandidatesClient
      roles={activeRoles}
      candidates={bestCandidates}
    />
  );
}
