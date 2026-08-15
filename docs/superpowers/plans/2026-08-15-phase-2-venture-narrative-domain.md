# Phase 2: Venture, Narrative, Demo, and Capital Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit legal entities, ventures, immutable narrative versions, canonical demo versions, and capital mandates without breaking the existing investor workflow.

**Architecture:** Add migration v10 and new focused core repositories instead of enlarging `OutreachrRepository` and `VaultService` indiscriminately. Existing `rounds` remain the operational container for an investor raise; each round resolves through exactly one `capital_mandate`, which binds a legal entity, venture, and approved investor narrative.

**Tech Stack:** SQL.js SQLite, Zod 4, TypeScript, Node crypto SHA-256, Electron command service, React, Vitest, Testing Library.

## Global Constraints

- A legal entity, venture, narrative profile, canonical demo, and capital mandate are different records.
- A product narrative does not imply a separate legal entity.
- One fundraising round resolves through exactly one capital mandate.
- An investor target continues to link to a round; its mandate is resolved through the round’s unique mandate.
- Approved narrative and demo content is immutable; revisions create a new version.
- Submitted history will later reference exact narrative and demo version IDs.
- Existing v9 vaults migrate without losing founder, round, target, contact, draft, meeting, task, audit, or connector state.
- Agents do not gain new external actions in this phase.
- RNDRNTWRK public product taxonomy may be committed; private company, cap-table, or application data may not.

---

## File Structure

Create focused units:

```text
packages/core/src/venture-validation.ts
  Zod schemas and input/output types for authority records.

packages/core/src/venture-repository.ts
  SQL persistence, backfill, invariants, versioning and audit-friendly results.

apps/desktop/src/main/venture-service.ts
  Founder commands and read models. No UI or connector logic.

apps/desktop/src/renderer/src/pages/VenturesPage.tsx
  Legal entity, venture and capital mandate overview.

apps/desktop/src/renderer/src/pages/NarrativesPage.tsx
  Narrative and canonical-demo version review and approval.

resources/rndrntwrk/canonical-demos.json
  Public, deterministic seed for the eleven approved demo families.
```

Do not place new venture SQL directly into `apps/desktop/src/main/vault-service.ts` beyond orchestration and bootstrap mapping.

---

### Task 1: Add migration v10 authority tables

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Test: `packages/core/test/core.test.ts`

**Interfaces:**
- Consumes: current schema v9.
- Produces: schema v10 tables and database-level constraints used by `VentureRepository`.

- [ ] **Step 1: Write a failing migration test.**

Add to `packages/core/test/core.test.ts`:

```ts
it('migrates a v9 vault to venture authority schema v10', async () => {
  const vault = await openNodeVault({ bytes: v9FixtureBytes });
  expect(currentSchemaVersion(vault.sqlite)).toBe(10);
  for (const table of [
    'legal_entities',
    'ventures',
    'narrative_profiles',
    'canonical_demos',
    'canonical_demo_versions',
    'venture_demos',
    'capital_mandates',
  ]) {
    expect(vault.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", [table]))
      .toBe(1);
  }
});
```

Use the repository’s actual fixture helper for opening a v9 database; do not fabricate a second migration runner.

- [ ] **Step 2: Run the targeted test.**

```bash
pnpm --filter @outreachr/core test -- core.test.ts -t "venture authority schema v10"
```

Expected: FAIL because schema version remains 9 and the tables do not exist.

- [ ] **Step 3: Set `SCHEMA_VERSION = 10`.**

- [ ] **Step 4: Append migration v10.**

Use this SQL shape:

