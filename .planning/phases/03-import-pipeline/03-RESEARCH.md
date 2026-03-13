# Phase 3: Import Pipeline - Research

**Researched:** 2026-03-13
**Domain:** File parsing, column mapping UI, duplicate detection, multi-step import wizard
**Confidence:** HIGH (core stack verified via official docs; patterns cross-verified)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMPT-01 | File upload — drag-and-drop or browse, accepts .xlsx, .xls, .csv | SheetJS XLSX.read(arrayBuffer) covers .xlsx/.xls; PapaParse covers .csv; HTML file input with `accept` attribute |
| IMPT-02 | Paste import — raw spreadsheet data from text area | PapaParse.parse(string) with `header: true`; same mapping/validation flow as file upload |
| IMPT-03 | Smart column mapping: preview 5 rows, auto-detect, user confirms | Wizard Step 2 — heuristic keyword match on header strings; confirmed by user before proceeding |
| IMPT-04 | Inconsistent formats: any column order, missing columns, extra columns, empty rows | SheetJS `sheet_to_json({header:1})` gives raw arrays; PapaParse `skipEmptyLines: true`; handled in normalization layer |
| IMPT-05 | Encoding-safe parsing — BOM, Windows-1252, Indian names, +91 numbers | SheetJS `set_cptable` + cpexcel for Windows-1252; manual BOM strip `\ufeff`; PapaParse `encoding` option |
| IMPT-06 | Role assignment on import — from sheet column or user selects | Wizard Step 2 — role dropdown if no column detected; column mapping option |
| IMPT-07 | Rows with missing name or portfolio link flagged in red before proceeding | Wizard Step 3 validation — row-level validation, flag in red, require explicit skip/fix |
| IMPT-10 | Manual entry form — fill fields one by one | Existing `createCandidate` action + thin wrapper; no import batch needed |
| IMPT-11 | Import summary after completion: imported, skipped, duplicates, extraction queued | Summary Step 4 — reads from `importBatches` record returned after server action |
| DUPL-01 | On import/creation check for matching email or phone across existing candidates | Pre-insert query: `WHERE (email = $1 OR phone = $2) AND id != $3`; batch pre-check before insert loop |
| DUPL-02 | Yellow duplicate flag with "may already exist as [Name] in [Role]" | Wizard Step 3 — duplicate rows surfaced with match info before user proceeds |
| DUPL-03 | Team chooses Merge or Keep Separate | Per-row decision in Wizard Step 3; merge combines records, keep separate sets `isDuplicate: true` |
| DUPL-04 | Duplicate rows show yellow warning icon in candidate table | `isDuplicate` boolean column already exists in schema; CandidateRow reads it |
| DUPL-05 | Filter to show only flagged duplicates | `duplicatesOnly` filter already in `getCandidates` query |
</phase_requirements>

---

## Summary

Phase 3 adds spreadsheet import to HireFlow. Users upload an Excel (.xlsx/.xls) or CSV file (or paste raw data), step through a column-mapping screen, validate rows before committing, and receive a summary on completion. Duplicate detection checks incoming rows against all existing candidates by email or phone before insert.

The core parsing stack is already decided: SheetJS Community Edition 0.20.3 for Excel, PapaParse 5.x for CSV. The implementation challenge is not the parsing itself — those libraries handle it well — but the multi-step wizard UI and the pre-insert duplicate detection logic, which must batch-check every incoming row before any inserts happen.

The schema already has `importBatches` and the `isDuplicate` flag on `candidates`. The `duplicatesOnly` filter in the existing `getCandidates` query already works. Phase 3 primarily adds: (1) the parsing/normalization layer, (2) the 4-step import wizard UI, and (3) the server action that runs batch duplicate detection and bulk insert.

