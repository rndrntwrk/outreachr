# Phase 5: Reviewed Opportunity Atlas Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import reviewed Opportunity Atlas intelligence into the private local execution system through a deterministic, digest-pinned, source-aware and conflict-safe package.

**Architecture:** Define a canonical JSON package rather than parsing spreadsheets inside the desktop app. An external research workflow exports reviewed JSON; Outreachr validates, previews and imports it transactionally. Re-import compares incoming payloads with the previous imported snapshot and creates founder-reviewable conflicts instead of overwriting local decisions.

**Tech Stack:** TypeScript, Zod 4, stable canonical JSON, Node SHA-256, SQL.js SQLite, Electron file picker, React, Vitest.

## Global Constraints

- The Atlas remains the broad public research and scoring layer.
- Outreachr imports only reviewed execution records and source metadata.
- Spreadsheet parsing is out of scope for the desktop application; the producer exports canonical JSON.
- The package contains no private contacts, warm paths, meeting notes, application answers, credentials or diligence.
- Package IDs cannot silently change digest.
- Re-import is idempotent.
- Founder-modified fields are never overwritten without explicit conflict resolution.
- Unknown dates remain null.
- Unannounced recurrence remains watchlist/closed-recurring rather than fabricated upcoming dates.
- Source rights and attribution remain attached to every imported fact.
- The importer never performs web research or external fetching.

---

## Package Shape

```json
{
  "format": "rndrntwrk.opportunity-package",
  "version": 1,
  "packageId": "atlas:2026-08-15:v1.1",
  "distribution": "private_local",
  "generatedAt": "2026-08-15T12:00:00Z",
  "reviewedAt": "2026-08-15T12:30:00Z",
  "reviewedBy": "founder",
  "sourceCutoff": "2026-08-15T11:59:59Z",
  "payload": {
    "sources": [],
    "organizations": [],
    "opportunities": [],
    "hackathonCycles": [],
    "tracks": [],
    "sponsors": [],
    "bounties": [],
    "rules": []
  },
  "logicalDigestSha256": "64-lowercase-hex"
}
```

The digest covers every field except `logicalDigestSha256`, serialized with the repository’s `stableJson` rules.

---

### Task 1: Add import tracking schema v13

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Test: `packages/core/test/opportunity-import.test.ts`

**Interfaces:**
- Consumes: Phase 3–4 opportunity/hackathon/application schema v12.
- Produces: package, entity-snapshot and conflict records.

- [ ] **Step 1: Write the failing migration test.**

Assert schema v13 and tables:

```text
opportunity_imports
opportunity_import_entities
opportunity_import_conflicts
```

- [ ] **Step 2: Set `SCHEMA_VERSION = 13` and add tables.**

```sql
CREATE TABLE opportunity_imports (
  package_id TEXT PRIMARY KEY,
  package_version INTEGER NOT NULL,
  logical_digest_sha256 TEXT NOT NULL CHECK(length(logical_digest_sha256)=64),
  distribution TEXT NOT NULL CHECK(distribution IN ('private_local','shareable')),
  generated_at TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  source_cutoff TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  source_count INTEGER NOT NULL CHECK(source_count >= 0),
  organization_count INTEGER NOT NULL CHECK(organization_count >= 0),
  opportunity_count INTEGER NOT NULL CHECK(opportunity_count >= 0),
  cycle_count INTEGER NOT NULL CHECK(cycle_count >= 0),
  status TEXT NOT NULL CHECK(status IN ('imported','partial','rejected'))
);

CREATE TABLE opportunity_import_entities (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('source','organization','opportunity','hackathon_cycle','track','sponsor','bounty','rule')),
  entity_id TEXT NOT NULL,
  package_id TEXT NOT NULL REFERENCES opportunity_imports(package_id) ON DELETE RESTRICT,
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  imported_at TEXT NOT NULL,
  PRIMARY KEY(entity_type,entity_id)
);

CREATE TABLE opportunity_import_conflicts (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  previous_value_json TEXT,
  current_value_json TEXT NOT NULL CHECK(json_valid(current_value_json)),
  incoming_value_json TEXT NOT NULL CHECK(json_valid(incoming_value_json)),
  status TEXT NOT NULL CHECK(status IN ('pending','keep_local','accept_incoming')),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  UNIQUE(package_id,entity_type,entity_id,field)
);
```

Add indexes on package/status and pending conflicts.

- [ ] **Step 3: Add package digest immutability trigger.**

