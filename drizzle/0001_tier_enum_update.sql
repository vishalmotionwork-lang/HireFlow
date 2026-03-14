-- Migration: Update tier enum
-- Remove "both", add "intern"

-- Step 1: Update any candidates with tier='both' to 'untiered'
UPDATE "candidates" SET "tier" = 'untiered' WHERE "tier" = 'both';

-- Step 2: Drop the default so we can change the column type
ALTER TABLE "candidates" ALTER COLUMN "tier" DROP DEFAULT;

-- Step 3: Create new enum (if it doesn't exist from a failed prior run, drop it first)
DROP TYPE IF EXISTS "tier_new";
CREATE TYPE "tier_new" AS ENUM ('untiered', 'intern', 'junior', 'senior');

-- Step 4: Update the column to use the new enum
ALTER TABLE "candidates" ALTER COLUMN "tier" TYPE "tier_new" USING "tier"::text::"tier_new";

-- Step 5: Drop old enum and rename new one
DROP TYPE "tier" CASCADE;
ALTER TYPE "tier_new" RENAME TO "tier";

-- Step 6: Restore the default
ALTER TABLE "candidates" ALTER COLUMN "tier" SET DEFAULT 'untiered';