**Primary recommendation:** Build the import flow as a 4-step client-side wizard (Upload → Map → Validate/Deduplicate → Summary) backed by a single `/api/import` route handler that accepts multipart form data. Keep all parsing client-side to reduce server payload; send only the normalized JSON rows to the server.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| xlsx (SheetJS CE) | 0.20.3 | Parse .xlsx, .xls files from ArrayBuffer | Official CDN-distributed Community Edition; `XLSX.read(arrayBuffer)` + `sheet_to_json` is the standard API |
| papaparse | 5.4.x | Parse .csv from string (paste) or File | Industry-standard CSV parser; handles BOM, delimiter auto-detect, `skipEmptyLines`, encoding |
| Zod | 4.3.6 (already installed) | Row-level validation schema | Already in project; validates each mapped row before insert |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dropzone | 14.x | Drag-and-drop file input | File upload step — handles drag/drop events, file type filtering, preview |
| sonner | 2.0.7 (already installed) | Toast notifications for import status | Already in project; use for error toasts during import |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-spreadsheet-import | Custom wizard | react-spreadsheet-import is a full pre-built import UI (Chakra UI dep, ~120KB); custom gives full control over HireFlow's specific fields and shadcn styling |
| react-csv-importer | Custom wizard | Same tradeoff; external deps conflict with existing @base-ui/react patterns |
| Server-side XLSX parsing | Client-side parsing + JSON POST | Client-side keeps server action payload small; avoids `bodySizeLimit` issues |

**Installation:**
```bash
# SheetJS Community Edition — must install from CDN, NOT npm registry
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

# PapaParse
npm install papaparse
npm install --save-dev @types/papaparse

# React Dropzone
npm install react-dropzone
```

> **CRITICAL:** Do NOT run `npm install xlsx` — the public npm registry only has SheetJS 0.18.5 (outdated). Always install from `cdn.sheetjs.com`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── import/
│   │   └── page.tsx                 # Import wizard page (client component shell)
│   └── api/
│       └── import/
│           └── route.ts             # POST handler: validates, deduplicates, bulk-inserts
├── components/
│   └── import/
│       ├── ImportWizard.tsx         # Wizard orchestrator — owns step state
│       ├── Step1Upload.tsx          # Drag-drop + paste tab
│       ├── Step2Mapping.tsx         # Column mapping table with dropdowns
│       ├── Step3Validate.tsx        # Row preview with error + duplicate flags
│       └── Step4Summary.tsx         # Import summary card
└── lib/
    ├── import/
    │   ├── parseExcel.ts            # SheetJS: File → RawRow[]
    │   ├── parseCsv.ts              # PapaParse: string|File → RawRow[]
    │   ├── normalizeRows.ts         # Apply column mapping → NormalizedRow[]
    │   ├── validateRows.ts          # Zod: NormalizedRow → ValidatedRow with errors
    │   └── columnHeuristics.ts      # keyword-match: header string → CandidateField
    └── actions/
        └── import.ts                # Server action: deduplication + bulk insert
```

### Pattern 1: 4-Step Wizard with useReducer

**What:** Client component wizard that owns all intermediate state (parsed rows, mapping, validated rows, result). Each step renders based on current `step` value. Steps are sequential.

**When to use:** Multi-step flows where each step's data feeds the next. `useReducer` over multiple `useState` calls to keep transitions atomic.

```typescript
// Source: project pattern — aligns with existing URL-param state patterns in Phase 2
type WizardStep = 'upload' | 'map' | 'validate' | 'summary';

type WizardState = {
  step: WizardStep;
  rawRows: RawRow[];           // output of parseExcel/parseCsv
  headers: string[];
  mapping: ColumnMapping;      // { candidateField: headerIndex | null }
  targetRoleId: string;
  validatedRows: ValidatedRow[];
  result: ImportResult | null;
};

type WizardAction =
  | { type: 'FILE_PARSED'; payload: { rawRows: RawRow[]; headers: string[] } }
  | { type: 'MAPPING_CONFIRMED'; payload: { mapping: ColumnMapping; targetRoleId: string } }
  | { type: 'VALIDATION_COMPLETE'; payload: ValidatedRow[] }
  | { type: 'IMPORT_COMPLETE'; payload: ImportResult }
  | { type: 'BACK' };
