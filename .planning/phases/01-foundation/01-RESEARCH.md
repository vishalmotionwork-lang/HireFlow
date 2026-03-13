# Phase 1: Foundation - Research

**Researched:** 2026-03-13
**Domain:** Next.js 16 App Router + Drizzle ORM (PostgreSQL) + shadcn/ui app shell
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Auth DEFERRED**: No Clerk, no RLS, no sign-in pages. Build everything local-first. App runs fully open locally.
- **Mock user**: Hardcode a mock user (name + avatar) for UI elements that need it (topbar avatar, "added by" fields).
- **Root redirect**: `/` redirects straight to `/dashboard` — no branded landing page.
- **Database**: Local PostgreSQL (preferred) or SQLite with Drizzle ORM. No Supabase connection in Phase 1.
- **ORM**: Drizzle ORM — adapt PRD's Prisma schema to Drizzle pgTable syntax.
- **Core tables**: roles, candidates, candidate_events (immutable status log), candidate_comments, extraction_drafts, import_batches.
- **Default roles seeded**: Video Editor, Writer/Scriptwriter, Designer, AI/Tech — fully editable, nothing locked.
- **Light theme only**: No dark mode. Light sidebar (white/light grey). Content area white (#FFFFFF) or light grey (#F8FAFC).
- **Primary accent**: Blue (#3B82F6).
- **Sidebar structure**: Grouped — Dashboard + Master View at top, "ROLES" section header, role list, "+ New Role" at bottom of role list, Settings pinned at bottom.
- **No candidate count badges** on sidebar roles in Phase 1.
- **Role pages**: `/roles/[roleSlug]` — tab strip + header + empty state. Structure ready for Phase 2.
- **Settings scope**: Role management only (list, create, edit, reorder, deactivate). Team member view deferred.
- **Role creation form fields**: name + icon (preset Lucide icon set, ~20 creative-role-relevant icons) + description.
- **PRD reference**: `~/Downloads/HIREFLOW_COMPLETE_PLAN.md` — use for screen specs, adapt from Prisma/Next.js 14 to Drizzle/Next.js 16.
- **Responsive spec**: PRD Section 21 — mobile hidden overlay sidebar, tablet icon-only, desktop full.

### Claude's Discretion

- Sidebar fixed vs collapsible behavior on desktop.
- User avatar dropdown contents (profile + sign out minimum — no functionality until auth).
- Dashboard: include empty hired/rejected table + activity feed sections as placeholders, or just stats + role cards.
- Role reordering mechanism (drag or manual sort number — either works).
- Font choice (Inter, Geist, or system fonts).
- Exact softer status badge color palette.

### Deferred Ideas (OUT OF SCOPE)

- Authentication (Clerk) + RLS + sign-in pages.
- Deployment / shipping.
- Import feature buttons on role cards.
- Team member view in Settings.
- Dark mode toggle.
- Candidate count badges on sidebar roles.
- Branded landing page at `/`.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | App bootstrapped with Next.js 16 + Drizzle ORM + shadcn/ui + Tailwind CSS (Supabase deferred) | Next.js 16 `create-next-app` + shadcn init + Drizzle PostgreSQL setup |
| FOUND-02 | Clerk authentication — DEFERRED per CONTEXT.md decisions | Skipped: no auth in Phase 1 |
| FOUND-03 | Database schema with core tables: roles, candidates, candidate_events, candidate_comments, extraction_drafts, import_batches | Drizzle pgTable patterns + immutable event log pattern |
| FOUND-04 | Row-level security — DEFERRED per CONTEXT.md decisions | Skipped: no RLS until Supabase connection added |
| FOUND-05 | App shell with sidebar navigation, topbar with global search, mobile-responsive layout | shadcn/ui Sidebar component + collapsible variants |
| ROLE-01 | Default roles seeded on first run: Video Editor, Writer/Scriptwriter, Designer, AI/Tech | Drizzle seed script pattern with `tsx` runner |
| ROLE-02 | User can create custom roles from Settings with name, icon, and description | Server Actions + Zod validation + Drizzle insert |
| ROLE-05 | User can edit or deactivate custom roles (cannot delete roles with candidates) | Server Actions + Drizzle update + guard query |
</phase_requirements>

---

## Summary

Phase 1 builds a working Next.js 16 app with no auth, no external services, and a complete database schema. The app needs: a properly scaffolded project, a local PostgreSQL database wired via Drizzle ORM with all core tables, an app shell (sidebar + topbar + content area), default role seeding on first run, and basic role CRUD from the Settings page.

The stack is well-established. Next.js 16 (released October 2025) makes Turbopack the default bundler and ships with React 19.2. `pg` is on Next.js's built-in `serverExternalPackages` allowlist, meaning no special bundler configuration is needed for Drizzle + PostgreSQL. shadcn/ui ships a first-class Sidebar component with built-in collapsible-to-icons mode, which maps directly to the desktop-vs-tablet responsive requirement. Server Actions + Zod is the current standard pattern for role creation/editing forms.

The main decision to resolve during planning: use local PostgreSQL (closer to production Supabase target, requires Docker or a local install) vs SQLite (zero setup, requires schema dialect swap later). CONTEXT.md prefers PostgreSQL, so that is what this research targets. SQLite is documented as an alternative fallback only.

**Primary recommendation:** Bootstrap with `create-next-app@latest`, initialize shadcn with the `sidebar` and relevant components, configure Drizzle with `postgres` driver against a local PostgreSQL instance, define schema in `src/db/schema.ts`, run `drizzle-kit push` for dev, and seed with a `tsx src/db/seed.ts` script.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.x | App framework, routing, Server Actions | Project requirement; Turbopack default, React 19.2 |
| react / react-dom | 19.2 | UI runtime | Shipped with Next.js 16 |
| drizzle-orm | latest (0.38+) | Type-safe ORM for PostgreSQL | Chosen over Prisma for smaller bundle; no cold-start penalty |
| drizzle-kit | latest | Schema management + migrations CLI | Companion tool to drizzle-orm |
| postgres | 3.x | PostgreSQL JS driver (postgres.js) | Lightweight, no native bindings; works seamlessly with Drizzle |
| tailwindcss | 4.x | Utility-first CSS | Shipped by `create-next-app` with Tailwind flag; v4 is default in 2025 |
| shadcn/ui | latest | Component library (copies source into project) | Project requirement; ships Sidebar, Button, Input, Form, etc. |
| lucide-react | latest | Icon set | shadcn/ui default icon library; 20 creative-role icons available |
| zod | 3.x | Schema validation | Standard validation layer for Server Actions |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest | Run TypeScript scripts (seed, migrations) | Run `seed.ts` without build step |
| dotenv | 16.x | Load `.env.local` in drizzle.config.ts | Config file runs outside Next.js, needs manual env loading |
| @types/node | 22.x | Node.js type definitions | TypeScript projects with Node APIs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| postgres (postgres.js) | pg (node-postgres) | `pg` also works; `postgres` is slightly leaner for new projects with no native binding requirement |
| Local PostgreSQL | SQLite via better-sqlite3 | SQLite = zero-setup but requires schema dialect swap when connecting to Supabase later; not recommended given the target is PostgreSQL |
| drizzle-kit push | drizzle-kit generate + migrate | `push` is faster for local dev iteration; generate+migrate creates versioned SQL files for production — use push in Phase 1, switch to generate+migrate before Supabase connection |

**Installation:**
```bash
npx create-next-app@latest hireflow --typescript --tailwind --eslint --app --src-dir
npx shadcn@latest init
npx shadcn@latest add sidebar button input form label select badge card separator skeleton toast

npm install drizzle-orm postgres
npm install -D drizzle-kit tsx dotenv @types/node
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (SidebarProvider wraps here)
│   ├── page.tsx                # Redirects to /dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   ├── master/
│   │   └── page.tsx
│   ├── roles/
│   │   └── [roleSlug]/
│   │       └── page.tsx
│   └── settings/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx     # Sidebar with role list
│   │   ├── topbar.tsx          # Search + avatar
│   │   └── app-shell.tsx       # SidebarProvider + layout wrapper
│   ├── roles/
│   │   ├── role-form.tsx       # Create/edit role form
│   │   └── role-list.tsx       # Settings role list with reorder
│   └── ui/                     # shadcn/ui generated components
├── db/
│   ├── index.ts                # Drizzle client singleton
│   ├── schema.ts               # All table definitions
│   └── seed.ts                 # Default role seeding script
├── lib/
│   ├── actions/
│   │   └── roles.ts            # Server Actions for role CRUD
│   └── validations/
│       └── role.ts             # Zod schemas for role forms
└── types/
    └── index.ts                # Shared TypeScript types
drizzle/                        # Generated migration files (git-tracked)
drizzle.config.ts               # Drizzle Kit config (project root)
```

### Pattern 1: Drizzle Client Singleton

Keep one db instance and avoid creating new connections per request. In Next.js App Router, module-level singletons are safe for server-side use.

```typescript
// src/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started-postgresql
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### Pattern 2: Drizzle Schema Definition (pgTable)

```typescript
// src/db/schema.ts
// Source: https://orm.drizzle.team/docs/sql-schema-declaration
import { pgTable, text, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull().default('Briefcase'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Immutable event log — no updates, only inserts
export const candidateEvents = pgTable('candidate_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidates.id),
  eventType: text('event_type').notNull(), // 'status_change', 'tier_change', etc.
  fromValue: text('from_value'),
  toValue: text('to_value').notNull(),
  createdBy: text('created_by').notNull().default('mock-user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Pattern 3: Server Action with Zod Validation

```typescript
// src/lib/actions/roles.ts
// Source: https://nextjs.org/docs/app/guides/forms
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { roleCreateSchema } from '@/lib/validations/role';

export async function createRole(formData: FormData) {
  const parsed = roleCreateSchema.safeParse({
    name: formData.get('name'),
    icon: formData.get('icon'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const slug = parsed.data.name.toLowerCase().replace(/\s+/g, '-');

  await db.insert(roles).values({ ...parsed.data, slug });
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}
```

### Pattern 4: shadcn/ui Sidebar — Collapsible to Icons

```typescript
// src/components/layout/app-sidebar.tsx
// Source: https://ui.shadcn.com/docs/components/radix/sidebar
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';

// collapsible="icon" gives desktop icon-only mode automatically
// Side="left", variant="sidebar" (default) for standard app sidebar
<Sidebar collapsible="icon">
  <SidebarHeader>...</SidebarHeader>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>ROLES</SidebarGroupLabel>
      <SidebarMenu>
        {roles.map(role => (
          <SidebarMenuItem key={role.id}>
            <SidebarMenuButton asChild>
              <Link href={`/roles/${role.slug}`}>
                <RoleIcon name={role.icon} />
                <span>{role.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  <SidebarFooter>...</SidebarFooter>
</Sidebar>
```

### Pattern 5: drizzle.config.ts for Local PostgreSQL

```typescript
// drizzle.config.ts (project root)
// Source: https://orm.drizzle.team/docs/drizzle-config-file
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Pattern 6: Seed Script

```typescript
// src/db/seed.ts — run with: npx tsx src/db/seed.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { roles } from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const defaultRoles = [
  { name: 'Video Editor', slug: 'video-editor', icon: 'Film', sortOrder: 0 },
  { name: 'Writer/Scriptwriter', slug: 'writer-scriptwriter', icon: 'PenLine', sortOrder: 1 },
  { name: 'Designer', slug: 'designer', icon: 'Palette', sortOrder: 2 },
  { name: 'AI/Tech', slug: 'ai-tech', icon: 'Cpu', sortOrder: 3 },
];

async function seed() {
  await db.insert(roles).values(defaultRoles).onConflictDoNothing();
  console.log('Seeded default roles');
  process.exit(0);
}

seed();
```

### Anti-Patterns to Avoid

- **Creating a new Drizzle client per request:** Always use a module-level singleton in `src/db/index.ts`.
- **Mutating candidateEvents rows:** This table is insert-only. Never add `update` operations to it — it is the audit trail.
- **Putting Server Actions in page.tsx:** Extract to `src/lib/actions/` for discoverability and testability.
- **Using `app/api/` routes for form submissions:** Server Actions are the correct pattern in App Router for mutations.
- **Importing server-only code in Client Components:** Keep db imports in Server Components, Server Actions, or Route Handlers only.
- **Running schema push in production:** Use `drizzle-kit push` only in local dev. Generate SQL files for production migrations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar responsive behavior | Custom CSS + JS toggle | `shadcn/ui Sidebar` with `collapsible="icon"` | Built-in state, keyboard shortcut (Cmd+B), mobile sheet behavior, cookie persistence |
| Form validation | Manual field checks | Zod + Server Actions `safeParse` | Type inference, fieldErrors map, composable schemas |
| Schema migrations | SQL files by hand | `drizzle-kit push` (dev) / `drizzle-kit generate` (prod) | Diff-based, reversible, versioned |
| Toast notifications | Custom toast state | `shadcn/ui Toast` / `Sonner` | Focus management, accessibility, stacking |
| Icon management | SVG copy-paste | `lucide-react` named exports | Tree-shakeable, consistent sizing, TypeScript types |
| Slug generation | Custom regex | Simple `name.toLowerCase().replace(/\s+/g, '-')` is sufficient for roles | No need for external lib; validate uniqueness at DB level |

**Key insight:** The shadcn/ui Sidebar component is battle-tested for exactly this use case (app shell with collapsible navigation). Use it wholesale rather than building a custom sidebar.

---

## Common Pitfalls

### Pitfall 1: `DATABASE_URL` not available in drizzle.config.ts

**What goes wrong:** `drizzle-kit push` or `drizzle-kit generate` fails with "Cannot read DATABASE_URL" because Next.js `.env.local` is not loaded outside the Next.js runtime.
**Why it happens:** `drizzle.config.ts` runs via Node.js directly, not through Next.js, so Next.js's automatic env loading doesn't apply.
**How to avoid:** Add `import 'dotenv/config';` as the very first line of `drizzle.config.ts`. Install `dotenv` as a dev dependency.
**Warning signs:** Error message mentioning `undefined` DATABASE_URL when running any `drizzle-kit` command.

### Pitfall 2: Turbopack symlink errors with pnpm

**What goes wrong:** Turbopack fails to resolve `postgres` or `pg` packages when using pnpm workspaces.
**Why it happens:** Turbopack 16.1+ fixed transitive `serverExternalPackages` resolution for npm. pnpm's symlinked node_modules can still cause edge cases (tracked issue: vercel/next.js#68805).
**How to avoid:** Use npm or add `postgres` to `serverExternalPackages` in `next.config.js` if issues arise. `pg` is already in Next.js's built-in opt-out list.
**Warning signs:** Build error mentioning symlink creation failure for postgres packages.

### Pitfall 3: Server Actions import in Client Component

**What goes wrong:** `ReferenceError: process is not defined` or database connection errors in the browser.
**Why it happens:** If a Client Component imports directly from `@/db`, the db module gets bundled client-side.
**How to avoid:** Server Actions files must have `'use server'` at the top. Never import `@/db` in a file with `'use client'`. Pass data down as props or use `useActionState` to call actions.
**Warning signs:** Build warning about server-only modules in client bundle.

### Pitfall 4: Slug collisions for roles

**What goes wrong:** Two roles with similar names (e.g., "AI/Tech" and "AI Tech") generate the same slug.
**Why it happens:** Simple slug generation doesn't handle special characters or existing slugs.
**How to avoid:** Define `slug` column with `.unique()` constraint in the schema. Catch the unique violation in the Server Action and return a user-friendly error.
**Warning signs:** PostgreSQL unique constraint error on role insert.

### Pitfall 5: shadcn/ui Tailwind v4 compatibility

**What goes wrong:** shadcn components render unstyled or have broken animations.
**Why it happens:** shadcn/ui's `tailwindcss-animate` plugin behavior changed with Tailwind v4. The `@plugin 'tailwindcss-animate'` directive may need replacement.
**How to avoid:** Follow the 2025 setup guide. If using Tailwind v4, check shadcn docs for the current recommended animation setup. The `npx shadcn@latest init` CLI handles this automatically.
**Warning signs:** Components render without transitions or hover states don't apply.

### Pitfall 6: Sidebar role list not updating after role creation

**What goes wrong:** New role appears in Settings but sidebar doesn't update.
**Why it happens:** The sidebar fetches roles server-side; after a Server Action, `revalidatePath` must target every path that renders the sidebar (root layout or each page path).
**How to avoid:** Call `revalidatePath('/', 'layout')` in role creation/edit actions to invalidate the root layout cache, which includes the sidebar.
**Warning signs:** Stale role list in sidebar after successful creation.

---

## Code Examples

### Full Schema (Phase 1 tables)

```typescript
// src/db/schema.ts
import {
  pgTable, text, integer, boolean, timestamp, uuid, pgEnum
} from 'drizzle-orm/pg-core';

// Enums
export const candidateStatusEnum = pgEnum('candidate_status', [
  'left_to_review', 'under_review', 'shortlisted', 'not_good',
  'maybe', 'assignment_pending', 'assignment_sent', 'assignment_followup',
  'assignment_passed', 'assignment_failed', 'hired', 'rejected'
]);

export const tierEnum = pgEnum('tier', ['untiered', 'junior', 'senior', 'both']);

// Roles
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull().default('Briefcase'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Candidates (structure only — populated in Phase 2)
export const candidates = pgTable('candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  instagram: text('instagram'),
  portfolioUrl: text('portfolio_url'),
  status: candidateStatusEnum('status').notNull().default('left_to_review'),
  tier: tierEnum('tier').notNull().default('untiered'),
  isDuplicate: boolean('is_duplicate').notNull().default(false),
  createdBy: text('created_by').notNull().default('mock-user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Immutable event log — insert only, no updates
export const candidateEvents = pgTable('candidate_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidates.id),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value').notNull(),
  createdBy: text('created_by').notNull().default('mock-user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Comments
export const candidateComments = pgTable('candidate_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidates.id),
  body: text('body').notNull(),
  createdBy: text('created_by').notNull().default('mock-user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  editedAt: timestamp('edited_at'),
});

// Extraction drafts (AI extraction — used in Phase 4, schema created now)
export const extractionDrafts = pgTable('extraction_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  importBatchId: uuid('import_batch_id').references(() => importBatches.id),
  sourceUrl: text('source_url'),
  rawData: text('raw_data'),
  extractedData: text('extracted_data'),  // JSON stored as text
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Import batches (used in Phase 3, schema created now)
export const importBatches = pgTable('import_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  source: text('source').notNull(), // 'excel', 'csv', 'paste', 'url', 'manual'
  totalRows: integer('total_rows').notNull().default(0),
  importedCount: integer('imported_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),
  createdBy: text('created_by').notNull().default('mock-user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Zod Validation Schemas

```typescript
// src/lib/validations/role.ts
import { z } from 'zod';

export const roleCreateSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  icon: z.string().min(1, 'Icon is required'),
  description: z.string().max(500).optional(),
});

export const roleUpdateSchema = roleCreateSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
```

### Root Layout with SidebarProvider

```typescript
// src/app/layout.tsx
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function RootLayout({ children }) {
  // Fetch roles server-side for sidebar
  const activeRoles = await db.select()
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.sortOrder);

  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppSidebar roles={activeRoles} />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
```

### Package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webpack (Next.js 14/15) | Turbopack default (Next.js 16) | Oct 2025 | 2-5x faster builds, 10x faster Fast Refresh |
| `experimental.turbo` config | `turbopack` config key | Next.js 16 | Old key removed; use `turbopack` in next.config.ts |
| `middleware.ts` | `proxy.ts` (Next.js 16) | Oct 2025 | `middleware.ts` still works but `proxy.ts` is the new model |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 release | `useFormState` is deprecated; use `useActionState` |
| Prisma schema (.prisma files) | Drizzle ORM (TypeScript) | — | Drizzle uses pure TypeScript; no separate schema language |
| `serverComponentsExternalPackages` | `serverExternalPackages` | Next.js 15 | Renamed; old name removed in v16 |

**Deprecated/outdated:**
- `experimental.turbo` config key: removed in Next.js 16 — use `turbopack` at the top level
- `useFormState`: deprecated in React 19 — use `useActionState` from `react`
- Drizzle Relations v1 (`relations` export): still works but v2 (`defineRelations`) is current API

---

## Open Questions

1. **Local PostgreSQL vs Docker**
   - What we know: CONTEXT.md says "local PostgreSQL or SQLite" — PostgreSQL is preferred
   - What's unclear: Whether developer environment has PostgreSQL installed or needs Docker
   - Recommendation: Document both paths in setup instructions. Provide a `docker-compose.yml` for one-command local DB. Make DATABASE_URL the only required env variable.

2. **Role reordering mechanism**
   - What we know: CONTEXT.md marks this as Claude's discretion — either drag-to-reorder or manual sort number
   - What's unclear: Whether drag UX is worth the complexity in Phase 1 (requires `@dnd-kit` or similar)
   - Recommendation: Use simple up/down arrows or numbered input in Phase 1. Drag-to-reorder can be upgraded in a later phase. Avoids a dependency on `@dnd-kit` before it's truly needed.

3. **`updatedAt` auto-update trigger**
   - What we know: Drizzle defines `updatedAt` columns but doesn't auto-update them on row changes by default (unlike Prisma's `@updatedAt`)
   - What's unclear: Whether to use a PostgreSQL trigger or manually set `updatedAt` in every update Server Action
   - Recommendation: Manually set `updatedAt: new Date()` in all update operations for Phase 1 simplicity. Add a DB trigger in a later cleanup phase if the pattern becomes repetitive.

---

## Sources

### Primary (HIGH confidence)

- https://nextjs.org/docs/app/getting-started/project-structure (v16.1.6, updated 2026-02-27) — official structure conventions
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages (v16.1.6, updated 2026-02-27) — `pg` confirmed in built-in opt-out list
- https://orm.drizzle.team/docs/get-started-postgresql — official Drizzle PostgreSQL setup
- https://orm.drizzle.team/docs/drizzle-config-file — official drizzle.config.ts reference
- https://orm.drizzle.team/docs/sql-schema-declaration — pgTable column patterns
- https://ui.shadcn.com/docs/components/radix/sidebar — Sidebar component, collapsible variants, SidebarProvider
- https://nextjs.org/docs/app/guides/forms — Server Actions form pattern (official)

### Secondary (MEDIUM confidence)

- https://nextjs.org/blog/next-16 — Next.js 16 release notes (Turbopack default, React 19.2, proxy.ts)
- https://nextjs.org/blog/next-16-1 — 16.1 fixes Turbopack transitive serverExternalPackages
- https://strapi.io/blog/how-to-use-drizzle-orm-with-postgresql-in-a-nextjs-15-project — confirmed drizzle.config.ts patterns
- https://anasrin.vercel.app/blog/seeding-database-with-drizzle-orm/ — seed script pattern with tsx

### Tertiary (LOW confidence)

- GitHub discussion vercel/next.js#68805 — pnpm + Turbopack symlink issues (open, unresolved as of research date)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official Next.js 16, Drizzle, shadcn/ui docs
- Architecture: HIGH — patterns taken directly from official documentation and confirmed examples
- Pitfalls: MEDIUM-HIGH — most verified via official docs; pnpm Turbopack issue is LOW (single GitHub thread)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable libraries; re-verify if Next.js 16.2+ releases)