Reject an update that changes `logical_digest_sha256` for an existing package ID.

- [ ] **Step 4: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- opportunity-import.test.ts -t "schema v13"
git add packages/core/src/migrations.ts packages/core/test/opportunity-import.test.ts
git commit -m "feat(core): track opportunity package imports"
```

---

### Task 2: Define the canonical package schema

**Files:**
- Create: `packages/core/src/opportunity-package.ts`
- Modify: `packages/core/src/index.ts`
- Create: `docs/opportunity-package-format.md`
- Test: `packages/core/test/opportunity-package.test.ts`

**Interfaces:**
- Produces:

```ts
export const OpportunityPackageSchema: z.ZodType<OpportunityPackage>;
export function opportunityPackageDigest(input: OpportunityPackageWithoutDigest): string;
export function verifyOpportunityPackage(input: unknown): OpportunityPackage;
```

- [ ] **Step 1: Write failing schema tests.**

Reject:

```text
unknown package format/version
invalid digest
reviewedAt before generatedAt
source cutoff after reviewedAt
duplicate IDs within one collection
missing referenced source/organization/opportunity/cycle
personal email or phone fields
non-null inferred dates without a supporting accepted source
shareable package containing prohibited or unknown redistribution source
private_local source containing an excerpt when redistribution is prohibited
```

- [ ] **Step 2: Define source records.**

Each source contains:

```ts
{
  id: string;
  canonicalUrl: string;
  title: string | null;
  publisher: string | null;
  sourceType: string;
  retrievedAt: string;
  publishedOn: string | null;
  rightsClass: string;
  redistributionStatus: 'allowed' | 'attribution_required' | 'unknown' | 'prohibited';
  attribution: string | null;
  excerpt: string | null;
}
```

For `private_local`, a prohibited source may retain URL/title/publisher/observation metadata but `excerpt` must be null.

- [ ] **Step 3: Define opportunity and hackathon records.**

Use the exact Phase 3 schemas plus external IDs. Each date-like field is nullable. Each scored recommendation includes component fit and canonical demo suggestion as public research fields, but does not create a founder go decision.

- [ ] **Step 4: Implement reference validation.**

After Zod parsing, verify every foreign reference resolves within the package or is explicitly marked `existingLocalId`.

- [ ] **Step 5: Implement digest verification.**

```ts
const { logicalDigestSha256, ...unsigned } = parsed;
const actual = createHash('sha256').update(stableJson(unsigned), 'utf8').digest('hex');
if (actual !== logicalDigestSha256) throw new Error('Opportunity package digest mismatch');
```

- [ ] **Step 6: Write format documentation.**

Document null-date policy, rights policy, IDs, reference rules, digest construction, private/public boundaries and re-import conflict behavior.

- [ ] **Step 7: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- opportunity-package.test.ts
git add packages/core/src/opportunity-package.ts packages/core/src/index.ts packages/core/test/opportunity-package.test.ts docs/opportunity-package-format.md
git commit -m "feat(core): define opportunity package format"
```

---

### Task 3: Build the package producer script

**Files:**
- Create: `scripts/build-opportunity-package.mjs`
- Create: `scripts/fixtures/opportunity-atlas-input.example.json`
- Modify: `package.json`
- Test: `scripts/self-test.mjs`

**Interfaces:**
- Consumes: normalized reviewed JSON exported by the research workbook process.
- Produces: canonical package JSON with calculated digest.

- [ ] **Step 1: Add an npm script.**

```json
"opportunity:package": "node scripts/build-opportunity-package.mjs"
```

- [ ] **Step 2: Implement strict CLI arguments.**

```bash
pnpm opportunity:package -- \
  --input /absolute/path/reviewed-atlas.json \
  --output /absolute/path/atlas-package.json \
  --package-id atlas:2026-08-15:v1.1 \
  --reviewed-by founder \
  --distribution private_local
```

Reject relative output traversal, missing files, unknown flags and output equal to input.

- [ ] **Step 3: Validate before writing.**

Construct the unsigned package, validate references and rights, calculate digest, parse the completed package again, then write atomically using a temporary file plus rename.

- [ ] **Step 4: Add a deterministic test to `scripts/self-test.mjs`.**

Build twice from the fixture and assert byte-identical output after fixing generated/reviewed timestamps through explicit CLI inputs.

- [ ] **Step 5: Run tests and commit.**

