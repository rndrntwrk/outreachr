# Phase 4: General Opportunity and Application Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the opportunity base beyond hackathons so one founder can run accelerators, grants, startup programs, cloud credits, sponsors, strategic partners and design-partner applications with exact narrative, answer, asset and receipt history.

**Architecture:** Add migration v12 with a generic application domain that reuses Phase 2 authority and Phase 3 organization/opportunity records. Keep investor pipeline stages, hackathon entry stages and application stages separate. Link generic tasks, meetings and notes to applications without forcing programs into investor targets.

**Tech Stack:** SQL.js SQLite, Zod 4, TypeScript, Electron services, React, Vitest, Testing Library, Playwright.

## Global Constraints

- An accelerator, grant or sponsor application is not an investor target unless a separate investor relationship exists.
- One application binds one legal entity, venture, approved narrative version and optional approved canonical demo version.
- Application answers and assets retain exact approved/submitted versions.
- No portal submission, document upload, term acceptance or signature is automated.
- Application stage transitions are separate from investor and hackathon states.
- Terms, deadlines, check sizes, credits and eligibility remain sourced facts with freshness and review state.
- Private answers, receipts, documents, notes and diligence are excluded from public contribution exports.
- A product may lead an application without becoming a separate legal entity.

---

## File Structure

```text
packages/core/src/application-validation.ts
  Applications, answers, assets, events, receipts, milestones and transition schemas.

packages/core/src/application-state.ts
  Pure transition and readiness rules.

packages/core/src/application-repository.ts
  Persistence and immutable submitted history.

apps/desktop/src/main/application-service.ts
  Founder commands and mapped read models.

apps/desktop/src/renderer/src/pages/OpportunitiesPage.tsx
  All non-hackathon opportunity portfolio views.

apps/desktop/src/renderer/src/pages/ApplicationDetailPage.tsx
  One application’s answers, assets, tasks, meetings, submission and decision.
```

---

### Task 1: Add application schema v12

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Test: `packages/core/test/application-domain.test.ts`

**Interfaces:**
- Consumes: Phase 2 authority and Phase 3 opportunities/organizations.
- Produces: application persistence with immutable submitted history.

- [ ] **Step 1: Write the failing migration test.**

Assert schema v12 and these tables:

```text
applications
application_answers
application_assets
application_events
application_receipts
program_milestones
application_contacts
```

- [ ] **Step 2: Set `SCHEMA_VERSION = 12` and add `applications`.**

```sql
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  canonical_demo_version_id TEXT REFERENCES canonical_demo_versions(id) ON DELETE RESTRICT,
  founder_decision TEXT NOT NULL CHECK(founder_decision IN ('pending','go','conditional_go','no_go')),
  priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 100),
  deadline TEXT,
  next_action TEXT,
  next_action_at TEXT,
  stage TEXT NOT NULL CHECK(stage IN ('discovered','qualified','registered','drafting','internal_review','submitted','interview','demo','selected','rejected','completed','withdrawn')),
  submitted_at TEXT,
  decision TEXT,
  decision_at TEXT,
  expected_value_type TEXT CHECK(expected_value_type IS NULL OR expected_value_type IN ('investment','grant','prize','credits','pilot','sponsorship','partnership','other')),
  expected_value_amount REAL CHECK(expected_value_amount IS NULL OR expected_value_amount >= 0),
  expected_value_asset TEXT,
  private_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(opportunity_id,legal_entity_id,venture_id,narrative_profile_id)
);
```

- [ ] **Step 3: Add versioned answers.**

```sql
CREATE TABLE application_answers (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version >= 1),
  response_text TEXT NOT NULL,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  evidence_references_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence_references_json) AND json_type(evidence_references_json)='array'),
  disclosure_policy TEXT NOT NULL CHECK(disclosure_policy IN ('internal','safe_for_application','interview_only','diligence_only')),
  state TEXT NOT NULL CHECK(state IN ('draft','approved','submitted','superseded')),
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64),
  approved_by TEXT,
  approved_at TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(application_id,question_key,version)
);
```

Add triggers preventing edits/deletes of approved, submitted or superseded answer content.

- [ ] **Step 4: Add assets, events and receipts.**

`application_assets` fields:

```text
application_id
kind: deck|demo_video|repository|architecture|budget|data_room|source_register|founder_video|screenshot|submission_export|receipt|other
reference
version
state: draft|ready|approved|submitted|superseded
content_sha256 nullable until approved
share_policy: internal|safe_for_application|interview_only|diligence_only
approved_at/submitted_at
```

`application_events` is append-only and records stage, answer, asset, meeting, submission and decision events with actor and canonical detail JSON.