```sql
CREATE TABLE legal_entities (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  jurisdiction TEXT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('corporation','llc','foundation','sole_proprietorship','partnership','other')),
  status TEXT NOT NULL CHECK(status IN ('planned','active','inactive','dissolved')),
  incorporation_reference TEXT,
  cap_table_reference TEXT,
  founder_authority TEXT NOT NULL,
  public_website TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ventures (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  utility TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('concept','prototype','pre_production','production','scaling')),
  status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
  public_url TEXT,
  default_narrative_profile_id TEXT,
  current_demo_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(legal_entity_id,name)
);

CREATE TABLE narrative_profiles (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('investor','accelerator','grant','hackathon','sponsor','partner','media')),
  version INTEGER NOT NULL CHECK(version >= 1),
  description_50 TEXT NOT NULL,
  description_100 TEXT NOT NULL,
  description_250 TEXT NOT NULL,
  problem TEXT NOT NULL,
  product_wedge TEXT NOT NULL,
  why_now TEXT NOT NULL,
  technical_differentiation TEXT NOT NULL,
  evidence_framing TEXT NOT NULL,
  business_model TEXT NOT NULL,
  use_of_funds TEXT NOT NULL,
  claims_boundary TEXT NOT NULL,
  deck_reference TEXT,
  demo_reference TEXT,
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64),
  approval_state TEXT NOT NULL CHECK(approval_state IN ('draft','approved','superseded')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(venture_id,purpose,version),
  CHECK((approval_state='draft' AND approved_at IS NULL) OR (approval_state!='draft' AND approved_at IS NOT NULL))
);

CREATE TABLE canonical_demos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE canonical_demo_versions (
  id TEXT PRIMARY KEY,
  demo_id TEXT NOT NULL REFERENCES canonical_demos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  baseline_repository TEXT NOT NULL,
  baseline_commit_sha TEXT NOT NULL CHECK(length(baseline_commit_sha)=40),
  branch_convention TEXT NOT NULL,
  expected_baseline_hours INTEGER NOT NULL CHECK(expected_baseline_hours BETWEEN 1 AND 1000),
  core_assets_json TEXT NOT NULL CHECK(json_valid(core_assets_json) AND json_type(core_assets_json)='array'),
  evidence_requirements_json TEXT NOT NULL CHECK(json_valid(evidence_requirements_json) AND json_type(evidence_requirements_json)='array'),
  approved_claims_json TEXT NOT NULL CHECK(json_valid(approved_claims_json) AND json_type(approved_claims_json)='array'),
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64),
  approval_state TEXT NOT NULL CHECK(approval_state IN ('draft','approved','superseded')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(demo_id,version)
);

CREATE TABLE venture_demos (
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  demo_id TEXT NOT NULL REFERENCES canonical_demos(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY(venture_id,demo_id)
);

CREATE TABLE capital_mandates (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL UNIQUE REFERENCES rounds(id) ON DELETE CASCADE,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  stage TEXT NOT NULL CHECK(stage IN ('pre_seed','seed','series_a')),
  target_amount_usd INTEGER NOT NULL CHECK(target_amount_usd >= 0),
  minimum_check_usd INTEGER CHECK(minimum_check_usd IS NULL OR minimum_check_usd >= 0),
  maximum_check_usd INTEGER CHECK(maximum_check_usd IS NULL OR maximum_check_usd >= 0),
  instrument TEXT NOT NULL,
  token_side_letter_policy TEXT NOT NULL,
  geographies_json TEXT NOT NULL CHECK(json_valid(geographies_json) AND json_type(geographies_json)='array'),
  target_close_date TEXT,
  status TEXT NOT NULL CHECK(status IN ('planning','active','paused','closed')),
  approved_use_of_funds TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(minimum_check_usd IS NULL OR maximum_check_usd IS NULL OR minimum_check_usd <= maximum_check_usd)
);
```

Add indexes on `ventures(legal_entity_id,status)`, `narrative_profiles(venture_id,purpose,approval_state)`, `canonical_demo_versions(demo_id,approval_state)`, and `capital_mandates(status,target_close_date)`.

- [ ] **Step 5: Add immutable-content triggers.**

For approved or superseded narratives and demo versions, reject content-column updates and deletion:

```sql
CREATE TRIGGER approved_narrative_content_is_immutable
BEFORE UPDATE OF description_50,description_100,description_250,problem,product_wedge,why_now,
  technical_differentiation,evidence_framing,business_model,use_of_funds,claims_boundary,
  deck_reference,demo_reference,content_sha256,venture_id,legal_entity_id,purpose,version
ON narrative_profiles
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved narrative versions are immutable');
END;
```

Create equivalent update and delete triggers for narrative profiles and canonical demo versions.

- [ ] **Step 6: Add cross-authority triggers.**

