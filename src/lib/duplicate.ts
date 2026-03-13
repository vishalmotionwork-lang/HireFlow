import { eq, or, and, ilike } from "drizzle-orm";
import { db } from "@/db";
import { candidates } from "@/db/schema";

interface DuplicateMatch {
  candidateId: string;
  candidateName: string;
  matchType: "email" | "phone" | "both";
}

/**
 * Normalize a phone number for comparison.
 * Strips all non-digit chars, removes +91/091 prefix for Indian numbers.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  return digits;
}

/**
 * Check for duplicate candidates by email (case-insensitive exact match)
 * and/or phone (normalized digit comparison).
 *
 * Returns matched candidates with match type. Excludes soft-deleted candidates.
 * If excludeId is provided, that candidate is excluded (for self-check during merge).
 */
export async function checkForDuplicates(params: {
  email?: string | null;
  phone?: string | null;
  excludeId?: string;
}): Promise<DuplicateMatch[]> {
  const { email, phone, excludeId } = params;

  if (!email && !phone) return [];

  const conditions = [];

  if (email) {
    conditions.push(ilike(candidates.email, email.trim()));
  }

  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized.length >= 7) {
      conditions.push(ilike(candidates.phone, `%${normalized}%`));
    }
  }

  if (conditions.length === 0) return [];

  const matches = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
    })
    .from(candidates)
    .where(
      and(eq(candidates.isDeleted, false), or(...conditions)),
    );

  const normalizedPhone = phone ? normalizePhone(phone) : null;

  return matches
    .filter((m) => !excludeId || m.id !== excludeId)
    .map((m) => {
      const emailMatch =
        email && m.email && m.email.toLowerCase() === email.toLowerCase();
      const phoneMatch =
        normalizedPhone &&
        m.phone &&
        normalizePhone(m.phone) === normalizedPhone;

      return {
        candidateId: m.id,
        candidateName: m.name,
        matchType:
          emailMatch && phoneMatch
            ? "both"
            : emailMatch
              ? "email"
              : "phone",
      } satisfies DuplicateMatch;
    });
}