```bash
node scripts/self-test.mjs
pnpm opportunity:package -- --input scripts/fixtures/opportunity-atlas-input.example.json --output /tmp/opportunity-package.json --package-id fixture:v1 --reviewed-by test --distribution private_local --generated-at 2026-08-15T00:00:00Z --reviewed-at 2026-08-15T00:10:00Z --source-cutoff 2026-08-14T23:59:59Z
git add scripts/build-opportunity-package.mjs scripts/fixtures/opportunity-atlas-input.example.json scripts/self-test.mjs package.json
git commit -m "feat: build deterministic opportunity packages"
```

---

### Task 4: Implement preview and conflict-safe import

**Files:**
- Create: `packages/core/src/opportunity-import.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/opportunity-import.test.ts`

**Interfaces:**
- Produces:

```ts
export interface OpportunityImportPreview {
  packageId: string;
  digest: string;
  additions: ImportChange[];
  updates: ImportChange[];
  conflicts: ImportConflictPreview[];
  noops: ImportChange[];
  rejected: ImportRejection[];
}

export function previewOpportunityImport(vault: CoreVault, packageBytes: Uint8Array): OpportunityImportPreview;
export function applyOpportunityImport(vault: CoreVault, packageBytes: Uint8Array, importedAt: string): OpportunityImportResult;
export function resolveOpportunityImportConflict(vault: CoreVault, input: ConflictResolutionInput): void;
```

- [ ] **Step 1: Write the failing import tests.**

Cases:

```text
first import adds records
same package/digest is no-op
same package ID/different digest rejected
new package updates unchanged Atlas-owned fields
founder-modified field creates conflict
accept_incoming applies one field and updates import snapshot
keep_local retains local value and marks conflict resolved
invalid package leaves database unchanged
100+ hackathon cycles import inside one transaction
```

- [ ] **Step 2: Define importable field maps.**

Use explicit allowlists per entity type. Never copy arbitrary package keys into SQL.

- [ ] **Step 3: Implement local-edit conflict detection.**

For each entity:

```text
previous = opportunity_import_entities.payload_json
current = serialize current database importable fields
incoming = package record

if current == previous:
  apply incoming changes
else:
  create field-level conflicts where current differs from previous and incoming differs from current
  apply only non-conflicting incoming fields
```

- [ ] **Step 4: Preserve founder state.**

Import may update public opportunity facts. It must never alter:

```text
founder decision
entry state
application stage
private notes
next action
build records
submission assets
receipts
results
conversions
contacts
meetings
tasks
```

- [ ] **Step 5: Use one transaction.**

Apply sources, organizations, opportunities, cycles, tracks, sponsors, bounties and rules in dependency order inside `BEGIN IMMEDIATE`. Roll back on any error.

- [ ] **Step 6: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- opportunity-import.test.ts
git add packages/core/src/opportunity-import.ts packages/core/src/index.ts packages/core/test/opportunity-import.test.ts
git commit -m "feat(core): import opportunity packages safely"
```

---

### Task 5: Add desktop preview/import commands

**Files:**
- Modify: `apps/desktop/src/shared/contracts.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Test: `apps/desktop/test/integration/opportunity-import.test.ts`

**Interfaces:**
- Produces commands:

```ts
'opportunityPackage.preview': { path: string };
'opportunityPackage.import': { path: string; expectedDigest: string };
'opportunityPackage.conflict.resolve': {
  conflictId: string;
  decision: 'keep_local' | 'accept_incoming';
};
```

- [ ] **Step 1: Add result types.**

Expose counts and human-readable changes, but never return raw private vault state.

- [ ] **Step 2: Validate file path and size.**

Use the main process. Require a regular file, bounded at 64 MiB, read once after stat, and reject symlinks or path changes between stat/read according to existing bounded-file patterns.

- [ ] **Step 3: Bind import to preview digest.**

`opportunityPackage.import` recalculates digest and rejects when it differs from `expectedDigest` shown to the founder.

- [ ] **Step 4: Persist and refresh bootstrap.**

- [ ] **Step 5: Run tests and commit.**

```bash
pnpm --filter @outreachr/desktop test:integration -- opportunity-import.test.ts
git add apps/desktop/src/shared/contracts.ts apps/desktop/src/main/command-service.ts apps/desktop/src/main/vault-service.ts apps/desktop/test/integration/opportunity-import.test.ts
git commit -m "feat(desktop): preview and import Atlas packages"
```

---