Before inserting/updating `capital_mandates`, require:

```text
venture.legal_entity_id = capital_mandate.legal_entity_id
narrative.venture_id = capital_mandate.venture_id
narrative.legal_entity_id = capital_mandate.legal_entity_id
narrative.purpose = investor
narrative.approval_state = approved
capital_mandate.stage = rounds.stage
```

- [ ] **Step 7: Run the migration test.**

```bash
pnpm --filter @outreachr/core test -- core.test.ts -t "venture authority schema v10"
```

Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add packages/core/src/migrations.ts packages/core/test/core.test.ts
git commit -m "feat(core): add venture authority schema"
```

---

### Task 2: Add Zod schemas and typed content digests

**Files:**
- Create: `packages/core/src/venture-validation.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/venture-validation.test.ts`

**Interfaces:**
- Consumes: migration v10 column and enum names.
- Produces: `LegalEntitySchema`, `VentureSchema`, `NarrativeProfileSchema`, `CanonicalDemoSchema`, `CanonicalDemoVersionSchema`, and `CapitalMandateSchema`.

- [ ] **Step 1: Write the failing validation tests.**

Test these cases:

```ts
expect(NarrativeProfileSchema.safeParse(validNarrative).success).toBe(true);
expect(NarrativeProfileSchema.safeParse({ ...validNarrative, contentSha256: 'short' }).success).toBe(false);
expect(CapitalMandateSchema.safeParse({ ...validMandate, minimumCheckUsd: 500000, maximumCheckUsd: 100000 }).success).toBe(false);
expect(CanonicalDemoVersionSchema.safeParse({ ...validDemo, baselineCommitSha: 'not-a-sha' }).success).toBe(false);
```

- [ ] **Step 2: Run tests.**

```bash
pnpm --filter @outreachr/core test -- venture-validation.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the schemas.**

Export input and output types for each schema. Reuse `IdSchema`, `IsoDateTimeSchema`, and `UrlSchema` from `validation.ts`.

Define:

```ts
export const NarrativePurposeSchema = z.enum([
  'investor',
  'accelerator',
  'grant',
  'hackathon',
  'sponsor',
  'partner',
  'media',
]);

export const ApprovalStateSchema = z.enum(['draft', 'approved', 'superseded']);
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const GitCommitShaSchema = z.string().regex(/^[a-f0-9]{40}$/u);
```

- [ ] **Step 4: Add deterministic digest helpers.**

```ts
export function narrativeDigest(input: NarrativeContent): string {
  return createHash('sha256').update(stableJson(input), 'utf8').digest('hex');
}

export function canonicalDemoDigest(input: CanonicalDemoContent): string {
  return createHash('sha256').update(stableJson(input), 'utf8').digest('hex');
}
```

`NarrativeContent` and `CanonicalDemoContent` must list the exact immutable fields; do not hash approval timestamps or database IDs.

- [ ] **Step 5: Export the module from `packages/core/src/index.ts`.**
- [ ] **Step 6: Run tests.**

```bash
pnpm --filter @outreachr/core test -- venture-validation.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add packages/core/src/venture-validation.ts packages/core/src/index.ts packages/core/test/venture-validation.test.ts
git commit -m "feat(core): validate venture authority records"
```

---

### Task 3: Implement a focused VentureRepository and legacy backfill

**Files:**
- Create: `packages/core/src/venture-repository.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/venture-repository.test.ts`

**Interfaces:**
- Consumes: `CoreVault` and schemas from Task 2.
- Produces:

```ts
export class VentureRepository {
  constructor(vault: CoreVault);
  backfillLegacyAuthority(now: string): LegacyAuthorityResult;
  listLegalEntities(): LegalEntity[];
  upsertLegalEntity(input: LegalEntityInput): LegalEntity;
  listVentures(): Venture[];
  upsertVenture(input: VentureInput): Venture;
  createNarrativeVersion(input: NarrativeVersionInput): NarrativeProfile;
  approveNarrativeVersion(id: string, founderId: string, approvedAt: string): NarrativeProfile;
  listNarrativeProfiles(ventureId?: string): NarrativeProfile[];
  createCanonicalDemoVersion(input: CanonicalDemoVersionInput): CanonicalDemoVersion;
  approveCanonicalDemoVersion(id: string, founderId: string, approvedAt: string): CanonicalDemoVersion;
  listCanonicalDemos(): CanonicalDemoWithVersions[];
  linkVentureDemo(ventureId: string, demoId: string, primary: boolean, createdAt: string): void;
  upsertCapitalMandate(input: CapitalMandateInput): CapitalMandate;
  listCapitalMandates(): CapitalMandate[];
  getMandateForRound(roundId: string): CapitalMandate | null;
}
```

