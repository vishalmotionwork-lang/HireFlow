# Pitfalls Research

**Domain:** Hiring / Portfolio Review CRM (creative teams)
**Researched:** 2026-03-13
**Confidence:** HIGH (verified across multiple sources)

---

## Critical Pitfalls

### Pitfall 1: Spreadsheet Encoding Corruption Silently Destroys Data

**What goes wrong:**
Candidate names, phone numbers, and social handles with special characters (accented names, Indian rupee symbols, regional scripts) import as garbage or get silently dropped. Excel saves CSV files in Windows-1252 / ISO-8859-1 encoding, not UTF-8. The Node.js CSV parser reads them as UTF-8 and misinterprets multibyte characters without throwing an error — the data just looks wrong.

**Why it happens:**
Developers test imports with clean ASCII sample files. Real-world spreadsheets from Google Forms exports, WhatsApp exports, or manually assembled sheets have encoding variations that never surface during development. The parser doesn't throw — it silently munges.

**How to avoid:**
- Detect BOM at file start and handle UTF-8-BOM, UTF-16-LE, and Windows-1252 explicitly
- Use `chardet` or `icu4c` for encoding detection before parsing
- Always add a BOM (`\ufeff`) to UTF-8 outputs so Excel round-trips correctly
- Show a preview of the first 3 parsed rows before committing import — lets the user catch garbled data immediately
- Never auto-commit imports; always require human confirmation

**Warning signs:**
- Test CSV with a name like "Priyá" or "Müller" renders as "Pry?" or box characters
- Phone numbers starting with "+" become empty or truncated
- Import succeeds (200 OK) but the team reports missing candidates

**Phase to address:** Import pipeline phase (spreadsheet upload + column mapping)

---

### Pitfall 2: Column Mapping Confidence Causes Silent Misclassification

**What goes wrong:**
The AI-assisted column mapper guesses "Name" from a column labelled "Full Name (as per Aadhar)" and maps "Portfolio URL" from "Work Sample Link" — getting most right. But it maps "Phone/WhatsApp" from a column that's actually the applicant's LinkedIn handle. These mismatches don't error; they just store wrong data in wrong fields. The team doesn't discover this until they try to contact 200 candidates.

**Why it happens:**
Column names in real creative-team spreadsheets are inconsistent and idiosyncratic. Automated mapping uses fuzzy string matching or LLM inference and assigns high confidence to ambiguous columns. No human verification step means the bad mapping propagates silently.

**How to avoid:**
- Always show the full column mapping preview to the user before import, with confidence score per mapping
- Flag any column where confidence is below a threshold as "needs review"
- Never auto-proceed past the mapping step — require an explicit "Confirm mapping" action
- Persist the mapping config as a reusable template per spreadsheet source, but always allow override
- Mark "unmapped" columns visibly rather than discarding them silently

**Warning signs:**
- Multiple candidates showing identical phone numbers (a different column was mapped)
- Portfolio links pointing to emails or social handles
- Blank contact fields after a bulk import that "succeeded"

**Phase to address:** Import pipeline phase (column mapping + review UI)

---

### Pitfall 3: AI Portfolio Extraction Has No Graceful Degradation

**What goes wrong:**
The AI extraction flow works well for personal websites and Behance profiles in development. In production, Instagram returns rate-limit blocks, Google Drive links require login access, YouTube channels have no contact info, and personal sites use JavaScript-heavy SPAs that a headless fetch can't parse. The system either crashes the extraction, hangs indefinitely, or — worst — hallucinates plausible-looking contact info that is actually wrong.

**Why it happens:**
Developers build happy-path extraction against 5-10 "good" portfolio links. The real candidate pool has dozens of link types, half of which are login-gated, anti-scraping protected, or just broken. AI models fill gaps with invented data when the actual page content is thin (hallucination rate ~2-5% for contact extraction tasks).

