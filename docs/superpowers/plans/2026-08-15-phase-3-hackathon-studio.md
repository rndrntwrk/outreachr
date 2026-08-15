# Phase 3: Founder-Operated Hackathon Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-class Hackathon Studio that lets one founder discover, qualify, scope, build, submit, publish, and convert many component-specific hackathon entries without reducing them to investor records.

**Architecture:** Introduce a generic organization/opportunity base and a hackathon-specific domain in migration v11. Keep scoring, eligibility evaluation, state transitions, build references, submission evidence, and distribution readiness in focused core modules. Outreachr stores source-control references and founder decisions; GitHub and RNDRNTWRK CTRL remain the source and execution authorities.

**Tech Stack:** SQL.js SQLite, Zod 4, TypeScript, React, Vitest, Testing Library, existing Electron command/bootstrap pattern.

## Global Constraints

- Hackathons are a primary product, engineering, marketing, distribution, capital, and relationship channel.
- One cycle may have several candidate entries using different ventures and canonical demos.
- Only a founder-approved entry may enter `scoped` or `building` state.
- Every active entry requires both a build plan and a distribution plan.
- An entry cannot reach `submission_ready` while a blocking rule is uncertain or rejected.
- An entry cannot reach `submission_ready` without required technical evidence and submission assets.
- The application never creates branches, worktrees, pull requests, portal submissions, social posts, or external messages in this phase; it stores approved commands and references.
- GitHub remains the authoritative code and CI record.
- Opportunity facts retain source URL, observation date, confidence, rights, freshness and review state.
- Scores are decision support, not autonomous approval.
- Multiple RNDRNTWRK components may enter the same event honestly through separate entries.
- Existing investor, communication, backup, audit and contribution privacy behavior must remain intact.

---

## File Structure

```text
packages/core/src/opportunity-validation.ts
  Generic organizations, opportunities and source-link schemas.

packages/core/src/opportunity-repository.ts
  Generic opportunity persistence and source review.

packages/core/src/hackathon-validation.ts
  Cycles, tracks, bounties, rules, entries, builds, assets, plans, submissions and results.

packages/core/src/hackathon-scoring.ts
  Pure weighted scoring and go/no-go policy.

packages/core/src/hackathon-eligibility.ts
  Pure rule evaluation with explicit uncertain state.

packages/core/src/hackathon-state.ts
  Pure allowed-transition and readiness functions.

packages/core/src/hackathon-repository.ts
  Persistence and transaction boundaries.

apps/desktop/src/main/opportunity-service.ts
  Generic opportunity reads and founder mutations.

apps/desktop/src/main/hackathon-service.ts
  Founder commands, readiness checks and mapped read models.

apps/desktop/src/renderer/src/pages/HackathonStudioPage.tsx
  Portfolio queue and cycle/entry search.

apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx
  One entry’s decision, build, submission, distribution and result workspace.
```

Do not add hackathon SQL to the existing investor repository or treat an organizer as an investor firm unless an explicit organization↔firm link exists.

---

### Task 1: Add generic organization and opportunity tables in migration v11

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Test: `packages/core/test/opportunity-domain.test.ts`

**Interfaces:**
- Consumes: schema v10 authority records.
- Produces: `organizations`, `opportunities`, and `opportunity_sources` for Hackathon Studio and later general applications.

- [ ] **Step 1: Write the failing migration test.**

```ts
it('creates generic opportunity tables in schema v11', async () => {
  const vault = await openNodeVault({ bytes: v10FixtureBytes });
  expect(currentSchemaVersion(vault.sqlite)).toBe(11);
  for (const table of ['organizations', 'opportunities', 'opportunity_sources']) {
    expect(Number(vault.scalar(
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
      [table],
    ))).toBe(1);
  }
});
```

- [ ] **Step 2: Run the test.**

```bash
pnpm --filter @outreachr/core test -- opportunity-domain.test.ts -t "generic opportunity tables"
```

Expected: FAIL.