- [ ] **Step 1: Write the failing backfill test.**

Create a v9-style founder and round, migrate to v10, call `backfillLegacyAuthority(now)`, then assert:

```ts
expect(result.createdLegalEntityId).toBe('legal-entity:founder');
expect(result.createdVentureId).toBe('venture:legacy-default');
expect(result.createdMandateIds).toEqual([`capital-mandate:${roundId}`]);
expect(repository.getMandateForRound(roundId)?.narrativeProfileId).toBeTruthy();
```

Call it twice and assert the second result reports zero creations.

- [ ] **Step 2: Run the test.**

```bash
pnpm --filter @outreachr/core test -- venture-repository.test.ts
```

Expected: FAIL because `VentureRepository` does not exist.

- [ ] **Step 3: Implement `backfillLegacyAuthority`.**

Inside one SQLite savepoint:

```text
1. Read founder profile.
2. Insert one default legal entity when none exists.
3. Insert one legacy venture for the founder company when none exists.
4. For each round without a mandate, create a draft investor narrative from round thesis and company identity.
5. Calculate the real SHA-256 digest in Node.
6. Approve the migrated narrative as founder-approved at the migration/backfill timestamp.
7. Create one mandate per round.
8. Set venture.default_narrative_profile_id.
9. Append one audit event per created authority group.
```

Use `INSERT ... ON CONFLICT DO NOTHING` plus explicit readback; do not depend on exception text for idempotency.

- [ ] **Step 4: Implement narrative versioning.**

`createNarrativeVersion` must calculate `version = MAX(version)+1` within a savepoint and store a digest generated from immutable content.

`approveNarrativeVersion` must:

```text
validate current state is draft
recalculate and compare digest
supersede the previously approved version for the same venture and purpose
approve the selected version
update ventures.default_narrative_profile_id when purpose=investor and no default exists
append an audit event
```

- [ ] **Step 5: Implement demo versioning and capital mandates.**

Apply the same draft→approved→superseded model to demo versions. `upsertCapitalMandate` must pre-read and validate legal entity/venture/narrative consistency before SQL triggers repeat the check.

- [ ] **Step 6: Run tests.**

```bash
pnpm --filter @outreachr/core test -- venture-repository.test.ts
```

Expected: PASS.

- [ ] **Step 7: Export the repository from `index.ts` and commit.**

```bash
git add packages/core/src/venture-repository.ts packages/core/src/index.ts packages/core/test/venture-repository.test.ts
git commit -m "feat(core): persist venture authority"
```

---

### Task 4: Seed the eleven public canonical demo families

**Files:**
- Create: `resources/rndrntwrk/canonical-demos.json`
- Create: `packages/core/src/canonical-demo-seed.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/canonical-demo-seed.test.ts`

**Interfaces:**
- Consumes: `VentureRepository.createCanonicalDemoVersion`.
- Produces: deterministic public demo-family seed records with no private implementation secrets.

- [ ] **Step 1: Create the seed JSON.**

Include these exact IDs and names:

```text
d1-sw4p-programmable-settlement
d2-gas-abstracted-creator-payouts
d3-alice-governed-mcp-operator
d4-white-label-community-agent
d5-human-agent-live-studio
d6-rndrntwrk-coordination-layer
d7-555-arcade-agent-native-play
d8-sw4p-earn-composable-crypto-economies
d9-rndrntwrk-ctrl
d10-cross-community-composable-economy
d11-rndrntwrk-ads-programmable-sponsor-experiences
```

