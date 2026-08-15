# Phase 7: Hackathon Distribution and Conversion Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every selected hackathon into a founder-operated product launch and distribution campaign that produces reusable code, public proof, media, sponsor relationships, grants, accelerators, pilots, investor access and measurable audience growth.

**Architecture:** Extend the minimum Phase 3 distribution plan with an approved campaign, private relationship records, source-backed metrics, cost/efficiency accounting, conversion attribution and exportable public proof packages. External publishing and outreach remain manual founder actions; Outreachr coordinates plans, drafts, references, evidence, results and follow-up.

**Tech Stack:** SQL.js SQLite, Zod 4, TypeScript, React, local file export, Vitest, Testing Library, Playwright Electron.

## Global Constraints

- Hackathon distribution is a first-class success dimension, not an optional post-submission task.
- Every founder-approved entry must contain a build plan and a distribution/conversion campaign.
- Distribution plans explicitly cover pre-event, build-in-public, submission-day, judging/result and post-event conversion windows.
- 555stream, 555 Arcade agent-native play and RNDRNTWRK Ads programmable sponsor experiences are supported as distinct campaign surfaces.
- Agents may propose distribution tasks and briefs but cannot publish, send, upload or spend.
- The founder records actual external URLs, sends, posts, submissions and meetings after performing them through the relevant platform.
- Private judge, sponsor, investor, partner and creator contacts never enter public proof exports.
- Metrics remain unknown until observed; no synthetic impressions, viewers, users, conversions or values are generated.
- Verified metrics require a source or evidence reference and observation time.
- Prize value, grants, credits, investment, sponsor support and pilot value remain separate categories.
- Marketing reach does not replace technical evidence; technical completion does not replace distribution execution.
- Public proof packages contain only founder-approved public artifacts, metrics and source metadata.
- Conversion attribution is evidence-based and may remain `unknown` or `contributing`; the system does not pretend one post caused a capital or product outcome.

---

## File Structure

```text
packages/core/src/distribution-validation.ts
  Campaign, contact, artifact, metric, cost, proof-package and attribution schemas.

packages/core/src/distribution-metrics.ts
  Metric taxonomy, derived efficiency calculations and validation.

packages/core/src/distribution-repository.ts
  Private campaign records, verified observations, conversions and proof manifests.

packages/core/src/public-proof.ts
  Deterministic, privacy-safe proof package builder.

apps/desktop/src/main/distribution-service.ts
  Founder commands, readiness, local export and mapped summaries.

apps/desktop/src/renderer/src/pages/DistributionPage.tsx
  Portfolio campaign calendar, results and conversion queue.

apps/desktop/src/renderer/src/components/distribution/*
  Campaign, content, relationships, metrics, costs, conversions and proof export.
```

---

### Task 1: Add distribution and conversion schema v15

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Test: `packages/core/test/distribution-domain.test.ts`

**Interfaces:**
- Consumes: schema v14, Phase 3 hackathon distribution tables and conversions.
- Produces: campaigns, relationships, metrics, costs, artifacts, attribution and public-proof records.

- [ ] **Step 1: Write the failing migration test.**

Assert schema v15 and tables:

```text
distribution_campaigns
distribution_contacts
distribution_artifacts
distribution_metrics
distribution_costs
distribution_events
conversion_attribution
public_proof_packages
public_proof_items
```

- [ ] **Step 2: Set `SCHEMA_VERSION = 15` and add campaigns.**

```sql
CREATE TABLE distribution_campaigns (
  id TEXT PRIMARY KEY,
  hackathon_entry_id TEXT NOT NULL UNIQUE REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  hackathon_distribution_plan_id TEXT NOT NULL UNIQUE REFERENCES hackathon_distribution_plans(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  primary_audience TEXT NOT NULL,
  public_story TEXT NOT NULL,
  sponsor_value TEXT NOT NULL,
  primary_call_to_action TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','approved','active','completed','cancelled')),
  approved_by TEXT,
  approved_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK((status='draft' AND approved_at IS NULL) OR (status!='draft' AND approved_at IS NOT NULL))
);
```