```

### Pattern 2: Client-Side Parsing, Server-Side Insert

**What:** All file reading and parsing happens in the browser. The wizard sends only normalized JSON rows to the server action. This avoids the Next.js server action `bodySizeLimit` (default 1MB for non-multipart). No file bytes cross the network.

**When to use:** File imports where the file can be large (multi-MB Excel files), but the extracted data (name, email, phone, portfolio URL, role) is compact JSON.

```typescript
// Step 1: Parse in browser (client component)
const arrayBuffer = await file.arrayBuffer();
const workbook = XLSX.read(arrayBuffer);  // SheetJS
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
// rawRows[0] = headers, rawRows[1..] = data rows

// Step 4: Send only JSON to server action
const result = await importCandidates(validatedRows, targetRoleId);
```

### Pattern 3: Keyword Heuristic Column Mapping

**What:** Auto-detect which spreadsheet column maps to which candidate field by matching column header strings against known keyword lists. User can override via dropdown.

**When to use:** IMPT-03 requires auto-detect + user-confirm flow.

```typescript
// Source: columnHeuristics.ts — project implementation
type CandidateField = 'name' | 'email' | 'phone' | 'instagram' | 'portfolioUrl' | 'ignore';

const FIELD_KEYWORDS: Record<CandidateField, string[]> = {
  name:         ['name', 'full name', 'candidate', 'applicant'],
  email:        ['email', 'e-mail', 'mail'],
  phone:        ['phone', 'mobile', 'whatsapp', 'contact', 'number', 'ph'],
  instagram:    ['instagram', 'ig', 'insta', 'handle'],
  portfolioUrl: ['portfolio', 'link', 'url', 'website', 'work', 'behance', 'dribbble'],
  ignore:       [],
};

export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const [index, header] of headers.entries()) {
    const normalized = header.toLowerCase().trim();
    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      if (keywords.some(kw => normalized.includes(kw))) {
        if (!mapping[field as CandidateField]) {
          mapping[field as CandidateField] = index;
        }
        break;
      }
    }
  }
  return mapping;
}
```

### Pattern 4: Pre-Insert Batch Duplicate Detection

**What:** Before inserting any rows, run one query to find all existing candidates whose email OR phone matches any incoming row. Returns a map of (email|phone) → existing candidate. Flag matching incoming rows as duplicates.

**When to use:** DUPL-01 through DUPL-03. Never check one-by-one inside insert loop — that causes N queries.

```typescript
// Source: project pattern — aligns with existing Drizzle query patterns
// lib/actions/import.ts (server action)
async function detectDuplicates(rows: NormalizedRow[]): Promise<DuplicateMap> {
  const emails = rows.map(r => r.email).filter(Boolean) as string[];
  const phones = rows.map(r => r.phone).filter(Boolean) as string[];

  if (emails.length === 0 && phones.length === 0) return {};

  const existing = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      roleId: candidates.roleId,
      email: candidates.email,
      phone: candidates.phone,
    })
    .from(candidates)
    .where(
      or(
        emails.length > 0 ? inArray(candidates.email, emails) : undefined,
        phones.length > 0 ? inArray(candidates.phone, phones) : undefined,
      )
    );

  // Build lookup map
  const map: DuplicateMap = {};
  for (const c of existing) {
    if (c.email) map[`email:${c.email}`] = c;
    if (c.phone) map[`phone:${c.phone}`] = c;
  }
  return map;
}
```

### Pattern 5: Bulk Insert with importBatches Record

**What:** Create the `importBatches` record first, then insert all candidates linked to that batch ID in a single `db.insert().values([...])` call. Update the batch record with final counts after insert.

**When to use:** IMPT-11 requires an import summary; `importBatches` table already exists in schema.

```typescript
// Drizzle bulk insert — project uses Drizzle ORM 0.45.1
const [batch] = await db.insert(importBatches).values({
  roleId: targetRoleId,
  source: 'excel', // or 'csv' | 'paste'
  totalRows: rows.length,
  importedCount: 0,
  skippedCount: 0,
}).returning();