Each record must include category, branch convention, baseline repository, expected hours, core assets, evidence requirements and approved public claims. Use the current main SHA only when a real baseline repository exists; otherwise use a dedicated 40-zero sentinel plus status `draft`, and prohibit approval until a real commit SHA replaces it.

- [ ] **Step 2: Write a failing seed validation test.**

Assert:

```ts
expect(seed).toHaveLength(11);
expect(new Set(seed.map((item) => item.id)).size).toBe(11);
expect(seed.every((item) => item.approvedClaims.length > 0)).toBe(true);
expect(seed.filter((item) => item.status === 'approved').every((item) => !/^0{40}$/u.test(item.baselineCommitSha))).toBe(true);
```

- [ ] **Step 3: Implement `importCanonicalDemoSeed`.**

The function must validate every item, calculate the logical digest, insert idempotently and reject a reused package ID with a different digest.

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/core test -- canonical-demo-seed.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add resources/rndrntwrk/canonical-demos.json packages/core/src/canonical-demo-seed.ts packages/core/src/index.ts packages/core/test/canonical-demo-seed.test.ts
git commit -m "feat(core): seed canonical RNDRNTWRK demos"
```

---

### Task 5: Add shared desktop contracts and commands

**Files:**
- Modify: `apps/desktop/src/shared/contracts.ts`
- Test: `apps/desktop/test/unit/command-contracts.test.ts`

**Interfaces:**
- Consumes: core output types from Tasks 2–4.
- Produces frontend-safe summaries and command payloads.

- [ ] **Step 1: Add summary interfaces.**

Define:

```ts
export interface LegalEntitySummary {
  id: string;
  legalName: string;
  displayName: string;
  jurisdiction: string | null;
  entityType: 'corporation' | 'llc' | 'foundation' | 'sole_proprietorship' | 'partnership' | 'other';
  status: 'planned' | 'active' | 'inactive' | 'dissolved';
  publicWebsite: string | null;
}

export interface VentureSummary {
  id: string;
  legalEntityId: string;
  name: string;
  category: string;
  utility: string;
  stage: 'concept' | 'prototype' | 'pre_production' | 'production' | 'scaling';
  status: 'active' | 'paused' | 'archived';
  defaultNarrativeProfileId: string | null;
  currentDemoVersionId: string | null;
}

export interface NarrativeProfileSummary {
  id: string;
  legalEntityId: string;
  ventureId: string;
  purpose: NarrativePurpose;
  version: number;
  approvalState: 'draft' | 'approved' | 'superseded';
  contentSha256: string;
  approvedAt: string | null;
  descriptions: { words50: string; words100: string; words250: string };
  problem: string;
  productWedge: string;
  whyNow: string;
  technicalDifferentiation: string;
  evidenceFraming: string;
  businessModel: string;
  useOfFunds: string;
  claimsBoundary: string;
  deckReference: string | null;
  demoReference: string | null;
}
```

Add `CanonicalDemoSummary`, `CanonicalDemoVersionSummary`, and `CapitalMandateSummary` with the exact schema enums.

- [ ] **Step 2: Extend `AppBootstrap`.**

Add:

```ts
legalEntities: LegalEntitySummary[];
ventures: VentureSummary[];
narrativeProfiles: NarrativeProfileSummary[];
canonicalDemos: CanonicalDemoSummary[];
capitalMandates: CapitalMandateSummary[];
activeCapitalMandateId: string | null;
```

- [ ] **Step 3: Extend `CommandMap`.**

Add:

```ts
'legalEntity.save': LegalEntitySaveInput;
'venture.save': VentureSaveInput;
'narrative.createVersion': NarrativeVersionCreateInput;
'narrative.approve': { id: string; expectedContentSha256: string };
'canonicalDemo.importDefaults': { packageDigest: string };
'canonicalDemo.createVersion': CanonicalDemoVersionCreateInput;
'canonicalDemo.approve': { id: string; expectedContentSha256: string };
'capitalMandate.save': CapitalMandateSaveInput;
```

Define matching `CommandResultMap` entries. Approval results return the approved record, not the whole bootstrap.

- [ ] **Step 4: Write contract tests.**

Use `satisfies CommandMap['narrative.createVersion']` fixtures and ensure invalid enums fail compile-time or Zod command validation in the next task.

- [ ] **Step 5: Run typecheck.**

```bash
pnpm --filter @outreachr/desktop typecheck
```

Expected: FAIL until command service and bootstrap are updated; commit only after Tasks 6–7 restore the build.

---

### Task 6: Add VentureService and command validation

**Files:**
- Create: `apps/desktop/src/main/venture-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Test: `apps/desktop/test/integration/venture-service.test.ts`