- [ ] **Step 3: Rebuild distribution item kinds.**

Rebuild `hackathon_distribution_items` into a v15 table that preserves all Phase 3 rows and allows:

```text
pre_build_announcement
build_in_public_update
555stream_session
arcade_activation
arcade_custom_game
sponsor_brief
programmable_sponsor_experience
creator_collaboration
technical_article
ecosystem_demo
community_launch
launch_post
thread
clip
press_pitch
judge_brief
sponsor_acknowledgement
judge_follow_up
investor_update
partner_follow_up
post_result_announcement
open_source_release
other
```

Add columns:

```text
campaign_id
phase: pre_event|build|submission|judging_result|post_event
channel
status: planned|drafting|approved|externally_completed|cancelled
scheduled_at
completed_at
external_url
artifact_reference
content_sha256 nullable
founder_approval_at
```

Migrate old status values deterministically. Preserve item IDs.

- [ ] **Step 4: Add private contacts and artifacts.**

```sql
CREATE TABLE distribution_contacts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK(role IN ('judge','sponsor','investor','accelerator','partner','creator','press','community','developer_relations','other')),
  relationship_state TEXT NOT NULL CHECK(relationship_state IN ('identified','researching','ready','contacted','meeting','follow_up','converted','closed')),
  private_context TEXT,
  next_action TEXT,
  next_action_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(person_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE TABLE distribution_artifacts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  distribution_item_id TEXT REFERENCES hackathon_distribution_items(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK(kind IN ('article','clip','video','stream','game','ad_experience','demo','repository','documentation','screenshot','press_kit','social_post','thread','presentation','other')),
  title TEXT NOT NULL,
  reference TEXT NOT NULL,
  content_sha256 TEXT CHECK(content_sha256 IS NULL OR length(content_sha256)=64),
  visibility TEXT NOT NULL CHECK(visibility IN ('private','public_draft','public_approved')),
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(visibility!='public_approved' OR (approved_at IS NOT NULL AND content_sha256 IS NOT NULL))
);
```

- [ ] **Step 5: Add source-backed metrics and costs.**