**How to avoid:**
- Every AI extraction must return an explicit confidence level per field (high/medium/low/unknown)
- Low-confidence or unknown fields must surface in the human review UI — never auto-save
- Set a hard timeout (10-15 seconds) per extraction request; time-outs surface as "could not fetch" not as hanging spinner
- For Instagram and Google Drive specifically, expect failure — document this as "manual entry required" rather than trying to scrape
- Store the raw extraction result + model response alongside the reviewed final value for debugging
- Never extract and save in a single atomic step; always extract → review → confirm

**Warning signs:**
- Extraction always showing a high-confidence email on portfolio pages that visibly have no email listed
- Team noticing extracted phone numbers that don't match what the candidate actually wrote
- Extraction hanging for minutes on certain link types with no feedback to the user

**Phase to address:** AI extraction feature phase

---

### Pitfall 4: Pipeline State Has No History, Making Audits Impossible

**What goes wrong:**
Candidates move through statuses (Left to Review → Under Review → Shortlisted → Hired). The database stores only the current status. Six weeks in, no one can answer "when did we last update this person's status?", "who moved them to 'Assignment Sent'?", or "why were they rejected?". The team resorts to WhatsApp threads to reconstruct history.

**Why it happens:**
Status history feels like a "nice to have" at build time — it's easier to just update a `status` column. Teams discover the need for history only after several candidates cycle through the pipeline and questions arise that can't be answered.

**How to avoid:**
- Model pipeline status as an append-only log (status_history table with: candidate_id, from_status, to_status, changed_by, changed_at, note)
- Never update a status field in place; always insert a new history record and derive current status from the latest record
- Expose the status history in the candidate detail view from day one — even if sparse, establish the pattern early
- Rejection reason must be stored on the transition record, not on the candidate itself (a candidate can be rejected, reconsidered, and rejected again)

**Warning signs:**
- `candidates` table has a single `status` column with no `updated_at` or `updated_by`
- Team is adding comments like "moved to shortlisted on March 10" in the comments field to compensate for missing history
- Dashboard stats can't show "candidates moved to hired this week" because there's no event record

**Phase to address:** Data model phase (before any pipeline UI is built)

---

### Pitfall 5: Duplicate Detection Triggers Too Eagerly or Not at All

**What goes wrong:**
Either: the system flags every "John Smith" as a duplicate of every other "John Smith" (too many false positives — team wastes time dismissing alerts), or: the same candidate reapplies with a slightly different email and a nickname, and the system misses it completely (false negative — team reviews the same work twice, or worse, gives conflicting feedback to the same person).

**Why it happens:**
Naive duplicate detection uses exact-match on email or name. Creative candidates reapply across hiring cycles with different email addresses, different portfolio links, or stylized names ("Priya K" vs "Priya Kapoor"). Developers either over-tune for precision (missing real duplicates) or recall (flooding team with false alerts).

**How to avoid:**
- Primary signal: email exact match (highest confidence)
- Secondary signals: fuzzy name match + same portfolio domain, or same phone number
- Treat duplicate detection as suggestions, never as blocking — the team decides to merge or keep separate
- Surface duplicates as a notification in the candidate profile ("Possible duplicate: [Name] applied for Editor role on [date]"), not as a modal interruption during import
- Log merge decisions so the team can audit and reverse them

**Warning signs:**
- Team is manually searching for duplicate candidates before every import
- Duplicate alerts fire for clearly unrelated people sharing common names
- Same portfolio link appears under two different candidate records with no cross-reference

**Phase to address:** Import pipeline phase + candidate profile phase

---

### Pitfall 6: Bulk Import Performance Degrades at Scale with N+1 Queries

**What goes wrong:**
Importing 200 candidates works fine. Importing 500 triggers timeouts. At 1,000 the request fails entirely. The import loop runs one INSERT per candidate, each with a separate duplicate check query — classic N+1. The frontend shows a spinner with no progress indicator, and the user has no idea if the import is still running or silently failed.

**Why it happens:**
Developers write the happy-path "import one candidate" logic first, then wrap it in a loop for bulk import. The per-candidate database calls (insert + duplicate check + AI extraction trigger) multiply linearly. Synchronous HTTP requests time out at 30-60 seconds — well before a 500-row import finishes.

