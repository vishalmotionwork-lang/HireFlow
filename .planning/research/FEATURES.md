# Feature Research

**Domain:** Hiring CRM / Portfolio Review Tool for Creative Teams
**Researched:** 2026-03-13
**Confidence:** HIGH (core ATS features), MEDIUM (creative-specific differentiators)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Candidate profile view | Every CRM/ATS has this — name, contact, portfolio link, status, notes in one place | LOW | Must aggregate all fields in a single scrollable view |
| Pipeline stage tracking | The core of any ATS — users expect to move candidates through defined stages | LOW | 11-stage pipeline is well-defined in requirements; store full status history |
| Team comments on candidate | Breezy HR, Greenhouse, all major ATS tools support this — expected for any collaborative tool | LOW | Comments per candidate, timestamped, attributed to team member |
| Search by name / email | Minimum usable search — every CRM has it | LOW | Full-text search across name + email fields |
| Filter by status and role | Users need to narrow views instantly — a list without filters is unusable at scale | LOW | Per-role filter + status dropdown; Junior/Senior is an additional filter axis |
| List view per role | Role-based segmentation is the primary mental model for this team | LOW | Tabs or slider navigation across Editor / Writer / Designer / AI/Tech + custom roles |
| Candidate import from spreadsheet | Team is migrating from Google Sheets/Excel — import is the entry point, not an add-on | MEDIUM | Must handle messy column names and inconsistent formats gracefully |
| Bulk import with column mapping | Any ATS that handles existing data needs this — expected if offering import at all | MEDIUM | Intelligent column mapping with manual override before committing |
| Status history / activity log | Shows what happened and when — users expect to see the trail | LOW | Append-only log on each candidate: status changes, comments, imports |
| Dashboard / hiring stats | Even Airtable-based setups show counts — users expect a summary view | LOW | Per-role counts, per-status counts, hired vs rejected totals |
| Duplicate detection | Any data system with bulk import needs this — otherwise the database fills with junk | MEDIUM | Flag on name + email match; let team decide merge or keep separate |
| Rejection logging with reason | Structured rejection reasons enable better hiring retrospectives — standard in ATS tools | LOW | Dropdown reason + optional custom note; separate from status change |
| Master view across all roles | Hiring managers need a cross-role pulse — role-specific views alone are incomplete | LOW | Filterable full table with role column visible |
| Custom role creation | Every team has roles the product didn't anticipate — expected for any configurable tool | LOW | Simple add-role flow; role name only for v1 |
| Responsive web UI | The team works from laptops primarily but the tool must not break on smaller screens | MEDIUM | Mobile-readable tables and detail views — not a native app |

---

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI extraction from portfolio links | No other lightweight ATS scrapes Instagram, Behance, Google Drive, and personal sites to auto-fill candidate profiles — eliminates 80% of manual data entry | HIGH | Use AI/LLM to fetch and parse each URL type; human review gate required before saving uncertain data |
| Human review gate for AI extractions | Prevents bad data from silently corrupting the database — the review step is itself a UX differentiator vs "auto-fill and hope" | MEDIUM | Show extracted fields side-by-side with source; one-click confirm or edit before save |
| Contact detection from pasted text | Team currently pastes raw text with mixed contact info — auto-parsing this eliminates manual field entry entirely | MEDIUM | Detect email, WhatsApp, phone, Instagram, YouTube from free-text; show parsed result for confirmation |
| Junior/Senior classification (post-review) | Creative roles need seniority tags assigned by a human after seeing work — not inferred from years of experience. No lightweight ATS does this well | LOW | Toggle on candidate card; filterable; assigned by reviewer, not imported |
| 11-stage creative pipeline | Generic ATS tools have 5-7 generic stages. This pipeline maps exactly to the creative hiring workflow including assignment tracking | LOW | Stages cover full lifecycle including assignment send, follow-up, and fail — specific to creative team context |
| Assignment workflow tracking | Assignment sending and follow-up are tracked as explicit pipeline stages — no other lightweight tool treats assignments as first-class pipeline events | LOW | Status-driven: Assignment Send Pending → Sent → Follow-up → Failed/Passed |
| Per-role isolation with shared master view | Team context-switches by role constantly — dedicated role views with their own filter state plus a cross-role master view is uncommon in lightweight tools | LOW | Each role tab retains its own filter/sort state independently |
| WhatsApp / rejection messaging with custom text | Creative rejection messages matter — a template feels dismissive for creative roles. Per-rejection custom messages are a meaningful differentiator | LOW | Message compose screen pre-filled with candidate name; choose channel (email/WhatsApp); no forced templates |
| Duplicate detection with manual merge control | Auto-merge creates hidden data loss. Flagging + letting team decide is both safer and more appropriate for portfolio-heavy hiring where the same person may apply differently for each role | MEDIUM | Show both records side-by-side; team picks fields to keep on merge |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-merge duplicate candidates | Seems cleaner — no duplicate records | Silent data loss. Portfolio links, notes, and role-specific status can be destroyed. Creative candidates often apply for multiple roles legitimately | Flag duplicates, surface both records, let team decide per case |
| Auto-save AI extractions without review | Speed and less clicks | Bad data silently populates profiles. A wrong email or phone number causes real communication failures downstream | Always show extracted data in a review screen; confirm before saving |
| Role-based permissions / access control | Teams "should" have controls | Wrong priority for a 5-10 person trust-based team. Adds complexity that creates friction without solving a real problem for this team size | Full team access in v1; add permission levels only when team grows past ~20 people |
| In-app email / WhatsApp send | Eliminates switching apps | Requires API integrations (SendGrid, Twilio, WhatsApp Business) that add cost, compliance, and failure modes. One buggy send affects real candidates | Track assignment/rejection status in-app; compose message in-app; send via native email/WhatsApp client |
| Automated rejection messaging | Consistent, no manual effort | Automated rejections for creative roles feel impersonal and damage employer brand. Writers and designers notice template language | Manual custom message per rejection, pre-filled with candidate name as a starting point |
| Native mobile app | Hiring managers want to review on phone | The team works from laptops primarily. Building and maintaining a native app doubles the surface area for a v1 product | Responsive web app covers mobile access without the overhead |
| ATS integrations (Greenhouse, Lever) | Enterprise-grade connectivity | Adds OAuth complexity and maintenance burden for a team that doesn't use those systems | Direct import/export via CSV is sufficient for this team size and workflow |
| AI scoring / auto-ranking candidates | Faster shortlisting | Opaque ranking creates reviewer bias anchoring — people stop looking at portfolios and trust the score instead. Especially problematic for creative roles where taste is subjective | Human review with structured status stages; Junior/Senior tag assigned by reviewer after seeing work |
| Video/audio playback in-app | Seamless portfolio review | Requires media hosting, transcoding, storage costs. Portfolio platforms (YouTube, Vimeo, Behance) already do this better | Link out to source platform; keep the app focused on tracking, not media rendering |
| Onboarding workflow (post-hire) | Full hiring lifecycle in one tool | Onboarding involves IT, payroll, access provisioning — none of which this tool touches. Adding it bloats scope without clear ownership | Mark as hired with basic notes; build onboarding workflow separately in v2 only if validated |