**Interfaces:**
- Consumes: `VentureRepository` and command types.
- Produces:

```ts
export class VentureService {
  bootstrap(): VentureBootstrap;
  saveLegalEntity(input: LegalEntitySaveInput): Promise<LegalEntitySummary>;
  saveVenture(input: VentureSaveInput): Promise<VentureSummary>;
  createNarrativeVersion(input: NarrativeVersionCreateInput): Promise<NarrativeProfileSummary>;
  approveNarrative(id: string, expectedDigest: string): Promise<NarrativeProfileSummary>;
  importCanonicalDefaults(expectedPackageDigest: string): Promise<CanonicalDemoSummary[]>;
  createCanonicalDemoVersion(input: CanonicalDemoVersionCreateInput): Promise<CanonicalDemoVersionSummary>;
  approveCanonicalDemo(id: string, expectedDigest: string): Promise<CanonicalDemoVersionSummary>;
  saveCapitalMandate(input: CapitalMandateSaveInput): Promise<CapitalMandateSummary>;
}
```

- [ ] **Step 1: Write a failing service test.**

Create a founder vault, call `bootstrap`, and assert the legacy authority backfill exists. Create a second narrative version, calculate its digest, approve it, and assert the previous version is superseded.

- [ ] **Step 2: Add Zod command schemas in `command-service.ts`.**

Reuse core schemas where possible. Add `expectedContentSha256` checks and reject an approval when the current digest differs.

- [ ] **Step 3: Implement `VentureService`.**

Every mutation must:

```text
validate input
call the focused repository
append or preserve repository audit events
persist the vault atomically
return a mapped summary
```

- [ ] **Step 4: Compose the service in `CommandService`.**

Add a constructor dependency and delegate the eight new commands. Do not put SQL in the command service.

- [ ] **Step 5: Extend `VaultService.bootstrap`.**

Call `backfillLegacyAuthority` during initialization after migration and audit-chain backfill. Add the venture bootstrap arrays and resolve `activeCapitalMandateId` from the current round.

- [ ] **Step 6: Run tests.**

```bash
pnpm --filter @outreachr/desktop test:integration -- venture-service.test.ts vault-service.test.ts
pnpm --filter @outreachr/desktop typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Tasks 5–6.**

```bash
git add apps/desktop/src/shared/contracts.ts apps/desktop/src/main/venture-service.ts apps/desktop/src/main/command-service.ts apps/desktop/src/main/vault-service.ts apps/desktop/test
git commit -m "feat(desktop): expose venture authority commands"
```

---

### Task 7: Build founder UI for ventures, narratives and mandates

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/VenturesPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/NarrativesPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/ventures/LegalEntityEditor.tsx`
- Create: `apps/desktop/src/renderer/src/components/ventures/VentureEditor.tsx`
- Create: `apps/desktop/src/renderer/src/components/ventures/CapitalMandateEditor.tsx`
- Create: `apps/desktop/src/renderer/src/components/ventures/NarrativeVersionEditor.tsx`
- Create: `apps/desktop/src/renderer/src/components/ventures/CanonicalDemoList.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/RoundOverviewPage.tsx`
- Test: `apps/desktop/test/renderer/ventures-page.test.tsx`
- Test: `apps/desktop/test/renderer/narratives-page.test.tsx`
- Test: `apps/desktop/test/renderer/app-smoke.test.tsx`

**Interfaces:**
- Consumes: Phase 2 bootstrap arrays and commands.
- Produces: founder-operated editing and exact approval of narratives/demos.

- [ ] **Step 1: Write the failing route and navigation test.**

Assert the app exposes:

```text
/ventures
/narratives
```

and sidebar items `Ventures` and `Narratives & demos`.

- [ ] **Step 2: Add routes and navigation.**