**How to avoid:**
- Bulk insert candidates in a single transaction (batch INSERT, not per-row loop)
- Run duplicate checks as a set operation against existing records (JOIN on email list), not per-candidate queries
- Move AI extraction to an async background job queue — import returns immediately after saving raw candidates, extraction runs asynchronously
- Show real import progress: "Processing 47 of 200 candidates..." using either SSE or polling
- Add a dedicated import history log so the team can see what was imported and when, and retry failed imports

**Warning signs:**
- Import request takes more than 5 seconds for 50+ rows
- No progress indication during import — just a spinner
- Duplicate timeouts in production logs for import endpoint
- AI extraction is called synchronously inside the import handler

**Phase to address:** Import pipeline phase (architecture decision must be made before implementation)

---

### Pitfall 7: Supabase RLS Disabled by Default Exposes All Candidate Data

**What goes wrong:**
All candidate records, comments, and contact info are readable by anyone with the Supabase project URL and anon key — which is embedded in the frontend bundle. If the team ever shares the app URL with a contractor or if the URL leaks, all candidate data is fully exposed via direct REST/PostgREST calls.

**Why it happens:**
RLS is disabled by default in Supabase. Development feels fine without it — queries just work. 83% of Supabase data exposure incidents involve RLS misconfigurations. Developers enable RLS only after a security review, often never.

**How to avoid:**
- Enable RLS on every table before writing any application logic — not as a cleanup step
- Create a policy that requires `auth.uid()` to match a known team member (or use a service-role key exclusively server-side)
- Never expose the `service_role` key in the frontend; use Row Level Security + anon key only
- Add indexes on columns referenced in RLS policies (especially `user_id`/`team_id`) to avoid performance degradation

**Warning signs:**
- Running `SELECT * FROM candidates` in the Supabase SQL editor returns data with RLS "bypass" active — but no client-side test was run
- The frontend JS bundle contains `SUPABASE_SERVICE_ROLE_KEY`
- Supabase dashboard shows no RLS policies on the candidates or comments tables