`application_receipts` stores portal, receipt reference, submitted timestamp, narrative ID, demo version ID, answers snapshot digest, assets snapshot digest and overall submission digest.

- [ ] **Step 5: Add contacts and milestones.**

```sql
CREATE TABLE application_contacts (
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK(role IN ('program_contact','partner','judge','mentor','investor','sponsor','other')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(application_id,person_id,role)
);

CREATE TABLE program_milestones (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('planned','active','complete','missed','cancelled')),
  evidence_reference TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 6: Link tasks, meetings and notes.**

Add nullable `opportunity_id` and `application_id` foreign-key columns to `tasks`, `meetings` and `notes`. Preserve all old records with null values. Add indexes.

- [ ] **Step 7: Add authority triggers.**

Require:

```text
venture belongs to legal entity
narrative belongs to venture and legal entity
narrative purpose matches opportunity type:
  accelerator → accelerator
  grant → grant
  sponsor → sponsor
  strategic/design partner → partner
  cloud/startup program → accelerator or partner
narrative is approved before stage internal_review or later
canonical demo, when supplied, is approved
```

- [ ] **Step 8: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- application-domain.test.ts
git add packages/core/src/migrations.ts packages/core/test/application-domain.test.ts
git commit -m "feat(core): add generic application schema"
```

---

### Task 2: Add application validation and state rules

**Files:**
- Create: `packages/core/src/application-validation.ts`
- Create: `packages/core/src/application-state.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/application-validation.test.ts`
- Test: `packages/core/test/application-state.test.ts`

**Interfaces:**
- Produces `ApplicationSchema`, `ApplicationAnswerSchema`, `ApplicationAssetSchema`, `ApplicationReceiptSchema`, `ProgramMilestoneSchema`, `calculateApplicationReadiness` and `canTransitionApplication`.

- [ ] **Step 1: Write failing validation tests.**

Cover invalid stages, mismatched approval timestamps, malformed content digests, negative value amounts and response length limits.

- [ ] **Step 2: Implement answer digests.**

```ts
export function applicationAnswerDigest(input: {
  questionKey: string;
  questionText: string;
  responseText: string;
  narrativeProfileId: string;
  evidenceReferences: string[];
  disclosurePolicy: ApplicationDisclosurePolicy;
}): string;
```

Use `stableJson` and SHA-256.

- [ ] **Step 3: Implement the state map.**

Allowed core path:

```text
discovered → qualified → registered → drafting → internal_review → submitted
submitted → interview|demo|selected|rejected|withdrawn
interview|demo → selected|rejected|withdrawn
selected → completed|withdrawn
```

`no_go` may transition a pre-submission record to `withdrawn`. Reopening a submitted record requires a new application record, not a backward transition.

- [ ] **Step 4: Implement readiness.**

`internal_review` requires approved narrative and no draft answer marked required. `submitted` requires:

```text
founder decision go/conditional_go
approved narrative
all required answers approved
all required assets approved
known application URL or explicit manual-portal note
submission digest prepared
no expired deadline
```

- [ ] **Step 5: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- application-validation.test.ts application-state.test.ts
git add packages/core/src/application-validation.ts packages/core/src/application-state.ts packages/core/src/index.ts packages/core/test
git commit -m "feat(core): validate application lifecycle"
```

---

### Task 3: Implement ApplicationRepository

**Files:**
- Create: `packages/core/src/application-repository.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/application-repository.test.ts`

**Interfaces:**
- Produces:

```ts
export class ApplicationRepository {
  constructor(vault: CoreVault);
  createApplication(input: ApplicationCreateInput): Application;
  updateApplication(input: ApplicationUpdateInput): Application;
  decideApplication(input: ApplicationDecisionInput): Application;
  transitionApplication(input: ApplicationTransitionInput): Application;
  createAnswerVersion(input: ApplicationAnswerVersionInput): ApplicationAnswer;
  approveAnswer(id: string, expectedDigest: string, founderId: string, approvedAt: string): ApplicationAnswer;
  saveAsset(input: ApplicationAssetInput): ApplicationAsset;
  approveAsset(id: string, expectedDigest: string, founderId: string, approvedAt: string): ApplicationAsset;
  saveMilestone(input: ProgramMilestoneInput): ProgramMilestone;
  linkContact(input: ApplicationContactInput): void;
  saveReceipt(input: ApplicationReceiptInput): ApplicationReceipt;
  getApplication(id: string): ApplicationDetail | null;
  listApplications(filter?: ApplicationFilter): ApplicationSummary[];
}
```

- [ ] **Step 1: Write a failing repository test.**

Create one YZi application for SW4P and one creator grant application for 555stream. Assert each uses its own approved narrative and that answers cannot cross applications.

- [ ] **Step 2: Implement version creation and approval.**

Calculate answer version numbers inside a savepoint. Recalculate digest before approval. Supersede only the previously approved answer with the same `application_id` and `question_key`.

- [ ] **Step 3: Implement receipt snapshots.**

Before saving a receipt, compute:

```text
answers_snapshot_sha256 = SHA256(sorted approved answer IDs + digests)
assets_snapshot_sha256 = SHA256(sorted approved asset IDs + digests)
submission_sha256 = SHA256(application ID + narrative ID + demo ID + both snapshots + submittedAt)
```

Store the exact values. Mark included answers/assets `submitted` in the same transaction.

- [ ] **Step 4: Implement transition checks server-side.**

Call `calculateApplicationReadiness`; ignore caller-supplied readiness.

- [ ] **Step 5: Add append-only application events.**

Every decision, transition, approval, receipt and result adds an `application_events` row using canonical JSON.

- [ ] **Step 6: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- application-repository.test.ts
git add packages/core/src/application-repository.ts packages/core/src/index.ts packages/core/test/application-repository.test.ts
git commit -m "feat(core): persist opportunity applications"
```