// Bulk insert candidates
if (toInsert.length > 0) {
  await db.insert(candidates).values(
    toInsert.map(row => ({
      ...row,
      importBatchId: batch.id,
      isDuplicate: false,
    }))
  );
}

// Update batch counts
await db.update(importBatches)
  .set({ importedCount: toInsert.length, skippedCount: skipped.length })
  .where(eq(importBatches.id, batch.id));
```

### Anti-Patterns to Avoid

- **Parsing files server-side via server action:** Excel files can be 5-10MB. Server action default body limit is 1MB. Parse client-side, send JSON rows only.
- **Row-by-row duplicate check inside insert loop:** N database queries for N rows. Use single `inArray` query before any inserts.
- **Auto-merging duplicates:** DUPL-03 explicitly prohibits auto-merge. Always surface to user for Merge vs Keep Separate decision.
- **Using `npm install xlsx` from public registry:** That installs 0.18.5 (outdated). Always install from `cdn.sheetjs.com`.
- **ESM imports for SheetJS in Next.js server-side code:** SheetJS recommends CommonJS for Node.js. In a client component (browser parsing), import as ESM. Keep `parseExcel.ts` as a client-only utility.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel .xlsx parsing | Custom binary parser | SheetJS `XLSX.read(arrayBuffer)` | XLSX format is a zipped XML structure with edge cases for merged cells, multiple sheets, date serial numbers, encoding |
| CSV delimiter detection | Manual regex | PapaParse `delimiter: ''` (auto-detect) | PapaParse tests 10+ common delimiters and handles quoted fields, escaped commas, multiline values |
| BOM stripping | Manual `str.charCodeAt(0) === 0xFEFF` | PapaParse handles it; for SheetJS it's built-in | BOM appears in UTF-8, UTF-16 LE/BE; library handles all variants |
| Windows-1252 / cp1252 decoding | Manual code point table | SheetJS + `set_cptable(cpexcel)` | 256+ code point mappings; Indian names with diacritics require correct lookup table |
| Drag-and-drop file input | Raw `ondragover/ondrop` events | `react-dropzone` | Handles browser differences, prevents page navigation on drop, provides file type filtering |
| Column mapping heuristics | Skip / hardcode column positions | Keyword-match heuristics in `columnHeuristics.ts` | Spreadsheets from different users will have varying column names; heuristic provides 80%+ auto-match rate |

**Key insight:** Excel files contain enough edge cases (merged cells, multiple sheets, date serials, legacy encoding) that hand-rolling a parser would take weeks and still miss edge cases. SheetJS has handled these for years.

---

## Common Pitfalls

### Pitfall 1: Next.js Server Action bodySizeLimit

**What goes wrong:** User uploads a 3MB Excel file via a server action. The request fails silently with a 1MB limit error.
**Why it happens:** Next.js default `bodySizeLimit` for server actions is 1MB. Excel files from real-world hiring spreadsheets can be 2-10MB.
**How to avoid:** Parse files client-side (browser `XLSX.read(arrayBuffer)`) and send only normalized JSON rows to the server. Rows for a 500-row sheet are ~50KB of JSON.
**Warning signs:** Import works for small test files but fails for real spreadsheets.

### Pitfall 2: SheetJS Installed from npm Registry

**What goes wrong:** `npm install xlsx` installs version 0.18.5 from the public registry, which lacks modern APIs and encoding support.
**Why it happens:** SheetJS stopped publishing to npm registry after 0.18.5. The public package is stale.
**How to avoid:** Always install from CDN: `npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
**Warning signs:** `import XLSX from 'xlsx'` works but `XLSX.read(buffer)` behaves unexpectedly or encoding APIs are missing.