---

## Feature Dependencies

```
Candidate Import (CSV/bulk)
    └──requires──> Column Mapping UI
                       └──requires──> Candidate Profile schema (defined fields)

AI Portfolio Extraction
    └──requires──> Human Review Gate
                       └──requires──> Candidate Profile schema

Duplicate Detection
    └──requires──> Candidate Profile schema
    └──enhances──> Candidate Import (triggered on import)
    └──enhances──> AI Portfolio Extraction (triggered on save)

Status Pipeline Tracking
    └──requires──> Candidate Profile
    └──enhances──> Dashboard (counts derived from status)

Team Comments
    └──requires──> Candidate Profile
    └──requires──> Auth (to attribute comments to team member)

Rejection Messaging
    └──requires──> Status Pipeline Tracking (rejection is a status transition)

Junior/Senior Classification
    └──requires──> Candidate Profile
    └──enhances──> Filter (Junior/Senior filter axis)

Dashboard / Stats
    └──requires──> Status Pipeline Tracking
    └──requires──> Role-based candidate organization

Search + Filters
    └──requires──> Candidate list view (operates on top of it)
    └──enhances──> Master view (cross-role search needs a unified index)

Custom Role Creation
    └──requires──> Role-based organization (extends it)
    └──enhances──> Per-role list views (new role gets its own tab)
```

### Dependency Notes

