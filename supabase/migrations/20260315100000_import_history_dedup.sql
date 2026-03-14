-- Add columns for import history tracking and duplicate sheet detection
ALTER TABLE "import_batches" ADD COLUMN "source_name" text;
ALTER TABLE "import_batches" ADD COLUMN "source_url" text;
ALTER TABLE "import_batches" ADD COLUMN "source_hash" text;

-- Index on source_hash for fast duplicate lookups
CREATE INDEX "import_batches_source_hash_idx" ON "import_batches" ("source_hash") WHERE "source_hash" IS NOT NULL;