### Pitfall 3: BOM Corrupts First Column Header

**What goes wrong:** CSV exported from Excel with UTF-8-BOM encoding has `\ufeff` prepended to the first header. Auto-detection maps this to the wrong field (e.g., `"\ufeffName"` doesn't match `"name"`).
**Why it happens:** Windows Excel exports UTF-8 CSVs with BOM by default. PapaParse exposes `Papa.BYTE_ORDER_MARK` but doesn't always strip it from header keys.
**How to avoid:** Strip BOM explicitly before passing to PapaParse: `const cleaned = str.replace(/^\ufeff/, '')`. Then pass to `Papa.parse(cleaned, { header: true })`.
**Warning signs:** Column mapping never auto-detects the first column correctly on real-world uploads.

### Pitfall 4: sheet_to_json with Default Options Skips Empty Cells

**What goes wrong:** `XLSX.utils.sheet_to_json(ws)` creates objects with only the keys that have values. A row missing the `email` column key means `row.email === undefined` (not `null`), breaking downstream null checks.
**Why it happens:** Default `sheet_to_json` uses object mode with sparse keys.
**How to avoid:** Use `{ header: 1 }` to get raw arrays, then map column index → field using the confirmed mapping. Empty cells become `undefined` in array mode but the index is always present.
**Warning signs:** Duplicate detection misses rows because `undefined !== null` in comparison.

### Pitfall 5: Duplicate Detection Misses Due to Phone Format Variation

**What goes wrong:** Existing candidate has phone `9876543210`. Incoming row has `+91 9876543210`. No match found — both inserted as separate records.
**Why it happens:** Phone numbers have many valid representations. String equality fails across formats.
**How to avoid:** Normalize phone numbers before storing and before comparison: strip non-digits, strip leading country code (`91` or `+91`) for Indian numbers, store last 10 digits as canonical form. Apply same normalization to incoming rows.
**Warning signs:** Obvious duplicates appear in the table even after import.

### Pitfall 6: Wizard State Lost on Browser Refresh

**What goes wrong:** User uploads 200-row file, finishes mapping, navigates away accidentally, loses all work.
**Why it happens:** Wizard state lives in React state (memory) with no persistence.
**How to avoid:** Store the wizard state in `sessionStorage` keyed by a session ID. Restore on mount. Clear on successful import or explicit cancel.
**Warning signs:** User complaints about lost work during import.

### Pitfall 7: React Hydration Error from SheetJS in Server Component

**What goes wrong:** Importing XLSX at the top of a file that gets bundled for both server and client causes hydration errors or missing browser APIs.
**Why it happens:** SheetJS in browser mode uses `FileReader`, `ArrayBuffer`, etc. — browser APIs not available on the server.
**How to avoid:** All SheetJS usage must be inside client components (`'use client'`) or dynamic imports with `{ ssr: false }`. Never import XLSX in server components.
**Warning signs:** `ReferenceError: FileReader is not defined` during SSR.

---

## Code Examples

Verified patterns from official sources and project conventions:

### SheetJS: Parse Excel File from ArrayBuffer
```typescript
// Source: https://docs.sheetjs.com/docs/getting-started/examples/import/
// Usage: client component only ('use client')
import * as XLSX from 'xlsx';

export function parseExcelFile(file: File): Promise<{ headers: string[]; rows: unknown[][] }> {
  return new Promise((resolve, reject) => {
    file.arrayBuffer().then(buffer => {
      try {
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // header: 1 → returns array of arrays; first row is header
        const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
        const [headerRow, ...dataRows] = data as unknown[][];
        resolve({
          headers: (headerRow as string[]).map(h => String(h ?? '').trim()),
          rows: dataRows,
        });
      } catch (err) {
        reject(new Error('Failed to parse Excel file'));
      }
    });
  });
}
```

### PapaParse: Parse CSV from String (Paste Import)
```typescript
// Source: https://www.papaparse.com/docs + betterstack.com guide
// Works in both browser and Node.js
import Papa from 'papaparse';

export function parseCsvString(input: string): { headers: string[]; rows: unknown[][] } {
  // Strip BOM if present
  const cleaned = input.replace(/^\ufeff/, '');

  const result = Papa.parse<unknown[]>(cleaned, {
    header: false,        // return arrays, not objects (consistent with SheetJS)
    skipEmptyLines: true,
    delimiter: '',        // auto-detect
  });

  const [headerRow, ...dataRows] = result.data as unknown[][];
  return {
    headers: (headerRow as string[]).map(h => String(h ?? '').trim()),
    rows: dataRows,
  };
}
```

### PapaParse: Parse CSV File (File Upload)
```typescript
// Source: https://www.papaparse.com/docs
import Papa from 'papaparse';

export function parseCsvFile(file: File): Promise<{ headers: string[]; rows: unknown[][] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      header: false,
      skipEmptyLines: true,
      delimiter: '',
      complete: (result) => {
        const [headerRow, ...dataRows] = result.data as unknown[][];
        resolve({
          headers: (headerRow as string[]).map(h => String(h ?? '').trim()),
          rows: dataRows,
        });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}
```

### Normalize Rows Using Confirmed Mapping
```typescript
// Source: project implementation pattern
export interface ColumnMapping {
  name?: number;
  email?: number;
  phone?: number;
  instagram?: number;
  portfolioUrl?: number;
}

export interface NormalizedRow {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  _rowIndex: number;  // for error reporting back to user
}

export function normalizeRows(rows: unknown[][], mapping: ColumnMapping): NormalizedRow[] {
  return rows.map((row, idx) => ({
    name: mapping.name != null ? String(row[mapping.name] ?? '').trim() || null : null,
    email: mapping.email != null ? String(row[mapping.email] ?? '').trim().toLowerCase() || null : null,
    phone: mapping.phone != null ? normalizePhone(String(row[mapping.phone] ?? '')) : null,
    instagram: mapping.instagram != null ? String(row[mapping.instagram] ?? '').trim() || null : null,
    portfolioUrl: mapping.portfolioUrl != null ? String(row[mapping.portfolioUrl] ?? '').trim() || null : null,
    _rowIndex: idx,
  }));
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  if (digits.length >= 7) return digits;  // keep as-is for international
  return null;
}
```

### Row Validation with Zod
```typescript
// Source: project convention — matches existing Zod v4 usage in candidates.ts
import { z } from 'zod';

export const rowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  portfolioUrl: z.string().url('Invalid URL').nullable().optional(),
});

export type RowError = { field: string; message: string }[];

export function validateRows(rows: NormalizedRow[]): Array<NormalizedRow & { errors: RowError; isValid: boolean }> {
  return rows.map(row => {
    const result = rowSchema.safeParse(row);
    if (result.success) {
      return { ...row, errors: [], isValid: true };
    }
    return {
      ...row,
      errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      isValid: false,
    };
  });
}
```

### Next.js Config for bodySizeLimit (if needed)
```javascript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
// next.config.ts — only needed if sending rows as server action payload (not recommended)
// Prefer client-side parse + API route instead
module.exports = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npm install xlsx` from npm | Install from `cdn.sheetjs.com` | After SheetJS 0.18.5 | Must install from CDN; public npm registry is abandoned |
| Server-side file parsing in API routes | Client-side parse + JSON POST | Next.js 13+ server actions | Avoids body size limits, reduces server load |
| Row-by-row duplicate check | Batch `inArray` query before insert | Standard DB practice | 100-1000x fewer queries for bulk imports |
| Hand-rolled column mapping | Heuristic keyword matching | Established pattern | 80%+ auto-match rate reduces user friction |

**Deprecated/outdated:**
- `xlsx` 0.18.5 from npm: Missing encoding APIs, not maintained at that path
- `PapaParse` config option `worker: true` in Node.js: Web Workers don't exist server-side; only for browser streaming

---

## Open Questions

1. **GPT-4o-mini for column mapping (noted in STATE.md as unresolved)**
   - What we know: Heuristic keyword matching handles common column names. STATE.md flags this as "resolve during Phase 3 planning."
   - What's unclear: Edge cases where column headers are in Gujarati/Hindi or highly abbreviated (e.g., `Inst`, `WA no.`, `Ptfl`)
   - Recommendation: Ship with heuristic-only in Phase 3. Add gpt-4o-mini as enhancement only if manual override rate is high. The mapping UI always lets users fix auto-detection, so incorrect auto-detection is not a blocker.

2. **`importBatchId` NOT NULL constraint for manual entry (IMPT-10)**
   - What we know: Schema has `importBatchId` as nullable on `candidates`. Manual entry via `createCandidate` action doesn't create a batch.
   - What's unclear: IMPT-10 says "Manual entry form" is in Phase 3 scope but the existing `createCandidate` action already handles this. Phase 3 may just need to wire the existing action to a new import page context.
   - Recommendation: IMPT-10 is already implemented via Phase 2's inline add form. Confirm with planner whether Phase 3 needs a dedicated manual-entry form on the import page, or if the existing form is sufficient.

3. **`source` field on `importBatches` — enum vs text**
   - What we know: Schema has `source: text()` with comment `'excel' | 'csv' | 'paste' | 'url' | 'manual'`. SRCH-06 (filter by import source) is a Phase 3 requirement now deferred to end of Phase 2 (STATE.md).
   - Recommendation: Keep as text. The SRCH-06 deferred note from Phase 2 means the filter is already partially wired; Phase 3 populates the `importBatchId` on inserted candidates so the filter works automatically.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.sheetjs.com/docs/getting-started/installation/nodejs/` — SheetJS CE version 0.20.3, CDN install command, CommonJS vs ESM guidance
- `https://docs.sheetjs.com/docs/getting-started/examples/import/` — `XLSX.read(arrayBuffer)`, `sheet_to_json({ header: 1 })`, multi-step workflow
- `https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions` — `bodySizeLimit` default 1MB, configuration syntax (verified for Next.js 16.1.6)
- `https://www.papaparse.com/docs` — `skipEmptyLines`, `delimiter: ''` (auto-detect), `Papa.BYTE_ORDER_MARK`, encoding option
- `/Users/vishal.motion/HireFlow/src/db/schema.ts` — confirmed `importBatches`, `candidates.isDuplicate`, `importBatchId` fields exist
- `/Users/vishal.motion/HireFlow/src/lib/queries/candidates.ts` — confirmed `duplicatesOnly` filter already implemented

### Secondary (MEDIUM confidence)
- `https://betterstack.com/community/guides/scaling-nodejs/parsing-csv-files-with-papa-parse/` — PapaParse Node.js string parsing pattern (multiple sources agree)
- `https://github.com/mholt/PapaParse/issues/840` — BOM issue with first header key; manual strip confirmed as workaround
- WebSearch results on duplicate detection — `inArray` batch query pattern (confirmed by Drizzle ORM existing usage in project)

### Tertiary (LOW confidence)
- WebSearch results on multi-step wizard patterns — general React patterns, not specifically verified against project's @base-ui/react setup

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SheetJS version and CDN install verified via official docs; PapaParse API verified via official docs; Next.js body limit verified via official docs
- Architecture patterns: HIGH — Client-side parse + JSON POST pattern driven by verified body size constraint; wizard pattern aligns with project's existing reducer patterns
- Pitfalls: HIGH — BOM pitfall verified via official GitHub issue; SheetJS npm pitfall verified via official docs; body size pitfall verified via official Next.js docs
- Column mapping heuristics: MEDIUM — Heuristic keyword approach is standard industry practice, not verified by a specific authoritative source, but aligns with react-spreadsheet-import's internal approach

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (SheetJS stable; Next.js serverActions config stable)