---

### Task 4: Add desktop contracts and ApplicationService

**Files:**
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/application-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Test: `apps/desktop/test/integration/application-service.test.ts`

**Interfaces:**
- Produces `ApplicationSummary`, `ApplicationDetail`, `ApplicationPortfolioMetrics` and commands.

- [ ] **Step 1: Extend bootstrap.**

```ts
applications: ApplicationSummary[];
applicationPortfolio: {
  due72Hours: number;
  due14Days: number;
  drafting: number;
  internalReview: number;
  submitted: number;
  interviews: number;
  selected: number;
  blocked: number;
};
```

- [ ] **Step 2: Add commands.**

```ts
'application.create'
'application.update'
'application.decide'
'application.transition'
'application.answer.createVersion'
'application.answer.approve'
'application.asset.save'
'application.asset.approve'
'application.milestone.save'
'application.contact.link'
'application.receipt.save'
'application.get'
```

- [ ] **Step 3: Implement `ApplicationService`.**

Resolve the opportunity type and approved authority records before create/update. Persist after every mutation. Map private notes only to the local renderer; do not place them in public export paths.

- [ ] **Step 4: Generate application work items in `VaultService`.**

Add kinds:

```text
application_decision
application_answer
application_asset
application_review
application_submit
application_interview
application_milestone
application_follow_up
```

- [ ] **Step 5: Run integration tests and commit.**

```bash
pnpm --filter @outreachr/desktop test:integration -- application-service.test.ts vault-service.test.ts
pnpm --filter @outreachr/desktop typecheck
git add apps/desktop/src/shared/contracts.ts apps/desktop/src/main/application-service.ts apps/desktop/src/main/command-service.ts apps/desktop/src/main/vault-service.ts apps/desktop/test/integration
git commit -m "feat(desktop): expose application operations"
```

---

### Task 5: Build opportunities and application portfolio UI

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/OpportunitiesPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/ApplicationDetailPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/applications/ApplicationQueue.tsx`
- Create: `apps/desktop/src/renderer/src/components/applications/ApplicationAnswers.tsx`
- Create: `apps/desktop/src/renderer/src/components/applications/ApplicationAssets.tsx`
- Create: `apps/desktop/src/renderer/src/components/applications/ApplicationMilestones.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Test: `apps/desktop/test/renderer/application-flows.test.tsx`
- Test: `apps/desktop/test/renderer/app-smoke.test.tsx`

**Interfaces:**
- Consumes: Phase 4 bootstrap and commands.
- Produces founder review and manual-submission workflow.

- [ ] **Step 1: Add `/opportunities` and `/applications/:applicationId`.**

Sidebar label: `Opportunities`. Keep `Hackathon Studio` separate and more prominent.

- [ ] **Step 2: Implement portfolio views.**

Tabs:

```text
Accelerators
Grants
Startup programs
Cloud credits
Sponsors
Strategic partners
Design partners
All applications
```

Each row shows venture, legal entity, narrative version, deadline, stage, expected value, next action, source freshness and blockers.

- [ ] **Step 3: Implement answer version editor.**

Founder sees question, draft versions, evidence links, disclosure policy, digest and approval state. Submitted answers are read-only.

- [ ] **Step 4: Implement asset references.**

Use existing document-reference patterns. Never upload a local file automatically. Approval dialog freezes reference, share policy, version and digest.