- [ ] **Step 3: Set `SCHEMA_VERSION = 11` and append the base SQL.**

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('company','foundation','protocol','community','university','government','investor','other')),
  website TEXT,
  description TEXT,
  linked_firm_id TEXT REFERENCES firms(id) ON DELETE SET NULL,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK(is_public IN (0,1)),
  contribution_eligible INTEGER NOT NULL DEFAULT 0 CHECK(contribution_eligible IN (0,1)),
  origin TEXT NOT NULL CHECK(origin IN ('local','atlas','import','contribution')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(normalized_name,website)
);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  organizer_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  opportunity_type TEXT NOT NULL CHECK(opportunity_type IN ('investor','accelerator','grant','hackathon','startup_program','cloud_credits','strategic_partner','sponsor','design_partner')),
  status TEXT NOT NULL CHECK(status IN ('open','upcoming','rolling','closed_recurring','watchlist','cancelled')),
  public_url TEXT,
  application_url TEXT,
  open_date TEXT,
  deadline TEXT,
  start_date TEXT,
  end_date TEXT,
  format TEXT CHECK(format IS NULL OR format IN ('online','in_person','hybrid','unknown')),
  location TEXT,
  eligibility_summary TEXT,
  terms_summary TEXT,
  capital_prize_summary TEXT,
  freshness_state TEXT NOT NULL CHECK(freshness_state IN ('current','aging','stale','unknown')),
  review_state TEXT NOT NULL CHECK(review_state IN ('unreviewed','reviewed','conflicted','rejected')),
  imported_package_id TEXT,
  imported_package_digest TEXT CHECK(imported_package_digest IS NULL OR length(imported_package_digest)=64),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE opportunity_sources (
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_role TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('verified','supported','inferred','unknown','stale')),
  review_state TEXT NOT NULL CHECK(review_state IN ('pending','accepted','rejected')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(opportunity_id,source_id,source_role)
);
```

Add indexes on normalized organization names, opportunity type/status/deadline, organizer, freshness and review state.

- [ ] **Step 4: Add date consistency triggers.**

Reject:

```text
open_date after deadline
deadline after event end when both are known
start_date after end_date
```

Allow null dates rather than guessing.

- [ ] **Step 5: Run the migration test.**

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/src/migrations.ts packages/core/test/opportunity-domain.test.ts
git commit -m "feat(core): add generic opportunity records"
```

---

### Task 2: Add Hackathon Studio tables and invariants

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Test: `packages/core/test/hackathon-domain.test.ts`

**Interfaces:**
- Consumes: Task 1 opportunities plus Phase 2 ventures, narratives and demo versions.
- Produces: complete hackathon persistence schema.

- [ ] **Step 1: Write a failing schema test.**

Assert these tables exist:

```text
hackathon_cycles
hackathon_tracks
hackathon_sponsors
hackathon_bounties
hackathon_rules
hackathon_entries
hackathon_entry_ventures
hackathon_entry_tracks
hackathon_entry_bounties
hackathon_eligibility_evaluations
hackathon_builds
hackathon_assets
hackathon_distribution_plans
hackathon_distribution_items
hackathon_submissions
hackathon_results
hackathon_conversions
```

- [ ] **Step 2: Append the cycle, track, sponsor and bounty SQL.**