### Task 6: Build the founder import and conflict UI

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/OpportunityImportPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/opportunities/ImportPreview.tsx`
- Create: `apps/desktop/src/renderer/src/components/opportunities/ImportConflictReview.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/OpportunitiesPage.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/HackathonStudioPage.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Test: `apps/desktop/test/renderer/opportunity-import.test.tsx`

**Interfaces:**
- Consumes preview/import/conflict commands.
- Produces exact founder review before local mutation.

- [ ] **Step 1: Add `Import Atlas package` actions.**

Available from both Opportunities and Hackathon Studio. Use the existing file picker through the preload bridge.

- [ ] **Step 2: Implement preview.**

Show:

```text
package ID and digest
reviewer and source cutoff
records by type
additions
updates
conflicts
no-ops
rejections
rights warnings
```

The primary button reads `Import reviewed package`, not `Sync`.

- [ ] **Step 3: Implement exact confirmation.**

Freeze path, package ID and digest in the confirmation dialog. Import command carries the displayed digest.

- [ ] **Step 4: Implement conflict review.**

For every conflict show previous import, current local and incoming values with source links. Founder chooses `Keep local` or `Accept incoming` one field at a time.

- [ ] **Step 5: Update `WorkspaceContext`.**

Refresh on `opportunityPackage.` commands.

- [ ] **Step 6: Run renderer tests and commit.**

```bash
pnpm --filter @outreachr/desktop test -- opportunity-import.test.tsx
git add apps/desktop/src/renderer apps/desktop/test/renderer/opportunity-import.test.tsx
git commit -m "feat(ui): review Atlas imports and conflicts"
```

---

### Task 7: Add a large fixture and E2E import scenario

**Files:**
- Create: `apps/desktop/test/fixtures/opportunity-package-100-hackathons.json`
- Create: `apps/desktop/e2e/opportunity-import.spec.ts`
- Test: core, renderer and Electron E2E

**Interfaces:**
- Consumes all Phase 5 work.
- Produces scale, idempotency and conflict qualification.

- [ ] **Step 1: Generate a deterministic fixture.**

The fixture contains:

```text
at least 100 hackathon opportunities/cycles
multiple online/in-person/hybrid formats
open, upcoming, rolling, closed recurring and watchlist states
null unknown dates
source records with allowed/attribution/unknown rights
tracks, sponsors, bounties and rules
no private contact data
```

- [ ] **Step 2: Write the E2E scenario.**

```text
preview package
verify counts and digest
import
search Hackathon Studio
locally edit one opportunity deadline note or public summary
preview a newer package
review field conflict
keep local
accept a different incoming field
re-import identical package and verify no-op
```

- [ ] **Step 3: Run full gates.**

```bash
pnpm --filter @outreachr/core test -- opportunity-import.test.ts
pnpm --filter @outreachr/desktop test -- opportunity-import.test.tsx
pnpm --filter @outreachr/desktop test:e2e:headed -- opportunity-import.spec.ts
pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add apps/desktop/test/fixtures/opportunity-package-100-hackathons.json apps/desktop/e2e/opportunity-import.spec.ts
git commit -m "test(e2e): qualify large Atlas imports"
```

---

### Task 8: Protect backup and contribution boundaries

**Files:**
- Modify: `packages/core/src/contribution.ts`
- Modify: `packages/core/test/core.test.ts`
- Modify: `apps/desktop/test/integration/vault-service.test.ts`

**Interfaces:**
- Consumes import tracking and conflicts.
- Produces verified local-only import history.

- [ ] **Step 1: Exclude all import tables from contribution exports.**

The existing contribution exporter remains investor-public-data only.

- [ ] **Step 2: Add backup/restore coverage.**

Backup after import and conflict resolution, restore, then verify package digest, entity snapshots, conflict decisions and imported records.

- [ ] **Step 3: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
git add packages/core apps/desktop/test/integration/vault-service.test.ts
git commit -m "test: protect Atlas import history"
```

---

## Phase 5 Verification Gate

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
```

Expected: PASS.

## Phase 5 Definition of Done

- Reviewed Atlas research exports into one canonical, deterministic JSON package.
- Package digest, IDs, sources, rights and references are validated before preview.
- Import is transactional and idempotent.
- A package ID cannot silently change digest.
- Founder-modified fields create explicit conflicts rather than being overwritten.
- More than 100 hackathons import and remain searchable.
- Unknown dates and unannounced recurrence remain honest.
- Import never changes founder decisions, private notes, builds, submissions or relationships.
- Import history and conflicts survive backup/restore and stay out of public contributions.