- **AI Portfolio Extraction requires Human Review Gate:** Extracting without a review step risks bad data entering the system silently. The gate is not optional — it is part of what makes the extraction trustworthy.
- **Duplicate Detection enhances both Import and AI Extraction:** Both entry points can create duplicates. Detection must run at both points, not just one.
- **Dashboard requires Status Pipeline Tracking:** All dashboard counts are derived from status fields. Status must be reliable before dashboard numbers mean anything.
- **Team Comments requires Auth:** Without knowing who said what, comments lose accountability and context. Auth is a prerequisite, not an enhancement.
- **Rejection Messaging requires Status Tracking:** Rejection is a status transition, not a standalone action. The messaging screen is triggered by the status change, not a separate flow.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Candidate profile (name, email, phone/WhatsApp, portfolio link, social handles, role, status, Junior/Senior tag)
- [ ] Role-based list views with tab/slider navigation
- [ ] Single candidate add (paste contact info → auto-detect fields)
- [ ] Bulk import from CSV/Excel with column mapping
- [ ] 11-stage pipeline status with status history log
- [ ] Team comments on candidate profiles
- [ ] Junior/Senior classification toggle (assigned post-review)
- [ ] Search by name or email
- [ ] Filter by status + Junior/Senior within each role view
- [ ] Master view across all roles
- [ ] Duplicate detection on import and manual add — flag for team decision
- [ ] Rejection flow: log reason + compose custom message (copy to send via external channel)
- [ ] Dashboard: per-role counts, per-status counts, hired vs rejected totals
- [ ] Custom role creation
- [ ] AI extraction from portfolio links with human review gate

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Assignment workflow tracking as explicit pipeline stages — add once base pipeline is in daily use and team validates the assignment tracking need
- [ ] Bulk rejection (select multiple → compose single rejection message) — add once rejection volume makes one-by-one painful
- [ ] Export to CSV — add once team starts needing to share data or archive hiring cycles

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] In-app onboarding workflow — defer until hired candidates become the primary user pain point
- [ ] Role-based permissions — defer until team grows past 15-20 people
- [ ] Email/WhatsApp direct send via API — defer until manual copy-paste becomes a proven friction point
- [ ] Interview scheduling — not part of this team's workflow currently
- [ ] Candidate sourcing / job board posting — out of scope for this use case

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Candidate profile + role-based list views | HIGH | LOW | P1 |
| Bulk import with column mapping | HIGH | MEDIUM | P1 |
| 11-stage pipeline status tracking | HIGH | LOW | P1 |
| Team comments | HIGH | LOW | P1 |
| Search + filters | HIGH | LOW | P1 |
| Master view | MEDIUM | LOW | P1 |
| Dashboard stats | MEDIUM | LOW | P1 |
| Duplicate detection | HIGH | MEDIUM | P1 |
| Single add (contact paste + detection) | HIGH | MEDIUM | P1 |
| AI portfolio extraction + review gate | HIGH | HIGH | P1 |
| Custom role creation | MEDIUM | LOW | P1 |
| Rejection flow with custom message | MEDIUM | LOW | P1 |
| Junior/Senior classification | MEDIUM | LOW | P1 |
| Assignment workflow tracking | MEDIUM | LOW | P2 |
| Bulk rejection | LOW | LOW | P2 |
| Export to CSV | LOW | LOW | P2 |
| In-app message send (email/WhatsApp API) | MEDIUM | HIGH | P3 |
| Role-based permissions | LOW | HIGH | P3 |
| Onboarding workflow | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Breezy HR | Airtable/Notion DIY | HireFlow Approach |
|---------|-----------|---------------------|-------------------|
| Portfolio link handling | Link stored as text only | Link stored as text only | AI extraction from link + review gate |
| Creative role workflow | Generic stages only | Custom but manual | 11-stage pipeline specific to creative hiring |
| Bulk import | CSV import with basic mapping | Full CSV/formula support | CSV import with intelligent column mapping |
| Duplicate detection | Basic email match | None by default | Flag on name + email; team decides merge |
| Junior/Senior classification | Not native | Manual column | First-class field, assigned by reviewer |
| Team collaboration | Comments + ratings | Comments via Airtable | Comments with status history in one view |
| Assignment tracking | Not specific | Manual status | Explicit assignment pipeline stages |
| Dashboard | Per-role + funnel analytics | Manual formulas | Per-role + per-status counts, simple and fast |
| Custom rejection messages | Template-based | Manual | Custom compose per candidate |
| Contact info detection from paste | Not available | Not available | Automatic detection from pasted free-text |

---

## Sources

- [Modern Applicant Tracking Systems: What to Look For in 2026 — Lever](https://www.lever.co/blog/modern-applicant-tracking-systems-what-to-look-for-in-2026/)
- [Best Applicant Tracking Systems (ATS) For 2026 — Spotsaas](https://www.spotsaas.com/blog/best-applicant-tracking-systems-ats-for-2026-top-picks-features-buyers-guide-2/)
- [Breezy HR Review 2026 — People Managing People](https://peoplemanagingpeople.com/tools/breezy-review/)
- [Breezy HR vs Workable — SoftwareFinder](https://softwarefinder.com/resources/breezy-hr-vs-workable)
- [Airtable for Recruiting — The Daily Hire](https://thedailyhire.com/tools/airtable-recruiting-workflows-creative-budget-friendly)
- [Why You Shouldn't Use Notion, Airtable or Google Docs for Hiring — Get on Board](https://www.getonbrd.com/blog/why-you-shouldn-t-use-notion-airtable-or-google-docs-for-hiring)
- [Talent Pipeline: Collaborative Hiring Made Easy — Gem](https://www.gem.com/blog/gem-talent-pipeline)
- [Recruitment Dashboard: Metrics, Examples & How to Build One — AIHR](https://www.aihr.com/blog/recruitment-dashboard/)
- [Recruitment Pipeline Management for Small Agencies 2026 — Augtal](https://augtal.com/blog/recruitment-pipeline-management-for-small-agencies-in-2026-the-complete-guide/)
- [Hiring a Product Designer: How to Review Portfolios — GV Library](https://library.gv.com/hiring-a-product-designer-how-to-review-portfolios-8a161746d3c4)
- [Bulk Importing Records — Recruit CRM Help Center](https://help.recruitcrm.io/en/articles/1466454-importing-records-candidates-companies-contacts)
- [Using Job Portfolios in the Hiring Process: A Guide for Employers — Indeed](https://www.indeed.com/hire/c/info/job-portfolio)

---

*Feature research for: Hiring CRM / Portfolio Review Tool for Creative Teams*
*Researched: 2026-03-13*