```sql
CREATE TABLE distribution_metrics (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  distribution_item_id TEXT REFERENCES hackathon_distribution_items(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK(category IN ('engineering','competition','distribution','ecosystem','capital','product','content','efficiency')),
  metric_key TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  evidence_reference TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('verified','supported','inferred','unknown')),
  visibility TEXT NOT NULL CHECK(visibility IN ('private','public_approved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(confidence!='verified' OR evidence_reference IS NOT NULL OR source_id IS NOT NULL)
);

CREATE TABLE distribution_costs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL CHECK(cost_type IN ('founder_hours','agent_compute','cloud','travel','production','contractor','sponsor_pass_through','other')),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  unit TEXT NOT NULL,
  amount_value REAL CHECK(amount_value IS NULL OR amount_value >= 0),
  amount_asset TEXT,
  evidence_reference TEXT,
  incurred_at TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('private','public_approved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 6: Add append-only events and conversion attribution.**

`distribution_events` stores campaign approval, external completion, metric observation, contact movement, proof export and conversion events with actor and canonical JSON. Add append-only update/delete triggers.

```sql
CREATE TABLE conversion_attribution (
  conversion_id TEXT NOT NULL REFERENCES hackathon_conversions(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  distribution_item_id TEXT REFERENCES hackathon_distribution_items(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES distribution_contacts(id) ON DELETE SET NULL,
  attribution TEXT NOT NULL CHECK(attribution IN ('direct','contributing','unknown')),
  evidence_reference TEXT,
  rationale TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(conversion_id,campaign_id,distribution_item_id,contact_id)
);
```

- [ ] **Step 7: Add proof-package tables.**

```sql
CREATE TABLE public_proof_packages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL CHECK(length(manifest_sha256)=64),
  status TEXT NOT NULL CHECK(status IN ('draft','approved','exported','superseded')),
  approved_by TEXT,
  approved_at TEXT,
  exported_at TEXT,
  export_reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(campaign_id,version)
);

CREATE TABLE public_proof_items (
  package_id TEXT NOT NULL REFERENCES public_proof_packages(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK(item_type IN ('artifact','metric','result','conversion','source')),
  item_id TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL CHECK(length(snapshot_sha256)=64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(package_id,item_type,item_id)
);
```

Add triggers preventing content changes to approved/exported/superseded proof packages.

- [ ] **Step 8: Add campaign readiness triggers.**

An entry cannot move from `approved` to `scoped` unless its Phase 3 plan exists. A distribution campaign cannot become `approved` unless it contains at least:

```text
one pre_event item
one build or submission item
one judging_result or post_event item
one public_story
one primary_call_to_action
```

Keep service-level checks primary; SQL triggers repeat minimum cardinality rules.

- [ ] **Step 9: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- distribution-domain.test.ts
git add packages/core/src/migrations.ts packages/core/test/distribution-domain.test.ts
git commit -m "feat(core): add distribution and conversion schema"
```

---

### Task 2: Define distribution taxonomy and validation

**Files:**
- Create: `resources/rndrntwrk/distribution-metrics.json`
- Create: `packages/core/src/distribution-validation.ts`
- Create: `packages/core/src/distribution-metrics.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/distribution-validation.test.ts`
- Test: `packages/core/test/distribution-metrics.test.ts`

**Interfaces:**
- Produces strict schemas plus derived portfolio calculations.

- [ ] **Step 1: Create the metric taxonomy.**

Include these keys and units:

```text
engineering.adapters_shipped / count
engineering.tests_added / count
engineering.reusable_code_percentage / percent
engineering.production_delta_completed / percent

competition.submitted / boolean
competition.finalist / boolean
competition.placement / ordinal
competition.prize_value / asset_amount
competition.credits_value / asset_amount

 distribution.impressions / count
 distribution.video_views / count
 distribution.stream_viewers / count
 distribution.repository_visitors / count
 distribution.repository_stars / count
 distribution.social_engagements / count
 distribution.event_participants / count

 ecosystem.sponsor_conversations / count
 ecosystem.sponsor_engineering_sessions / count
 ecosystem.ecosystem_introductions / count
 ecosystem.grant_invitations / count

 capital.investor_meetings / count
 capital.accelerator_interviews / count
 capital.diligence_processes / count
 capital.capital_pipeline_value / asset_amount

 product.pilots / count
 product.integrations / count
 product.signups / count
 product.activated_users / count
 product.retained_users / count

 content.articles / count
 content.clips / count
 content.demo_videos / count
 content.documentation_assets / count
 content.custom_games / count
 content.sponsor_experiences / count

 efficiency.founder_hours / hours
 efficiency.cash_cost / asset_amount
 efficiency.opportunities_unlocked / count
 efficiency.cost_per_qualified_relationship / asset_amount
 efficiency.hours_per_reusable_adapter / hours
```

Remove accidental leading whitespace when implementing the JSON.

- [ ] **Step 2: Write failing schema tests.**

Reject negative counts, percentages above 100, unsupported metric keys, verified observations without evidence, public metrics without approval and malformed digests.

- [ ] **Step 3: Implement validation schemas.**

Export campaign, item, contact, artifact, metric, cost, attribution and proof-package inputs/outputs.

- [ ] **Step 4: Implement derived calculations.**

```ts
export function calculateDistributionSummary(input: {
  metrics: DistributionMetric[];
  costs: DistributionCost[];
  conversions: HackathonConversion[];
}): DistributionSummary;
```

Derived values are `null` when a denominator is zero or unknown. Never coerce unknown to zero.

Calculate:

```text
total founder hours
total recorded cash cost
public reach by channel where observed
qualified relationships
conversions by type
cost per qualified relationship
founder hours per reusable adapter
opportunities unlocked
```

- [ ] **Step 5: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- distribution-validation.test.ts distribution-metrics.test.ts
git add resources/rndrntwrk/distribution-metrics.json packages/core/src/distribution-validation.ts packages/core/src/distribution-metrics.ts packages/core/src/index.ts packages/core/test
git commit -m "feat(core): define hackathon distribution metrics"
```

---

### Task 3: Implement DistributionRepository and proof manifest snapshots

**Files:**
- Create: `packages/core/src/distribution-repository.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/distribution-repository.test.ts`

**Interfaces:**
- Produces:

```ts
export class DistributionRepository {
  constructor(vault: CoreVault);
  createCampaign(input: DistributionCampaignInput): DistributionCampaign;
  approveCampaign(id: string, founderId: string, approvedAt: string): DistributionCampaign;
  saveItem(input: DistributionItemInput): DistributionItem;
  approveItem(id: string, expectedDigest: string, founderId: string, approvedAt: string): DistributionItem;
  completeExternalItem(id: string, externalUrl: string | null, completedAt: string): DistributionItem;
  saveContact(input: DistributionContactInput): DistributionContact;
  saveArtifact(input: DistributionArtifactInput): DistributionArtifact;
  approveArtifact(id: string, expectedDigest: string, founderId: string, approvedAt: string): DistributionArtifact;
  saveMetric(input: DistributionMetricInput): DistributionMetric;
  approvePublicMetric(id: string, founderId: string, approvedAt: string): DistributionMetric;
  saveCost(input: DistributionCostInput): DistributionCost;
  attributeConversion(input: ConversionAttributionInput): ConversionAttribution;
  createProofPackage(input: PublicProofCreateInput): PublicProofPackageDetail;
  approveProofPackage(id: string, expectedManifestSha256: string, founderId: string, approvedAt: string): PublicProofPackageDetail;
  markProofExported(id: string, expectedManifestSha256: string, exportReference: string, exportedAt: string): PublicProofPackageDetail;
  getCampaign(entryId: string): DistributionCampaignDetail | null;
  listCampaigns(filter?: DistributionCampaignFilter): DistributionCampaignSummary[];
}
```

- [ ] **Step 1: Write the failing repository test.**

Create a campaign containing a 555stream build session, Arcade custom game, RNDRNTWRK Ads sponsor experience, article, launch thread and post-result investor follow-up. Assert the campaign cannot approve until all required phases are represented.

- [ ] **Step 2: Implement digest-bound approval.**

Items and artifacts calculate SHA-256 from immutable public content/reference fields. Approval compares the displayed digest. External completion may add URL/time but cannot alter approved draft content.

- [ ] **Step 3: Implement metric immutability rules.**

A verified metric may be corrected only by creating a new metric record with `supersedesMetricId` in its metadata; do not overwrite the original observation. If a schema column is needed, add it during Task 1 migration implementation before release.

- [ ] **Step 4: Implement proof snapshot creation.**

The founder supplies selected public-approved IDs. Repository:

```text
loads each selected artifact/metric/result/conversion/source
rejects private or unapproved records
serializes public-safe snapshot for each
calculates snapshot digest
calculates sorted manifest digest
creates package and item rows in one savepoint
```

- [ ] **Step 5: Append distribution events.**

Every approval, external completion, metric, cost, attribution and proof export creates an append-only event.

- [ ] **Step 6: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- distribution-repository.test.ts
git add packages/core/src/distribution-repository.ts packages/core/src/index.ts packages/core/test/distribution-repository.test.ts
git commit -m "feat(core): persist distribution campaigns and proof"
```

---

### Task 4: Build privacy-safe public proof packages

**Files:**
- Create: `packages/core/src/public-proof.ts`
- Modify: `packages/core/src/index.ts`
- Create: `docs/public-proof-package.md`
- Test: `packages/core/test/public-proof.test.ts`

**Interfaces:**
- Produces deterministic local package files:

```text
manifest.json
README.md
artifacts.json
metrics.json
results.json
conversions.json
sources.json
SHA256SUMS
```

- [ ] **Step 1: Write failing privacy tests.**

Populate private contacts, next actions, costs, local paths, application answers and meeting notes. Build a public package and assert none of those values or table names occur in any output file.

- [ ] **Step 2: Define public snapshot types.**

Allow:

```text
campaign title/objective/public story
approved public artifact references and digests
approved public metrics and evidence URLs
competition result
founder-approved public conversion descriptions
source citation metadata
```

Exclude:

```text
person IDs
contact values
private context
next actions
local file paths
internal costs unless explicitly public-approved
unapproved metrics
private application or investor data
agent prompts and proposals
```

- [ ] **Step 3: Implement deterministic output.**

Sort by type/ID, use stable JSON, normalized LF line endings and deterministic Markdown sections. Package version and source campaign digest appear in the manifest.

- [ ] **Step 4: Generate checksums.**

Calculate SHA-256 for every file except `SHA256SUMS`, then write sorted checksum lines.

- [ ] **Step 5: Write documentation.**

Explain that export creates a local proof artifact only. It does not publish, upload, grant access or certify performance.

- [ ] **Step 6: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- public-proof.test.ts
git add packages/core/src/public-proof.ts packages/core/src/index.ts packages/core/test/public-proof.test.ts docs/public-proof-package.md
git commit -m "feat(core): export privacy-safe hackathon proof"
```

---

### Task 5: Add DistributionService and founder commands

**Files:**
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/distribution-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Test: `apps/desktop/test/integration/distribution-service.test.ts`

**Interfaces:**
- Produces `DistributionCampaignSummary`, `DistributionCampaignDetail`, `DistributionPortfolioMetrics` and founder commands.

- [ ] **Step 1: Extend bootstrap.**

```ts
distributionCampaigns: DistributionCampaignSummary[];
distributionPortfolio: {
  activeCampaigns: number;
  itemsDue72Hours: number;
  externallyCompletedItems: number;
  publicArtifacts: number;
  verifiedMetrics: number;
  qualifiedRelationships: number;
  conversions: number;
  founderHours: number | null;
  recordedCashCost: MoneyAmount[];
};
```

Do not aggregate incompatible assets into one dollar value without an explicit conversion record.

- [ ] **Step 2: Add commands.**

```text
distribution.campaign.create
distribution.campaign.approve
distribution.item.save
distribution.item.approve
distribution.item.completeExternal
distribution.contact.save
distribution.artifact.save
distribution.artifact.approve
distribution.metric.save
distribution.metric.approvePublic
distribution.cost.save
distribution.conversion.attribute
distribution.proof.create
distribution.proof.approve
distribution.proof.export
distribution.campaign.get
```

- [ ] **Step 3: Implement local proof export.**

Use main-process directory picker, validate directory, build files in a temporary directory, verify checksums, then atomically rename into a new versioned directory. Never overwrite an existing proof package directory.

- [ ] **Step 4: Generate work items.**

Add founder work for due distribution items, missing evidence, sponsor/judge follow-up, unrecorded results, conversion opportunities and proof export.

- [ ] **Step 5: Run tests and commit.**

```bash
pnpm --filter @outreachr/desktop test:integration -- distribution-service.test.ts vault-service.test.ts
pnpm --filter @outreachr/desktop typecheck
git add apps/desktop/src/shared/contracts.ts apps/desktop/src/main/distribution-service.ts apps/desktop/src/main/command-service.ts apps/desktop/src/main/vault-service.ts apps/desktop/test/integration
git commit -m "feat(desktop): expose distribution and conversion operations"
```

---

### Task 6: Build the Distribution portfolio page

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/DistributionPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/CampaignQueue.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/DistributionPlan.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/RelationshipQueue.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/MetricsLedger.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/CostLedger.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/ConversionLedger.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/ProofPackagePanel.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Test: `apps/desktop/test/renderer/distribution-flows.test.tsx`
- Test: `apps/desktop/test/renderer/app-smoke.test.tsx`

**Interfaces:**
- Consumes distribution bootstrap and commands.
- Produces the founder’s marketing, visibility and conversion operating view.

- [ ] **Step 1: Add `/distribution`.**

Sidebar label: `Distribution`. Place after `Hackathon Studio`. Use a broadcast or megaphone icon without promotional visual clutter.

- [ ] **Step 2: Implement the morning queue.**

Show:

```text
Approve today
Due in 72 hours
Build-in-public
555stream sessions
Arcade games and activations
Sponsor experiences
Submission-day launches
Judging and result follow-up
Conversion opportunities
Proof packages
```

- [ ] **Step 3: Implement campaign phases.**

Use a five-phase timeline, not a generic kanban:

```text
Pre-event
Build
Submission
Judging / result
Post-event conversion
```

Every item displays owner `Founder` or agent-prepared status, scheduled time, approval, external completion and artifact/evidence reference.

- [ ] **Step 4: Make product surfaces explicit.**

Item editor allows:

```text
555stream live program
555 Arcade custom game or challenge
RNDRNTWRK Ads sponsor experience
technical article
demo video
repository release
creator collaboration
judge/sponsor/investor/partner follow-up
```

Do not reduce these to generic social posts.

- [ ] **Step 5: Implement metrics and cost ledgers.**

Unknown values display `Not observed`. Verified values show source/evidence and observation time. Costs preserve asset/unit rather than converting silently.

- [ ] **Step 6: Implement relationship queue.**

Private contacts display role, relationship state, next action and due date. Public proof export controls never appear in the same action region as private contact controls.

- [ ] **Step 7: Implement proof export review.**

Founder selects public-approved items, reviews the generated manifest digest, approves it, selects a local directory and exports. The interface states `Export locally`; it never says `Publish`.

- [ ] **Step 8: Update `WorkspaceContext`.**

Refresh on `distribution.` commands.

- [ ] **Step 9: Run tests and commit.**

```bash
pnpm --filter @outreachr/desktop test -- distribution-flows.test.tsx app-smoke.test.tsx
git add apps/desktop/src/renderer apps/desktop/test/renderer
git commit -m "feat(ui): operate hackathon distribution campaigns"
```

---

### Task 7: Integrate campaigns into Hackathon Studio and Up Next

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/HackathonStudioPage.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/UpNextPage.tsx`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Test: `apps/desktop/test/renderer/hackathon-entry.test.tsx`
- Test: `apps/desktop/test/integration/vault-service.test.ts`

**Interfaces:**
- Consumes campaign summaries and readiness.
- Produces one continuous build→submission→distribution→conversion experience.

- [ ] **Step 1: Add campaign readiness to entry header.**

Show five phases, count due/approved/completed items, sponsor/relationship state and proof-package state.

- [ ] **Step 2: Strengthen submission readiness.**

The entry cannot transition to `submission_ready` unless the distribution campaign is approved and has the required phase coverage. Server-side readiness remains authoritative.

- [ ] **Step 3: Add post-result conversion prompts.**

After a result, Up Next proposes founder tasks such as:

```text
record prize or credit separately
request sponsor technical follow-up
create grant application from the result
create accelerator application from invitation
schedule investor demonstration
convert reusable adapter into canonical demo vNext
publish founder-approved result proof
```

- [ ] **Step 4: Run tests and commit.**

```bash
pnpm --filter @outreachr/desktop test -- hackathon-entry.test.tsx
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
git add apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx apps/desktop/src/renderer/src/pages/HackathonStudioPage.tsx apps/desktop/src/renderer/src/pages/UpNextPage.tsx apps/desktop/src/main/vault-service.ts apps/desktop/test
git commit -m "feat: connect hackathons to distribution and conversion"
```

---

### Task 8: Add portfolio reporting without vanity inflation

**Files:**
- Create: `apps/desktop/src/renderer/src/components/distribution/PortfolioReport.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/DistributionPage.tsx`
- Create: `packages/core/src/distribution-report.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/distribution-report.test.ts`
- Test: `apps/desktop/test/renderer/distribution-flows.test.tsx`

**Interfaces:**
- Produces founder-private weekly reports and public-safe summaries.

- [ ] **Step 1: Define report sections.**

```text
Engineering shipped
Competition outcomes
Audience and media
Ecosystem relationships
Capital pathways
Product conversion
Reusable content
Cost and founder time
Stop / start / continue decisions
```

- [ ] **Step 2: Implement missingness-aware aggregation.**

Report distinguishes:

```text
0 observed
not observed
not applicable
not yet due
```

Never display an unknown metric as zero.

- [ ] **Step 3: Keep public and private report modes separate.**

Private report may include costs, contacts and next actions. Public-safe report may include only approved proof items.

- [ ] **Step 4: Add tests and commit.**

```bash
pnpm --filter @outreachr/core test -- distribution-report.test.ts
pnpm --filter @outreachr/desktop test -- distribution-flows.test.tsx
git add packages/core/src/distribution-report.ts packages/core/src/index.ts packages/core/test/distribution-report.test.ts apps/desktop/src/renderer
git commit -m "feat: report hackathon distribution outcomes honestly"
```

---

### Task 9: Protect backup, contribution and local privacy

**Files:**
- Modify: `packages/core/src/contribution.ts`
- Create: `packages/core/test/distribution-backup.test.ts`
- Modify: `packages/core/test/core.test.ts`
- Modify: `apps/desktop/test/integration/vault-service.test.ts`

**Interfaces:**
- Consumes all Phase 7 records.
- Produces private relationship preservation and safe public export.

- [ ] **Step 1: Exclude Phase 7 tables from investor contribution export.**

The proof-package exporter is the only public output path for distribution records. The investor contribution exporter remains unchanged in purpose.

- [ ] **Step 2: Add encrypted backup/restore fixture.**

Include campaign, private contacts, metrics, costs, artifacts, attribution and proof package. Restore and verify digests, approvals and audit events.

- [ ] **Step 3: Compare public proof with private vault.**

Assert private contact details, notes, local paths, costs not approved public and application/investor data are absent from every proof file.

- [ ] **Step 4: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
git add packages/core apps/desktop/test/integration/vault-service.test.ts
git commit -m "test: protect distribution relationships and proof"
```

---

### Task 10: Add a complete distribution E2E scenario

**Files:**
- Create: `apps/desktop/e2e/distribution-conversion.spec.ts`
- Test: Electron E2E

**Interfaces:**
- Consumes all Phase 7 UI and services.
- Produces packaged-app qualification from campaign design through conversion.

- [ ] **Step 1: Write the E2E scenario.**

```text
open one approved Agentic Cinema-style entry
create and approve campaign
add 555stream session
add agent-created Arcade game
add RNDRNTWRK Ads sponsor experience
add technical article and launch thread
record external URLs manually
record verified views and stream attendance with evidence
record founder hours and production cost
record judge and sponsor contacts privately
record finalist result
record grant invitation and sponsor follow-up conversion
create and approve public proof package
export locally
verify no private contact appears in exported files
```

- [ ] **Step 2: Run headed and full E2E.**

```bash
pnpm --filter @outreachr/desktop test:e2e:headed -- distribution-conversion.spec.ts
pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add apps/desktop/e2e/distribution-conversion.spec.ts
git commit -m "test(e2e): qualify hackathon distribution conversion"
```

---

## Phase 7 Verification Gate

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
[ ] every approved entry has a campaign covering all five phases
[ ] 555stream, Arcade and Ads appear as distinct operating surfaces
[ ] no external publish/send/upload/spend occurs from the app or agent
[ ] actual URLs and outcomes are recorded only after founder action
[ ] verified metrics show evidence and observation time
[ ] unknown metrics remain unknown
[ ] costs preserve units and assets
[ ] private contacts stay outside proof packages
[ ] conversions distinguish direct, contributing and unknown attribution
[ ] proof export is deterministic, checksummed and local
[ ] results include grants, accelerators, pilots, investors, sponsors, users, media and reusable demos
[ ] backup/restore and privacy tests pass
```

## Phase 7 Definition of Done

- Hackathons operate as product, distribution and relationship campaigns rather than isolated builds.
- Every selected entry includes technical work, public proof and conversion follow-up.
- 555stream, 555 Arcade, RNDRNTWRK Ads and product-specific narratives are expressible without feature dumping.
- Marketing, audience, ecosystem, capital, product, content and efficiency outcomes are measured honestly.
- Public proof packages contain only approved evidence and no private relationship data.
- External actions remain founder-controlled.
- Full core, desktop, renderer and E2E qualification passes.