Place `Ventures` after `Round overview` and `Narratives & demos` in the workspace group. Use existing compact navigation styles.

- [ ] **Step 3: Implement `VenturesPage`.**

The page must show:

```text
active legal entity
ventures grouped by entity
active capital mandate
round linkage
stage and status
current investor narrative version
current canonical demo version
```

The founder can create or edit draft authority records. Changing legal entity on an active mandate requires an explicit confirmation dialog that names the consequence.

- [ ] **Step 4: Implement `NarrativesPage`.**

Show versions in descending order. Approved versions are read-only. A draft editor displays the calculated digest. Approval dialog freezes:

```text
legal entity
venture
purpose
version
descriptions
claims boundary
deck reference
demo reference
digest
```

The dialog calls `narrative.approve` with the displayed digest.

- [ ] **Step 5: Implement canonical demo review.**

Display public seed records and block approval of any demo version whose baseline SHA is the all-zero sentinel.

- [ ] **Step 6: Update `WorkspaceContext`.**

Refresh after command prefixes:

```ts
legalEntity.
venture.
narrative.
canonicalDemo.
capitalMandate.
```

- [ ] **Step 7: Update `RoundOverviewPage`.**

Replace ambiguous company-only summary with the resolved legal entity, venture, mandate, approved narrative version and target instrument.

- [ ] **Step 8: Run renderer tests.**

```bash
pnpm --filter @outreachr/desktop test -- ventures-page.test.tsx narratives-page.test.tsx app-smoke.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit.**

```bash
git add apps/desktop/src/renderer apps/desktop/test/renderer
git commit -m "feat(ui): manage ventures and narrative versions"
```

---

### Task 8: Protect backup, contribution and audit boundaries

**Files:**
- Modify: `packages/core/src/contribution.ts`
- Modify: `packages/core/test/core.test.ts`
- Modify: `apps/desktop/test/integration/vault-service.test.ts`
- Test: backup, restore, contribution and audit suites

**Interfaces:**
- Consumes: all new Phase 2 tables.
- Produces: verified private-data exclusion and migration-safe backup/restore.

- [ ] **Step 1: Write a failing contribution privacy test.**

Populate all Phase 2 tables, export a public contribution and assert the exported database has no tables named:

```text
legal_entities
ventures
narrative_profiles
canonical_demos
canonical_demo_versions
venture_demos
capital_mandates
```

The application code may be public; the founder’s local authority records are not part of investor research contributions.

- [ ] **Step 2: Verify the exporter remains allowlist-based.**

Do not add the new tables to the export schema. Add a test that enumerates private source table names and confirms absence.

- [ ] **Step 3: Add v9→v10 encrypted round-trip coverage.**

```text
open v9 fixture
migrate and backfill
create narrative v2
approve v2
create encrypted backup
restore
reopen
assert mandate and both narrative versions remain
assert audit chain verifies
```

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/core test
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/core/src/contribution.ts packages/core/test/core.test.ts apps/desktop/test/integration/vault-service.test.ts
git commit -m "test: preserve venture authority privacy"
```

---

## Phase 2 Verification Gate

Run:

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

Manual founder checks:

```text
[ ] legacy round resolves through a backfilled capital mandate
[ ] SW4P and RNDRNTWRK can exist as distinct ventures under an explicit legal entity
[ ] a product narrative does not imply a new company
[ ] approved narrative content cannot be edited
[ ] narrative v2 supersedes v1 without deleting history
[ ] demo version approval requires a real baseline SHA
[ ] capital mandate rejects a mismatched entity/venture/narrative
[ ] investor pipeline continues to work
[ ] contribution export excludes all authority tables
[ ] backup/restore preserves authority history and audit integrity
```

## Phase 2 Definition of Done

- Legal entities, ventures, narrative versions, demo versions and capital mandates are first-class records.
- Existing rounds and targets continue working through one unique mandate per round.
- Approved external stories and demo baselines are immutable and digest-bound.
- The eleven public canonical demo families are seeded deterministically.
- Founder UI supports review and approval without exposing private records publicly.
- Existing v9 vaults migrate and backfill idempotently.
- Backup, restore, audit and contribution privacy pass.