```sql
CREATE TABLE hackathon_cycles (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  cycle_name TEXT NOT NULL,
  registration_open_at TEXT,
  registration_close_at TEXT,
  build_start_at TEXT,
  build_end_at TEXT,
  submission_deadline_at TEXT,
  judging_start_at TEXT,
  judging_end_at TEXT,
  demo_day_at TEXT,
  result_at TEXT,
  format TEXT NOT NULL CHECK(format IN ('online','in_person','hybrid','unknown')),
  location TEXT,
  state TEXT NOT NULL CHECK(state IN ('announced','registration','building','submission','judging','completed','cancelled','watchlist')),
  rules_source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  rules_retrieved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(opportunity_id,cycle_name)
);

CREATE TABLE hackathon_tracks (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goals TEXT,
  judging_criteria_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(judging_criteria_json) AND json_type(judging_criteria_json)='array'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(cycle_id,name)
);

CREATE TABLE hackathon_sponsors (
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  contact_person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  relationship_state TEXT NOT NULL CHECK(relationship_state IN ('unresearched','identified','contacted','meeting','partner','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(cycle_id,organization_id)
);

CREATE TABLE hackathon_bounties (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  sponsor_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  track_id TEXT REFERENCES hackathon_tracks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount_value REAL CHECK(amount_value IS NULL OR amount_value >= 0),
  amount_asset TEXT,
  required_technology TEXT,
  eligibility TEXT,
  judging_criteria TEXT,
  submission_requirements TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  freshness_state TEXT NOT NULL CHECK(freshness_state IN ('current','aging','stale','unknown')),
  conflict_lock_in_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 3: Add structured rules and evaluations.**

```sql
CREATE TABLE hackathon_rules (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('geography','age','student_status','company_age','existing_code','team_size','intellectual_property','open_source','required_technology','attendance','prior_funding','prohibited_participant','submission_language','required_artifact','other')),
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  blocking INTEGER NOT NULL DEFAULT 1 CHECK(blocking IN (0,1)),
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  observed_at TEXT,
  confidence TEXT NOT NULL CHECK(confidence IN ('verified','supported','inferred','unknown','stale')),
  review_state TEXT NOT NULL CHECK(review_state IN ('pending','accepted','rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hackathon_eligibility_evaluations (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('eligible','ineligible','uncertain')),
  evaluated_at TEXT NOT NULL,
  rules_snapshot_sha256 TEXT NOT NULL CHECK(length(rules_snapshot_sha256)=64),
  detail_json TEXT NOT NULL CHECK(json_valid(detail_json) AND json_type(detail_json)='array'),
  founder_review_state TEXT NOT NULL CHECK(founder_review_state IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  UNIQUE(entry_id,rules_snapshot_sha256)
);
```

Create `hackathon_entries` before the evaluation table in the actual migration order.

- [ ] **Step 4: Add entries and joins.**

```sql
CREATE TABLE hackathon_entries (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  canonical_demo_version_id TEXT NOT NULL REFERENCES canonical_demo_versions(id) ON DELETE RESTRICT,
  submission_concept TEXT NOT NULL,
  user_outcome TEXT NOT NULL,
  ecosystem_adapter TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL CHECK(estimated_hours BETWEEN 1 AND 1000),
  reuse_percentage INTEGER NOT NULL CHECK(reuse_percentage BETWEEN 0 AND 100),
  strategic_fit INTEGER NOT NULL CHECK(strategic_fit BETWEEN 1 AND 10),
  acceptance_probability INTEGER NOT NULL CHECK(acceptance_probability BETWEEN 1 AND 10),
  capital_upside INTEGER NOT NULL CHECK(capital_upside BETWEEN 1 AND 10),
  distribution_upside INTEGER NOT NULL CHECK(distribution_upside BETWEEN 1 AND 10),
  technical_leverage INTEGER NOT NULL CHECK(technical_leverage BETWEEN 1 AND 10),
  credibility INTEGER NOT NULL CHECK(credibility BETWEEN 1 AND 10),
  urgency INTEGER NOT NULL CHECK(urgency BETWEEN 1 AND 10),
  effort_efficiency INTEGER NOT NULL CHECK(effort_efficiency BETWEEN 1 AND 10),
  lock_in_safety INTEGER NOT NULL CHECK(lock_in_safety BETWEEN 1 AND 10),
  weighted_score REAL NOT NULL CHECK(weighted_score BETWEEN 0 AND 100),
  founder_decision TEXT NOT NULL CHECK(founder_decision IN ('pending','go','conditional_go','no_go')),
  founder_rationale TEXT,
  state TEXT NOT NULL CHECK(state IN ('candidate','approved','scoped','building','verification','submission_ready','submitted','judging','finalist','won','not_selected','withdrawn','converted','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hackathon_entry_ventures (
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK(role IN ('lead','supporting')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(entry_id,venture_id)
);
```

Add track and bounty join tables with composite primary keys.

- [ ] **Step 5: Add build, asset, distribution, submission, result and conversion tables.**

`hackathon_builds` must store repository, immutable base SHA, branch, worktree reference, adapter path, owner agent, tool policy JSON, budget, start/stop conditions, current commit, CI state, security review state, evidence manifest digest and merge decision.

`hackathon_assets` must support kinds:

```text
readme
repository
architecture
screenshot
demo_video
pitch_deck
submission_text
license
open_source_notice
receipt
other
```

`hackathon_distribution_plans` has one row per entry and status `draft|approved|active|completed|cancelled`.

`hackathon_distribution_items` kinds:

```text
pre_build_announcement
build_in_public_update
555stream_session
arcade_activation
technical_article
launch_post
thread
clip
sponsor_acknowledgement
judge_follow_up
investor_update
partner_follow_up
post_result_announcement
open_source_release
other
```

`hackathon_submissions` stores portal URL, submitted timestamp, exact narrative/demo IDs, repository commit SHA, receipt reference, content digest and status.

`hackathon_results` stores outcome, placement, prize, credits, invitations and recorded timestamp.

`hackathon_conversions` kinds:

```text
grant
accelerator
pilot
investor_meeting
sponsor_relationship
partner_integration
user_growth
media_coverage
reusable_demo
other
```

- [ ] **Step 6: Add database-level authority triggers.**

Require:

```text
narrative is approved and purpose=hackathon
narrative legal entity matches entry legal entity
every entry has exactly one lead venture before leaving candidate
lead venture belongs to entry legal entity
canonical demo version is approved
founder_decision=go or conditional_go before state approved/scoped/building/...
```

- [ ] **Step 7: Run schema tests.**

```bash
pnpm --filter @outreachr/core test -- hackathon-domain.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add packages/core/src/migrations.ts packages/core/test/hackathon-domain.test.ts
git commit -m "feat(core): add Hackathon Studio schema"
```

---

### Task 3: Implement opportunity and hackathon validation schemas

**Files:**
- Create: `packages/core/src/opportunity-validation.ts`
- Create: `packages/core/src/hackathon-validation.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/opportunity-validation.test.ts`
- Test: `packages/core/test/hackathon-validation.test.ts`

**Interfaces:**
- Produces Zod input/output types matching every Task 1–2 table.

- [ ] **Step 1: Write failing validation tests.**

Cover:

```text
unknown dates remain nullable
invalid opportunity status rejected
reuse outside 0–100 rejected
score rating outside 1–10 rejected
approved entry without founder rationale on conditional_go rejected
all-zero or malformed Git SHAs rejected for active builds
submission digest must be 64 lowercase hex
```

- [ ] **Step 2: Define core enums.**

```ts
export const OpportunityTypeSchema = z.enum([
  'investor','accelerator','grant','hackathon','startup_program','cloud_credits',
  'strategic_partner','sponsor','design_partner',
]);

export const HackathonEntryStateSchema = z.enum([
  'candidate','approved','scoped','building','verification','submission_ready',
  'submitted','judging','finalist','won','not_selected','withdrawn','converted','archived',
]);
```

- [ ] **Step 3: Implement super-refinements.**

Require `conditional_go` to contain a non-empty rationale. Require submission end dates to follow starts when both exist. Require build current SHA to be based on a 40-character commit.

- [ ] **Step 4: Export all schemas from `packages/core/src/index.ts`.**
- [ ] **Step 5: Run tests.**

```bash
pnpm --filter @outreachr/core test -- opportunity-validation.test.ts hackathon-validation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/src/opportunity-validation.ts packages/core/src/hackathon-validation.ts packages/core/src/index.ts packages/core/test
git commit -m "feat(core): validate hackathon operations"
```

---

### Task 4: Implement deterministic scoring and go/no-go policy

**Files:**
- Create: `resources/rndrntwrk/hackathon-score-policy.json`
- Create: `packages/core/src/hackathon-scoring.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/hackathon-scoring.test.ts`

**Interfaces:**
- Produces:

```ts
export interface HackathonScoreInput {
  strategicFit: number;
  acceptanceProbability: number;
  capitalUpside: number;
  distributionUpside: number;
  technicalLeverage: number;
  credibility: number;
  urgency: number;
  effortEfficiency: number;
  lockInSafety: number;
  reusePercentage: number;
  estimatedHours: number;
  deadline: string | null;
  evaluatedAt: string;
}

export function calculateHackathonScore(input: HackathonScoreInput): number;
export function evaluateHackathonGoNoGo(input: HackathonScoreInput): GoNoGoResult;
```

- [ ] **Step 1: Create the score policy.**

Use weights totaling 100:

```json
{
  "strategicFit": 20,
  "reuse": 15,
  "distributionUpside": 15,
  "technicalLeverage": 10,
  "capitalUpside": 10,
  "credibility": 10,
  "acceptanceProbability": 8,
  "urgency": 5,
  "effortEfficiency": 4,
  "lockInSafety": 3
}
```

Convert 1–10 ratings to a 0–weight contribution. Convert reuse percentage directly to its 15-point contribution. Round the result to one decimal.

- [ ] **Step 2: Write failing score tests.**

Use exact fixtures and expected scores calculated in the test. Include a high-fit/low-effort case, a low-reuse case and a platform-lock-in case.

- [ ] **Step 3: Implement go/no-go rules.**

Default `go` requires:

```text
weighted score >= 70
reuse percentage >= 60
estimated hours <= 80
known legal entity, venture, approved narrative and approved demo supplied by caller
no ineligible evaluation
no pending blocking rule
at least 48 hours until deadline when a deadline exists
```

`conditional_go` is allowed only when the score is at least 65 and the founder supplies explicit conditions. `no_go` is recommended for ineligible entries, less than 40% reuse, more than 120 hours, expired deadlines or lock-in safety <=2.

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/core test -- hackathon-scoring.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add resources/rndrntwrk/hackathon-score-policy.json packages/core/src/hackathon-scoring.ts packages/core/src/index.ts packages/core/test/hackathon-scoring.test.ts
git commit -m "feat(core): score hackathon portfolio decisions"
```

---

### Task 5: Implement rule evaluation and entry state machine

**Files:**
- Create: `packages/core/src/hackathon-eligibility.ts`
- Create: `packages/core/src/hackathon-state.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/hackathon-eligibility.test.ts`
- Test: `packages/core/test/hackathon-state.test.ts`

**Interfaces:**
- Produces:

```ts
export function evaluateHackathonEligibility(
  founderProfile: EligibilityProfile,
  rules: HackathonRule[],
): EligibilityEvaluation;

export function canTransitionHackathonEntry(
  from: HackathonEntryState,
  to: HackathonEntryState,
  readiness: HackathonReadiness,
): TransitionResult;

export function calculateHackathonReadiness(input: ReadinessInput): HackathonReadiness;
```

- [ ] **Step 1: Write failing eligibility tests.**

Cover verified eligible geography, explicit ineligible student-only requirement, unknown company-age rule, maximum team size, existing-code prohibition and required in-person attendance.

- [ ] **Step 2: Implement fail-closed uncertainty.**

A blocking rule with `pending`, `unknown` or `stale` evidence produces `uncertain`, never `eligible`.

- [ ] **Step 3: Write failing state tests.**

Required transition sequence:

```text
candidate → approved → scoped → building → verification → submission_ready → submitted → judging
```

Allow terminal branches to `withdrawn`, `not_selected`, `won`, `converted`, `archived` only according to explicit transition map.

- [ ] **Step 4: Implement readiness gates.**

`submission_ready` requires:

```text
founder decision go/conditional_go
accepted eligible evaluation for current rules digest
approved build plan
CI passed
security review passed or explicitly not_required
non-empty evidence manifest digest
all required assets ready and founder-approved
approved distribution plan with at least one pre-event, one submission-day and one post-result item
approved hackathon narrative and demo version
```

- [ ] **Step 5: Run tests.**

```bash
pnpm --filter @outreachr/core test -- hackathon-eligibility.test.ts hackathon-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/src/hackathon-eligibility.ts packages/core/src/hackathon-state.ts packages/core/src/index.ts packages/core/test
git commit -m "feat(core): enforce hackathon eligibility and readiness"
```

---

### Task 6: Add OpportunityRepository and HackathonRepository

**Files:**
- Create: `packages/core/src/opportunity-repository.ts`
- Create: `packages/core/src/hackathon-repository.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/opportunity-repository.test.ts`
- Test: `packages/core/test/hackathon-repository.test.ts`

**Interfaces:**
- Produces:

```ts
export class OpportunityRepository {
  constructor(vault: CoreVault);
  upsertOrganization(input: OrganizationInput): Organization;
  upsertOpportunity(input: OpportunityInput): Opportunity;
  attachSource(input: OpportunitySourceInput): OpportunitySource;
  reviewSource(opportunityId: string, sourceId: string, role: string, decision: 'accept' | 'reject', reviewedAt: string): void;
  listOpportunities(filter?: OpportunityFilter): Opportunity[];
  getOpportunity(id: string): Opportunity | null;
}

export class HackathonRepository {
  constructor(vault: CoreVault);
  upsertCycle(input: HackathonCycleInput): HackathonCycle;
  upsertTrack(input: HackathonTrackInput): HackathonTrack;
  upsertSponsor(input: HackathonSponsorInput): HackathonSponsor;
  upsertBounty(input: HackathonBountyInput): HackathonBounty;
  upsertRule(input: HackathonRuleInput): HackathonRule;
  reviewRule(id: string, decision: 'accept' | 'reject', reviewedAt: string): HackathonRule;
  createEntry(input: HackathonEntryCreateInput): HackathonEntry;
  replaceEntryVentures(entryId: string, ventures: EntryVentureInput[], createdAt: string): void;
  replaceEntryTracks(entryId: string, trackIds: string[]): void;
  replaceEntryBounties(entryId: string, bountyIds: string[]): void;
  saveEligibilityEvaluation(input: EligibilityEvaluationInput): EligibilityEvaluation;
  decideEntry(input: EntryDecisionInput): HackathonEntry;
  transitionEntry(input: EntryTransitionInput): HackathonEntry;
  saveBuild(input: HackathonBuildInput): HackathonBuild;
  saveAsset(input: HackathonAssetInput): HackathonAsset;
  saveDistributionPlan(input: DistributionPlanInput): DistributionPlan;
  saveDistributionItem(input: DistributionItemInput): DistributionItem;
  saveSubmission(input: HackathonSubmissionInput): HackathonSubmission;
  saveResult(input: HackathonResultInput): HackathonResult;
  saveConversion(input: HackathonConversionInput): HackathonConversion;
  getEntry(id: string): HackathonEntryDetail | null;
  listEntries(filter?: HackathonEntryFilter): HackathonEntrySummary[];
}
```

- [ ] **Step 1: Write failing repository tests.**

Test one cycle with SW4P and Alice candidate entries, two tracks, three bounties and different demo versions. Assert both candidates coexist.

- [ ] **Step 2: Implement every multi-table operation inside a savepoint.**

`decideEntry` and `transitionEntry` must append audit records that contain old state, new state, founder decision, score snapshot and rules snapshot digest.

- [ ] **Step 3: Recalculate score server-side.**

Ignore any caller-supplied weighted score. Calculate it from stored ratings and policy.

- [ ] **Step 4: Recalculate readiness server-side before state transitions.**

Do not trust a UI `ready=true` flag.

- [ ] **Step 5: Run tests.**

```bash
pnpm --filter @outreachr/core test -- opportunity-repository.test.ts hackathon-repository.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/src/opportunity-repository.ts packages/core/src/hackathon-repository.ts packages/core/src/index.ts packages/core/test
git commit -m "feat(core): persist hackathon operations"
```

---

### Task 7: Add desktop contracts, services and founder commands

**Files:**
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/opportunity-service.ts`
- Create: `apps/desktop/src/main/hackathon-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Test: `apps/desktop/test/integration/hackathon-service.test.ts`

**Interfaces:**
- Produces bootstrap records and commands for all Phase 3 operations.

- [ ] **Step 1: Add contracts.**

Define `OrganizationSummary`, `OpportunitySummary`, `HackathonCycleSummary`, `HackathonEntrySummary`, `HackathonEntryDetail`, `HackathonReadinessSummary`, `HackathonPortfolioMetrics` and nested track/bounty/rule/build/asset/distribution/submission/result/conversion types.

Extend `AppBootstrap`:

```ts
organizations: OrganizationSummary[];
opportunities: OpportunitySummary[];
hackathonCycles: HackathonCycleSummary[];
hackathonEntries: HackathonEntrySummary[];
hackathonPortfolio: HackathonPortfolioMetrics;
```

- [ ] **Step 2: Add commands.**

```ts
'opportunity.save': OpportunitySaveInput;
'opportunity.source.review': OpportunitySourceReviewInput;
'hackathon.cycle.save': HackathonCycleSaveInput;
'hackathon.track.save': HackathonTrackSaveInput;
'hackathon.sponsor.save': HackathonSponsorSaveInput;
'hackathon.bounty.save': HackathonBountySaveInput;
'hackathon.rule.save': HackathonRuleSaveInput;
'hackathon.rule.review': HackathonRuleReviewInput;
'hackathon.entry.create': HackathonEntryCreateCommand;
'hackathon.entry.score': { id: string };
'hackathon.entry.evaluateEligibility': { id: string };
'hackathon.entry.decide': EntryDecisionCommand;
'hackathon.entry.transition': EntryTransitionCommand;
'hackathon.build.save': HackathonBuildSaveInput;
'hackathon.asset.save': HackathonAssetSaveInput;
'hackathon.distribution.save': HackathonDistributionSaveInput;
'hackathon.distributionItem.save': HackathonDistributionItemSaveInput;
'hackathon.submission.save': HackathonSubmissionSaveInput;
'hackathon.result.save': HackathonResultSaveInput;
'hackathon.conversion.save': HackathonConversionSaveInput;
'hackathon.entry.get': { id: string };
```

- [ ] **Step 3: Implement services.**

`HackathonService` resolves legal entity, lead venture, approved narrative and approved demo before creating or deciding an entry. It maps core rows to frontend summaries and persists after each mutation.

- [ ] **Step 4: Add command validation and delegation.**

Use core Zod schemas plus strict command-only schemas. Never accept a weighted score, readiness status or eligibility result directly from the renderer.

- [ ] **Step 5: Extend bootstrap and counts.**

Portfolio metrics:

```text
open/upcoming/rolling cycles
candidate entries
approved active builds
submission-ready entries
submitted entries
finalists/wins
next deadline
blocked entries
estimated active hours
```

- [ ] **Step 6: Run integration tests.**

```bash
pnpm --filter @outreachr/desktop test:integration -- hackathon-service.test.ts vault-service.test.ts
pnpm --filter @outreachr/desktop typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/desktop/src/shared/contracts.ts apps/desktop/src/main/opportunity-service.ts apps/desktop/src/main/hackathon-service.ts apps/desktop/src/main/command-service.ts apps/desktop/src/main/vault-service.ts apps/desktop/test/integration
git commit -m "feat(desktop): expose Hackathon Studio commands"
```

---

### Task 8: Build the Hackathon Studio portfolio page

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/HackathonStudioPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/HackathonQueue.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/HackathonScorecard.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/HackathonDeadlineStrip.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Test: `apps/desktop/test/renderer/hackathon-studio.test.tsx`
- Test: `apps/desktop/test/renderer/app-smoke.test.tsx`

**Interfaces:**
- Consumes: Phase 3 bootstrap summaries.
- Produces: founder portfolio view and candidate-entry creation.

- [ ] **Step 1: Write the failing route/navigation test.**

Assert `/hackathons` exists and `Hackathon Studio` appears immediately after `Up next` in primary navigation.

- [ ] **Step 2: Add route and navigation.**

Use a trophy or code icon, sentence-case label and existing flat layout. Do not add a decorative dashboard card wall.

- [ ] **Step 3: Implement portfolio sections.**

The default page shows:

```text
Next decisions
Deadlines in 72 hours / 14 days / 30 days
Active builds
Submission-ready
Submitted and judging
Results and conversions
Watchlist
```

Every queue row shows opportunity, cycle, lead venture, canonical demo, score, reuse, hours, eligibility, next action and deadline.

- [ ] **Step 4: Add filters.**

```text
status
venture
canonical demo
ecosystem
format
eligibility
priority window
state
```

Unknown values remain visible as `Unknown`, not filtered out as false.

- [ ] **Step 5: Add candidate-entry creation.**

Founder selects cycle, legal entity, one lead venture, optional supporting ventures, approved hackathon narrative, approved demo, concept, user outcome, adapter, score inputs and estimate.

- [ ] **Step 6: Update `WorkspaceContext`.**

Refresh on `opportunity.` and `hackathon.` command prefixes.

- [ ] **Step 7: Run renderer tests.**

```bash
pnpm --filter @outreachr/desktop test -- hackathon-studio.test.tsx app-smoke.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add apps/desktop/src/renderer apps/desktop/test/renderer
git commit -m "feat(ui): add Hackathon Studio portfolio"
```

---

### Task 9: Build the founder entry workspace and readiness controls

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/EligibilityPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/BuildPlanPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/SubmissionPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/DistributionPlanPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/ResultPanel.tsx`
- Test: `apps/desktop/test/renderer/hackathon-entry.test.tsx`

**Interfaces:**
- Consumes: `hackathon.entry.get` and mutation commands.
- Produces: one complete founder-controlled entry lifecycle.

- [ ] **Step 1: Write failing readiness tests.**

Render an entry missing rules review, CI evidence and distribution items. Assert `Move to submission ready` is disabled and the page names each blocker.

- [ ] **Step 2: Implement entry header.**

Show frozen authority:

```text
legal entity
lead venture
supporting ventures
narrative version + digest
canonical demo version + baseline SHA
track/bounties
founder decision
current state
next deadline
```

- [ ] **Step 3: Implement eligibility panel.**

List each rule with source, confidence, review state, blocking status and evaluation outcome. Founder may accept or reject source interpretation; they may not directly set eligibility to eligible.

- [ ] **Step 4: Implement build plan panel.**

Store or generate these exact command fields:

```text
repository
base SHA
branch
worktree reference
adapter path
owner agent
approved tool policy
budget
start condition
stop condition
current commit
CI state
security review state
evidence manifest digest
merge decision
```

Provide a copyable worktree command, but do not execute it:

```bash
git worktree add ../outreachr-hack-<entry-slug> -b hack/<entry-slug> <base-sha>
```

- [ ] **Step 5: Implement submission assets.**

Required assets have explicit `missing`, `draft`, `ready`, `approved` states. Approval binds reference and content digest.

- [ ] **Step 6: Implement minimum distribution plan.**

Require one pre-event item, one submission-day item and one post-result item before readiness passes.

- [ ] **Step 7: Implement state transition dialog.**

Show current readiness and exact blockers. Founder confirms the transition. The renderer sends only desired state; service recomputes readiness.

- [ ] **Step 8: Implement submission and result records.**

The founder manually submits in the external portal, then records the exact commit, narrative/demo version, content digest, timestamp and receipt reference. Result entry supports finalist, win, not selected and conversion records.

- [ ] **Step 9: Run renderer tests.**

```bash
pnpm --filter @outreachr/desktop test -- hackathon-entry.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit.**

```bash
git add apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx apps/desktop/src/renderer/src/components/hackathons apps/desktop/test/renderer/hackathon-entry.test.tsx
git commit -m "feat(ui): operate hackathon entries end to end"
```

---

### Task 10: Add deadline and blocker work items to Up Next

**Files:**
- Modify: `apps/desktop/src/main/vault-service.ts`
- Modify: `apps/desktop/src/renderer/src/pages/UpNextPage.tsx`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Test: `apps/desktop/test/integration/vault-service.test.ts`
- Test: `apps/desktop/test/renderer/app-smoke.test.tsx`

**Interfaces:**
- Consumes: cycle deadlines, entry blockers and distribution items.
- Produces: founder’s morning decision queue.

- [ ] **Step 1: Extend `WorkItem.kind`.**

Add:

```text
hackathon_decision
hackathon_rule_review
hackathon_build
hackathon_asset
hackathon_submission
hackathon_distribution
hackathon_follow_up
```

- [ ] **Step 2: Generate work items.**

Examples:

```text
Decide whether SW4P enters Colosseum Eternal
Review existing-code rule for ETHOnline
Add approved base SHA for Alice agent entry
Record demo-video asset before deadline
Submit BNB Hack entry manually
Publish 555stream build session task
Follow up with Circle sponsor contact after judging
```

- [ ] **Step 3: Prioritize by deadline and blocking effect.**

A blocker within 72 hours is urgent. A candidate decision within 14 days is high. Watchlist refresh without announced date is normal.

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
pnpm --filter @outreachr/desktop test -- app-smoke.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/desktop/src/main/vault-service.ts apps/desktop/src/renderer/src/pages/UpNextPage.tsx apps/desktop/src/shared/contracts.ts apps/desktop/test
git commit -m "feat: surface hackathon decisions in Up Next"
```

---

### Task 11: Protect privacy, backup, migration and contribution boundaries

**Files:**
- Modify: `packages/core/src/contribution.ts`
- Modify: `packages/core/test/core.test.ts`
- Create: `packages/core/test/hackathon-backup.test.ts`
- Modify: `apps/desktop/test/integration/vault-service.test.ts`

**Interfaces:**
- Consumes: all Phase 3 tables.
- Produces: verified local-only hackathon execution state.

- [ ] **Step 1: Add contribution exclusion assertions.**

The public investor contribution export must contain none of the Phase 3 tables. Do not add opportunity or hackathon records to the existing contribution package in this phase.

- [ ] **Step 2: Add encrypted round-trip fixture.**

Fixture includes:

```text
2 opportunities
1 cycle
2 candidate entries using different ventures
1 approved entry
rules and eligibility
build and asset records
distribution plan
submission receipt
result and conversion
```

After backup/restore, assert all records and audit-chain integrity.

- [ ] **Step 3: Add migration reopen test.**

```text
v10 → v11 → create hackathon data → close → reopen → integrity check
```

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/core test
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/core/src/contribution.ts packages/core/test apps/desktop/test/integration/vault-service.test.ts
git commit -m "test: protect Hackathon Studio private state"
```

---

### Task 12: Add one complete E2E scenario

**Files:**
- Create: `apps/desktop/e2e/hackathon-studio.spec.ts`
- Modify: `apps/desktop/test/helpers/*` only when existing helpers cannot express the flow
- Test: Electron E2E

**Interfaces:**
- Consumes: all Phase 3 UI and commands.
- Produces: packaged-desktop proof of the founder journey.

- [ ] **Step 1: Write the E2E scenario.**

The test must:

```text
open a seeded founder workspace
create one hackathon opportunity and cycle
add two candidate entries: SW4P and Alice
review rules
score both
approve only SW4P
add build reference and evidence
add required assets
add three-phase distribution plan
transition through verification to submission_ready
record manual submission receipt
record finalist result and grant conversion
verify Up Next changes after each milestone
```

- [ ] **Step 2: Run headed locally.**

```bash
pnpm --filter @outreachr/desktop test:e2e:headed -- hackathon-studio.spec.ts
```

Expected: PASS with no clipped controls at the minimum supported width.

- [ ] **Step 3: Run full E2E.**

```bash
pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add apps/desktop/e2e/hackathon-studio.spec.ts apps/desktop/test/helpers
git commit -m "test(e2e): qualify founder Hackathon Studio"
```

---

## Phase 3 Verification Gate

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm audit --audit-level=moderate
```

Expected: PASS.

Manual founder checks:

```text
[ ] one cycle supports multiple candidate product entries
[ ] lead venture, entity, narrative and demo are explicit
[ ] scores recalculate server-side
[ ] uncertain blocking rule prevents qualification
[ ] only founder-approved entry becomes active
[ ] worktree commands are generated but never executed by Outreachr
[ ] GitHub commit and CI evidence remain external authorities
[ ] submission-ready requires build evidence, approved assets and distribution plan
[ ] manual submission stores receipt and exact frozen versions
[ ] result can convert to grant, pilot, sponsor, investor, user or reusable demo
[ ] Up Next surfaces deadlines and blockers
[ ] backup/restore and contribution privacy pass
```

## Phase 3 Definition of Done

- Hackathons are first-class records, not investor or generic task aliases.
- The system can hold more than 100 cycles and many component-specific candidates.
- One event may contain independent SW4P, Alice, 555stream, Arcade, Ads, Earn or CTRL entries.
- Go/no-go uses transparent scoring, eligibility, reuse, effort, urgency and lock-in data.
- Every selected entry binds to an immutable source baseline and evidence manifest.
- Every selected entry carries a build plan and distribution/conversion plan.
- External submission, publishing, merging and outreach remain manual founder actions.
- Results measure engineering reuse, visibility, sponsors, grants, accelerators, pilots, investors, users and media—not only prizes.
- Full core, desktop, renderer and Electron E2E qualification passes.