**Phase to address:** Database/auth foundation phase (before any data is stored)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store only current pipeline status (no history) | Simpler schema, faster queries | Can't audit, can't report on throughput, rejection reasons get lost | Never — history is load-bearing for this domain |
| Synchronous AI extraction during import | Simpler code flow | Import timeouts, poor UX, cascading failures on slow URLs | Never in bulk import; acceptable only for single-candidate add |
| Auto-commit column mapping without user review | Faster UX path | Silent data corruption at scale | Never — one bad import corrupts hundreds of records |
| Skip duplicate detection at import time | Faster import | Duplicate records multiply with every cycle; cleanup is expensive | Never |
| No confidence scores from AI extractor | Simpler API response | Team trusts wrong data; hallucinated contact info reaches candidate outreach | Never |
| No pagination on candidate list (fetch all) | Simpler frontend code | Renders fine at 50 candidates, breaks at 300+ | Acceptable only in alpha phase, must be replaced before first real import |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Instagram portfolio links | Attempt direct HTML scraping | Expect 403/429; design the review UI to accept "extraction unavailable — please paste manually" |
| Google Drive links | Assume links are public | Detect `/view?usp=sharing` vs `/edit` vs login-required; prompt "please make this link public or paste contact info manually" |
| Excel/CSV upload | Assume UTF-8 encoding | Detect encoding via BOM; handle Windows-1252 and UTF-16 explicitly; preview parsed data before committing |
| LLM extraction API | No timeout set | Hard-code a 15s timeout; treat timeout as "low confidence" result, not as error |
| LLM extraction API | Assume latest model version has same accuracy | Pin model version; test on regression set after upgrades |
| Email rejection send | Fire-and-forget with no error handling | Log send status; surface failures to team ("email to X failed to send") |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetch all candidates in a single query | Page loads slow as list grows; mobile unusable | Server-side pagination from day one (cursor-based, not offset) | ~200+ candidates per role |
| Offset-based pagination | Pages 5+ load progressively slower | Use cursor-based pagination (keyset pagination) instead | ~500+ total records |
| Render all candidates without virtualization | React thread blocks; scroll janky | react-window or react-virtual for lists > 100 items | ~100+ visible rows |
| Per-candidate duplicate check during import | Import timeout at 100+ rows | Batch check: query all existing emails/phones at once, diff in memory | ~50+ candidate import |
| AI extraction called synchronously in import | Import hangs; user refreshes and double-imports | Job queue (BullMQ or Supabase Edge Functions) for all AI work | First import with slow portfolio URLs |
| No database indexes on filter columns | Filter by status + role + junior/senior gets slow | Index on `(role, status)`, `(role, classification)` from schema creation | ~1,000+ candidate records |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled on Supabase tables | Anyone with anon key can read all candidate personal data via REST | Enable RLS before writing first row; test via client SDK, not SQL editor |
| Storing extracted contact info without consent audit trail | GDPR/DPDP risk — candidate data stored without explicit process record | Log data source for every field ("extracted from portfolio", "imported from spreadsheet", "manually entered") |
| Rejection message templates with candidate PII in URL params | Message logs or browser history exposes candidate data | Use candidate ID only in URLs; resolve to name server-side |
| Service role key in frontend bundle | Full admin access to database if key is leaked | Only use service role key in server-side functions; use anon key + RLS on client |
| No rate limiting on AI extraction endpoint | Team member or browser bug triggers 1,000 extraction requests | Rate limit per user session; queue extractions, don't allow concurrent bursts |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Import shows "Success" but silently discards rows with missing required fields | Team discovers missing candidates days later during review | Show a post-import summary: "198 imported, 2 skipped (missing email — review below)" |
| Status change is a click, not a deliberate action | Accidental status changes with no undo | Require a confirmation step or provide a 5-second undo toast for destructive status changes |
| Duplicate alert is a blocking modal during import | Interrupts bulk workflow; team clicks "dismiss" without reading | Surface duplicates as non-blocking notifications in the candidate profile after import completes |
| AI extraction review screen shows all fields equally | Team spends equal time confirming high-confidence and low-confidence fields | Highlight low-confidence fields with a distinct visual treatment; auto-confirm high-confidence ones |
| Comments section loads all historical comments at once | Slow profile load for candidates with many comments | Paginate comments or lazy-load; show latest 5 by default with "show all" |
| No master view across all roles | Team can't answer "how many candidates total this cycle?" | Build the master view alongside per-role views — it requires the same data, just no role filter |
| Rejection message sent without preview | Wrong candidate name, wrong role in templated rejection | Always show rendered rejection message with actual candidate name before send |

---

## "Looks Done But Isn't" Checklist