- [ ] **Step 5: Implement receipt capture.**

The founder submits externally, then records portal URL, timestamp and receipt reference. The app displays the frozen narrative/demo/answer/asset snapshot.

- [ ] **Step 6: Update `WorkspaceContext`.**

Refresh on `application.` commands.

- [ ] **Step 7: Run renderer tests and commit.**

```bash
pnpm --filter @outreachr/desktop test -- application-flows.test.tsx app-smoke.test.tsx
git add apps/desktop/src/renderer apps/desktop/test/renderer
git commit -m "feat(ui): manage accelerators grants and partners"
```

---

### Task 6: Link meetings, tasks and notes without breaking investor workflows

**Files:**
- Modify: `apps/desktop/src/shared/contracts.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Modify: `apps/desktop/src/renderer/src/pages/MeetingsPage.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/TasksPage.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/ApplicationDetailPage.tsx`
- Test: `apps/desktop/test/integration/vault-service.test.ts`
- Test: `apps/desktop/test/renderer/command-flows.test.tsx`

**Interfaces:**
- Consumes: nullable `opportunity_id` and `application_id` on shared work records.
- Produces unified founder work without conflating relationships.

- [ ] **Step 1: Extend `TaskItem` and `MeetingItem`.**

Add nullable `opportunityId` and `applicationId` while keeping `investorId` and `personId` behavior unchanged.

- [ ] **Step 2: Update create commands.**

Validate that linked application belongs to linked opportunity. A meeting may link people and an application without an investor target.

- [ ] **Step 3: Add application context to pages.**

Meetings and tasks show either investor, application, both, or neither using explicit labels.

- [ ] **Step 4: Run regression tests.**

```bash
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
pnpm --filter @outreachr/desktop test -- command-flows.test.tsx
```

Expected: existing investor task/meeting tests and new application links pass.

- [ ] **Step 5: Commit.**

```bash
git add apps/desktop/src/shared/contracts.ts apps/desktop/src/main/vault-service.ts apps/desktop/src/renderer/src/pages apps/desktop/test
git commit -m "feat: link founder work to applications"
```

---

### Task 7: Protect submission history, backup and contribution privacy

**Files:**
- Modify: `packages/core/src/contribution.ts`
- Create: `packages/core/test/application-backup.test.ts`
- Modify: `packages/core/test/core.test.ts`
- Modify: `apps/desktop/test/integration/vault-service.test.ts`

**Interfaces:**
- Consumes: all Phase 4 tables.
- Produces immutable submitted history and verified local privacy.

- [ ] **Step 1: Add contribution exclusion tests.**

Assert no Phase 4 table exists in investor contribution exports.

- [ ] **Step 2: Add backup/restore fixture.**

Include two applications, approved answers/assets, one receipt, interview meeting, milestone and decision. Restore and verify all digests and audit events.

- [ ] **Step 3: Attempt submitted-history mutation.**

Expected: SQL trigger rejects updates/deletes to submitted answer and asset content.

- [ ] **Step 4: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
git add packages/core apps/desktop/test/integration/vault-service.test.ts
git commit -m "test: protect application history and privacy"
```

---

### Task 8: Add a complete non-hackathon E2E flow

**Files:**
- Create: `apps/desktop/e2e/application-workspace.spec.ts`
- Test: Electron E2E

**Interfaces:**
- Consumes all Phase 4 UI and service work.
- Produces packaged-app qualification.

- [ ] **Step 1: Write the E2E scenario.**

```text
create YZi opportunity
create SW4P application with accelerator narrative
add and approve answers
add deck and demo references
move to internal review
record manual submission receipt
schedule interview and prepare agenda
record selected decision and milestone
create Circle grant application using a different narrative
verify both histories remain independent
```

- [ ] **Step 2: Run headed and full E2E.**

```bash
pnpm --filter @outreachr/desktop test:e2e:headed -- application-workspace.spec.ts
pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add apps/desktop/e2e/application-workspace.spec.ts
git commit -m "test(e2e): qualify founder application workspace"
```

---

## Phase 4 Verification Gate

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

## Phase 4 Definition of Done

- Accelerators, grants, startup programs, cloud credits, sponsors and partners are first-class opportunities.
- Applications use their own stage machine and do not masquerade as investor targets or hackathon entries.
- One legal entity, venture, approved narrative and optional demo version are frozen per submission.
- Answers, assets and receipts retain immutable approved/submitted versions.
- Meetings, tasks and notes can link to applications without breaking investor workflows.
- Portal submission, upload, terms and signatures remain manual founder actions.
- Backup, restore, audit and contribution privacy pass.