- [ ] **Import flow:** Verify encoding handling — test with a CSV exported from Windows Excel containing names with diacritics
- [ ] **Column mapping:** Verify that ambiguous columns surface for user review rather than silently auto-mapping
- [ ] **AI extraction:** Verify that a login-gated Google Drive link returns "could not fetch" gracefully, not a hang or crash
- [ ] **Pipeline status:** Verify that a status change creates a history record — not just updates a column — by querying the history table directly
- [ ] **Duplicate detection:** Verify detection fires for same email different name (reapplication scenario), not just exact-name matches
- [ ] **Bulk import:** Verify that a 200-row import does not make 200 individual database round-trips (check query count in Supabase logs)
- [ ] **RLS:** Verify that running a direct REST query against the Supabase URL with the anon key returns zero rows (not all candidates)
- [ ] **Rejection message:** Verify that send failure surfaces to the user with the candidate name, not just a generic "error"
- [ ] **Dashboard stats:** Verify stats reflect status history events, not just current status snapshot

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bad column mapping corrupts 200 candidates | HIGH | Preserve original import file; re-parse with corrected mapping; use candidate ID to upsert corrected fields; require team review of all affected records |
| Encoding corruption on import | MEDIUM | Re-import from original file with correct encoding detection; deduplicate by email; flag corrupted records for manual correction |
| Status history missing (current status only) | HIGH | Schema migration to add history table; back-fill with single "unknown → [current status]" record per candidate with created_at of record creation; inform team that history before migration date is unavailable |
| Duplicate records discovered post-import | MEDIUM | Build a merge UI: show side-by-side, pick canonical record, move comments and history to canonical, soft-delete duplicate |
| AI-extracted hallucinated contact info saved without review | HIGH | Audit all AI-extracted fields for confidence < threshold; surface to team for manual re-verification; add review gate retroactively if skipped |
| Supabase RLS not enabled, potential data exposure | CRITICAL | Enable RLS immediately; rotate anon key; audit access logs for unusual patterns; notify team; add RLS check to deployment checklist |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Spreadsheet encoding corruption | Import pipeline | Test import with Windows-Excel-encoded CSV containing special characters — verify no garbled data |
| Column mapping silent misclassification | Import pipeline (column mapping UI) | Test with ambiguous column names; verify low-confidence columns surface for review |
| AI extraction no graceful degradation | AI extraction feature | Test with Instagram link, login-gated Drive link, broken URL — verify each returns graceful "unavailable" state |
| Pipeline state no history | Data model phase (foundation) | Query status_history table after every status change — verify row created with user + timestamp |
| Duplicate detection false positives/negatives | Import pipeline + candidate profile | Test: same email different name (should detect), different email same name (should not block), same portfolio domain different person (should flag as suggestion) |
| Bulk import N+1 performance | Import pipeline (architecture) | Import 200 rows; verify Supabase query log shows 1-3 bulk queries, not 200 individual inserts |
| Supabase RLS disabled | Database/auth foundation | Direct REST query with anon key must return 0 rows from candidates table |
| No audit log for rejections | Data model phase (foundation) | Verify rejection reason stored on status_history record, not on candidate row |

---

## Sources

- [Top Web Scraping Challenges in 2025 — ScrapingBee](https://www.scrapingbee.com/blog/web-scraping-challenges/)
- [Instagram Scraping in 2025 — ScrapeCreators](https://scrapecreators.com/blog/instagram-scraping-in-2025-the-workarounds-that-still-work)
- [Social Media Scraping in 2025 — Scrapfly](https://scrapfly.io/blog/posts/social-media-scraping-in-2025)
- [CSV & Excel Encoding Hell in NodeJS — Theodo](https://blog.theodo.com/2017/04/csv-excel-escape-from-the-encoding-hell-in-nodejs/)
- [Supabase Row Level Security Complete Guide 2026 — Vibe App Scanner](https://vibeappscanner.com/supabase-row-level-security)
- [Enforcing Row Level Security in Supabase — DEV Community](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Supabase Row Level Security Docs — Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [How to Handle Large Datasets in Frontend Applications — Great Frontend](https://www.greatfrontend.com/blog/how-to-handle-large-datasets-in-front-end-applications)
- [The Reality of AI Hallucinations in 2025 — drainpipe.io](https://drainpipe.io/the-reality-of-ai-hallucinations-in-2025/)
- [Top 5 AI Reliability Pitfalls — Monte Carlo](https://www.montecarlodata.com/blog-top-5-ai-reliability-pitfalls/)
- [Why CRM Projects Fail in 2025 — Atyantik](https://atyantik.com/why-crm-projects-fail-in-2025/)
- [UX of the Applicant Tracking Software — Intent UX](https://www.intentux.com/post/the-ux-of-the-applicant-tracking-software-ats)
- [Formatting a spreadsheet for import — Less Annoying CRM](https://www.lessannoyingcrm.com/help/format-spreadsheet-import)
- [Combining Embeddings for Job Posting Duplicate Detection — arXiv](https://arxiv.org/html/2406.06257v1)
- [Google Anti-Scraping Changes 2025 — Trajectdata](https://trajectdata.com/google-anti-scraping/)

---

*Pitfalls research for: Hiring / Portfolio Review CRM (HireFlow)*
*Researched: 2026-03-13*
