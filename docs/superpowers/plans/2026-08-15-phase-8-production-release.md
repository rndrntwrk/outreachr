# Phase 8: Production Hardening and Founder Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify and release the complete founder-operated capital, Hackathon Studio, Opportunity Atlas, Alice/RNDRNTWRK CTRL and distribution system as `rndrntwrk-outreachr-v0.2.0` with reproducible native builds, migration safety, privacy guarantees and documented founder recovery.

**Architecture:** Freeze schema v15 and feature scope. Treat the local SQLite vault as the sovereign private record, GitHub as source/CI authority, the Atlas package as reviewed public intelligence, MCP as proposal-only local access and exported proof packages as the only public distribution-data path. Production qualification runs through security, migration, recovery, scale, accessibility, agent-boundary, package and founder-acceptance gates.

**Tech Stack:** Node.js 22.12+, pnpm 11.18, TypeScript 5.9, Electron, React, SQL.js SQLite, Zod 4, MCP SDK 1.30, Vitest, Playwright Electron, GitHub Actions, CodeQL, CycloneDX SBOM, SLSA-format provenance, SHA-256 manifests.

## Global Constraints

- No feature or schema additions enter after the release-candidate freeze unless they fix a blocker.
- Final schema version is 15.
- The application remains single-user, local-first and without a hosted Outreachr account.
- No telemetry, analytics beacon, crash upload or remote logging is added.
- External network actions occur only through founder-initiated connectors, provider agents, opened source URLs or manual portal use.
- Agents remain proposal-only and never gain external execution authority.
- One unsolicited initial per canonical person remains the enforced outbound limit.
- Unknown opportunity facts and metrics remain unknown.
- Private opportunity, application, relationship, cost, contact, meeting, agent and diligence data never enters investor contribution or public proof exports.
- Public proof packages contain only founder-approved public snapshots and checksums.
- Every native package discloses signing/trust status; unsigned artifacts are never presented as signed.
- Release claims are limited to capabilities demonstrated by the release candidate and its test evidence.
- A release is blocked by any failed migration, restore, audit-chain, contribution privacy, agent negative-capability, accessibility, native smoke or checksum gate.

---

## Release Candidate Inputs

```text
Merged Phase 0 governance
Merged Phase 1 qualification evidence
Schema v10 venture authority
Schema v11 Hackathon Studio
Schema v12 general applications
Schema v13 Atlas import history
Schema v14 opportunity agent grants
Schema v15 distribution and conversion
Updated docs and threat model
Passing full test suite
Founder private UAT vault created from a backup copy, never the only live vault
```

---

### Task 1: Freeze release scope and write the v0.2.0 release contract

**Files:**
- Create: `docs/releases/rndrntwrk-outreachr-v0.2.0-contract.md`
- Modify: `.github/RELEASE_CHECKLIST.md`
- Modify: `CHANGELOG.md`
- Test: documentation assertions

**Interfaces:**
- Consumes: all merged phase deliverables.
- Produces: an explicit capability, non-goal and evidence contract for release approval.

- [ ] **Step 1: Write the capability contract.**

List release capabilities exactly:

```text
founder-operated legal entities, ventures, narrative versions and capital mandates
existing investor research, outreach, meetings, diligence and round workflow
first-class Hackathon Studio with multi-component candidate entries
generic accelerator, grant, credit, sponsor and partner applications
reviewed digest-pinned Atlas imports and conflict resolution
proposal-only opportunity MCP for Codex and Claude
hackathon distribution, sponsor, media, metric, cost and conversion records
privacy-safe local public proof package export
encrypted backup/restore and append-only audit chain
native desktop packaging for macOS, Windows and Linux on x64 and arm64
```

- [ ] **Step 2: Write non-goals.**

```text
multi-user collaboration
cloud sync or hosted account
autonomous send, submit, publish, upload, spend, sign or merge
portal automation
social-network automation
team project management
legal or investment advice
guaranteed opportunity completeness, eligibility, acceptance, prize, funding or product outcome
```

- [ ] **Step 3: Add release evidence links.**

The contract includes source commit, workflow run, test summary, migration report, accessibility report, security review, native artifact manifest and founder UAT record.

- [ ] **Step 4: Update release checklist and changelog.**

Use a release-candidate checklist with a named owner `Founder` and evidence link field for every gate.

- [ ] **Step 5: Add a placeholder scan assertion.**

```bash
node - <<'NODE'
const fs = require('node:fs');
for (const file of [
  'docs/releases/rndrntwrk-outreachr-v0.2.0-contract.md',
  '.github/RELEASE_CHECKLIST.md',
  'CHANGELOG.md',
]) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\b(TBD|TODO|FIXME|PLACEHOLDER)\b/u.test(text)) throw new Error(`Unresolved placeholder in ${file}`);
}
NODE
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add docs/releases/rndrntwrk-outreachr-v0.2.0-contract.md .github/RELEASE_CHECKLIST.md CHANGELOG.md
git commit -m "docs: freeze v0.2.0 release contract"
```

---

### Task 2: Add the complete migration and recovery matrix

**Files:**
- Create: `packages/core/test/migration-matrix.test.ts`
- Create: `scripts/generate-migration-report.mjs`
- Create: `docs/releases/v0.2.0-migration-report.md`
- Modify: `scripts/self-test.mjs`
- Test: core migration and backup suites

**Interfaces:**
- Consumes: representative schema fixtures v1 through v15.
- Produces: machine-tested evidence that supported historical vaults migrate, reopen, back up and restore safely.

- [ ] **Step 1: Create historical fixtures.**

For each released or materially different schema version, create a deterministic in-memory fixture builder rather than committing founder vault bytes. Minimum fixtures:

```text
v1 initial investor workspace
v4 mail/audit workspace
v6 strict initial-only workspace
v9 current upstream workspace
v10 venture authority workspace
v11 Hackathon Studio workspace
v12 application workspace
v13 imported Atlas workspace
v14 opportunity-agent workspace
v15 distribution workspace
```

- [ ] **Step 2: Write the migration matrix test.**

For each fixture:

```text
open and migrate to v15
assert PRAGMA integrity_check = ok
assert PRAGMA foreign_key_check returns zero rows
run backfills twice and assert idempotency
close and reopen
create encrypted backup
restore into a new vault
reopen restored vault
verify audit chain
verify representative old and new records
```

- [ ] **Step 3: Test failure atomicity.**

Inject a failure during a copied test migration and verify the original bytes remain openable at the prior version. Do not alter production migrations for fault injection; use a test-only migration runner wrapper.

- [ ] **Step 4: Generate the migration report.**

Script outputs Markdown containing fixture version, input records, output schema, integrity, foreign keys, backfill idempotency, backup/restore and audit result. Fail generation when any result is not `PASS`.

- [ ] **Step 5: Run tests.**

```bash
pnpm --filter @outreachr/core test -- migration-matrix.test.ts
node scripts/generate-migration-report.mjs --output docs/releases/v0.2.0-migration-report.md
```

Expected: PASS for every fixture.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/test/migration-matrix.test.ts scripts/generate-migration-report.mjs scripts/self-test.mjs docs/releases/v0.2.0-migration-report.md
git commit -m "test: qualify the v15 migration matrix"
```

---

### Task 3: Verify private/public data boundaries exhaustively

**Files:**
- Create: `packages/core/test/privacy-boundary-matrix.test.ts`
- Create: `scripts/scan-release-private-data.mjs`
- Modify: `scripts/self-test.mjs`
- Create: `docs/releases/v0.2.0-privacy-report.md`
- Test: contribution, proof package, package resource and log outputs

**Interfaces:**
- Consumes: a synthetic vault populated across every private table.
- Produces: proof that each export path contains only its explicit allowlist.

- [ ] **Step 1: Create a canary-rich synthetic vault.**

Populate unique canaries in:

```text
founder postal address and email
private work/personal contacts
warm-path notes
round thesis and expected checks
application answers and receipts
hackathon build worktree and tool policy
sponsor/judge/investor private context
meeting notes and attendees
agent prompts, context IDs and proposals
costs and private metrics
connector secret references
audit details
```

Use values such as `PRIVATE-CANARY-<TABLE>-<FIELD>`.

- [ ] **Step 2: Export every public artifact.**

```text
investor contribution SQLite
public hackathon proof package
CSV exports intended for founder use
packaged immutable investor seed
release logs and diagnostics fixtures
```

- [ ] **Step 3: Assert boundaries.**

Investor contribution contains only its existing public investor allowlist. Public proof contains only selected public-approved distribution snapshots. Founder CSV may contain founder-owned data but is never packaged as a public release asset. Seed contains no founder/private records. Production logs contain no canary.

- [ ] **Step 4: Add a release scanner.**

`scan-release-private-data.mjs` recursively scans release artifacts, generated resources and proof fixtures for canaries, email patterns, OAuth/token patterns, local home paths and SQLite private table names. It exits non-zero on a hit.

- [ ] **Step 5: Generate the privacy report.**

List each export path, included classes, excluded classes, canary count scanned and result.

- [ ] **Step 6: Run tests and commit.**

```bash
pnpm --filter @outreachr/core test -- privacy-boundary-matrix.test.ts
node scripts/scan-release-private-data.mjs --directory apps/desktop/resources
node scripts/scan-release-private-data.mjs --directory docs/releases
git add packages/core/test/privacy-boundary-matrix.test.ts scripts/scan-release-private-data.mjs scripts/self-test.mjs docs/releases/v0.2.0-privacy-report.md
git commit -m "test: verify private and public export boundaries"
```

---

### Task 4: Complete the agent and external-action negative capability audit

**Files:**
- Create: `packages/mcp/test/negative-capability-matrix.test.ts`
- Create: `packages/agents/test/opportunity-boundary.test.ts`
- Create: `apps/desktop/test/integration/external-action-boundary.test.ts`
- Create: `docs/releases/v0.2.0-agent-boundary-report.md`
- Test: MCP, agent and desktop suites

**Interfaces:**
- Consumes: all agent capabilities, tools, proposals and command mappings.
- Produces: exhaustive evidence that no autonomous external action exists.

- [ ] **Step 1: Define the forbidden vocabulary.**

```text
send
submit
publish
upload
accept_terms
sign
spend
transfer
merge
approve_evidence
verify_evidence
raw_sql
read_file
write_file
shell
network_fetch
credentials
connector_config
backup_export
backup_restore
```

- [ ] **Step 2: Scan declared capability and tool names.**

Assert no `AGENT_CAPABILITIES`, `OUTREACHR_AGENT_MCP_TOOLS` or MCP registered tool matches a forbidden executable operation.

- [ ] **Step 3: Test direct invocation.**

Attempt each plausible forbidden MCP name and assert method/tool-not-found before service dispatch.

- [ ] **Step 4: Test proposal payload rejection.**

For every proposal kind, inject forbidden keys at top level and nested levels. Output parsing must fail closed.

- [ ] **Step 5: Test proposal application.**

Assert ordinary command mapping creates only:

```text
draft application answer
candidate hackathon entry
local task
local next action
internal knowledge brief
```

and no connector, provider, GitHub or filesystem action.

- [ ] **Step 6: Test prompt injection.**

Use imported opportunity, sponsor brief, application question and meeting note canaries that instruct the model to bypass policy. Assert provider adapters expose only the current allowlist and proposals remain non-executable.

- [ ] **Step 7: Generate report and commit.**

```bash
pnpm --filter @outreachr/mcp test -- negative-capability-matrix.test.ts
pnpm --filter @outreachr/agents test -- opportunity-boundary.test.ts
pnpm --filter @outreachr/desktop test:integration -- external-action-boundary.test.ts
git add packages/mcp/test/negative-capability-matrix.test.ts packages/agents/test/opportunity-boundary.test.ts apps/desktop/test/integration/external-action-boundary.test.ts docs/releases/v0.2.0-agent-boundary-report.md
git commit -m "security: prove founder-only external authority"
```

---

### Task 5: Qualify performance and scale for the founder workload

**Files:**
- Create: `packages/core/test/scale.test.ts`
- Create: `apps/desktop/test/integration/scale-bootstrap.test.ts`
- Create: `scripts/benchmark-founder-workspace.mjs`
- Create: `docs/releases/v0.2.0-scale-report.md`
- Test: core and desktop scale suites

**Interfaces:**
- Consumes: deterministic large synthetic data.
- Produces: bounded startup, search, import and portfolio-operation evidence.

- [ ] **Step 1: Generate the scale fixture.**

Minimum:

```text
200 investor firms and people
1,500 sources and claims
10 ventures
30 narrative versions
20 demo versions
500 opportunities
150 hackathon cycles
300 tracks
500 bounties
2,000 rules
250 hackathon entries
100 builds
1,000 distribution items
2,000 metrics
100 general applications
500 application answers/assets
500 tasks and meetings
200 agent runs/proposals
```

- [ ] **Step 2: Define founder-desktop thresholds.**

On the CI Linux x64 reference job:

```text
cold vault open + migrate + bootstrap p95 <= 5 seconds
warm bootstrap p95 <= 2 seconds
search opportunities p95 <= 300 ms
Hackathon Studio filtered list p95 <= 500 ms
application detail load p95 <= 500 ms
100+ hackathon import <= 10 seconds
encrypted backup <= 20 seconds for a 100 MiB fixture
memory after warm bootstrap <= 700 MiB
```

Record observed values; do not loosen thresholds silently. A change requires explicit report update and founder approval.

- [ ] **Step 3: Add missing indexes only from evidence.**

Use `EXPLAIN QUERY PLAN` in tests. Add indexes through migration v15 only if the release candidate has not shipped; after release, use v16 in a later change. Never edit an already tagged migration.

- [ ] **Step 4: Prevent oversized bootstrap payloads.**

If the large bootstrap exceeds thresholds, replace full-detail arrays with summaries and fetch details by ID. Do not weaken record authorization or return private fields broadly to improve speed.

- [ ] **Step 5: Run benchmark and report.**

```bash
pnpm --filter @outreachr/core test -- scale.test.ts
pnpm --filter @outreachr/desktop test:integration -- scale-bootstrap.test.ts
node scripts/benchmark-founder-workspace.mjs --output docs/releases/v0.2.0-scale-report.md
```

Expected: all thresholds pass.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/test/scale.test.ts apps/desktop/test/integration/scale-bootstrap.test.ts scripts/benchmark-founder-workspace.mjs docs/releases/v0.2.0-scale-report.md
git commit -m "test: qualify founder workspace scale"
```

---

### Task 6: Complete accessibility and interaction qualification

**Files:**
- Modify: `apps/desktop/test/renderer/ui-production-audit.test.tsx`
- Create: `apps/desktop/e2e/accessibility-opportunity-workspaces.spec.ts`
- Create: `docs/releases/v0.2.0-accessibility-report.md`
- Modify: `DESIGN.md`
- Test: renderer and Electron E2E

**Interfaces:**
- Consumes: all new pages and dialogs.
- Produces WCAG 2.2 AA, keyboard, zoom and reduced-motion evidence.

- [ ] **Step 1: Enumerate every new surface.**

```text
Ventures
Narratives & demos
Hackathon Studio
Hackathon entry
Opportunities
Application detail
Opportunity import/conflicts
Agent opportunity context and proposals
Distribution
Proof export
```

- [ ] **Step 2: Extend automated axe coverage.**

Render representative populated, empty, loading, error, dialog and validation states. Require zero serious or critical violations and preserve existing project policy for all findings.

- [ ] **Step 3: Add keyboard E2E.**

Using keyboard only:

```text
navigate sidebar
create candidate entry
review rule
approve campaign
review agent proposal
open import preview
resolve conflict
approve proof export
cancel destructive or consequential dialogs with Escape
return focus to opener
```

- [ ] **Step 4: Add 200% zoom and narrow-width tests.**

At the supported minimum 720-pixel desktop width and 200% zoom, no primary action disappears, dialog footer remains reachable and dense tables retain keyboard-accessible horizontal scrolling.

- [ ] **Step 5: Test reduced motion and non-color state.**

Status always has text/icon; no state depends only on color. Animated progress or pulse respects `prefers-reduced-motion`.

- [ ] **Step 6: Generate report and commit.**

```bash
pnpm --filter @outreachr/desktop test -- ui-production-audit.test.tsx
pnpm --filter @outreachr/desktop test:e2e:headed -- accessibility-opportunity-workspaces.spec.ts
git add apps/desktop/test/renderer/ui-production-audit.test.tsx apps/desktop/e2e/accessibility-opportunity-workspaces.spec.ts docs/releases/v0.2.0-accessibility-report.md DESIGN.md
git commit -m "test: qualify opportunity workspace accessibility"
```

---

### Task 7: Harden logging, diagnostics and network disclosure

**Files:**
- Modify: `docs/privacy-and-threat-model.md`
- Modify: `docs/architecture.md`
- Modify: `SECURITY.md`
- Create: `apps/desktop/test/integration/logging-boundary.test.ts`
- Create: `scripts/audit-network-surface.mjs`
- Create: `docs/releases/v0.2.0-network-and-logging-report.md`
- Test: desktop integration and static audit

**Interfaces:**
- Consumes all logs, connectors, agents, source opening and export actions.
- Produces a documented and tested network/logging boundary.

- [ ] **Step 1: Define allowed network categories.**

```text
founder-initiated Gmail/Google Calendar
founder-initiated Outlook/Microsoft Calendar
founder-triggered Codex or Claude provider connection
founder-opened external source/application URL
GitHub operations performed outside the desktop app
```

The app contains no background opportunity refresh, telemetry, crash upload or hosted Outreachr service.

- [ ] **Step 2: Add log canary tests.**

Trigger representative connector, agent, import, application, hackathon and proof errors. Capture stderr/structured diagnostics and assert absence of tokens, message bodies, application answers, opportunity excerpts, contact values, local document paths and private agent context.

- [ ] **Step 3: Add static network audit.**

Scan first-party production source for `fetch`, HTTP clients, sockets, WebSockets and URL openings. Require every result to appear in an allowlisted module and category. Fail on unclassified network calls.

- [ ] **Step 4: Update threat model and security docs.**

Document protected opportunity assets, public/private import boundaries, proof packages and non-goals.

- [ ] **Step 5: Run audit and commit.**

```bash
pnpm --filter @outreachr/desktop test:integration -- logging-boundary.test.ts
node scripts/audit-network-surface.mjs --output docs/releases/v0.2.0-network-and-logging-report.md
git add docs/privacy-and-threat-model.md docs/architecture.md SECURITY.md apps/desktop/test/integration/logging-boundary.test.ts scripts/audit-network-surface.mjs docs/releases/v0.2.0-network-and-logging-report.md
git commit -m "security: document network and logging boundaries"
```

---

### Task 8: Update founder product documentation

**Files:**
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `docs/architecture.md`
- Modify: `docs/user-guide.md`
- Modify: `docs/agents.md`
- Modify: `docs/data-contributions.md`
- Create: `docs/hackathon-studio.md`
- Create: `docs/opportunities-and-applications.md`
- Create: `docs/distribution-and-proof.md`
- Test: docs links, placeholder and public-claim checks

**Interfaces:**
- Consumes the release contract and verified implementation.
- Produces accurate public and founder documentation.

- [ ] **Step 1: Rewrite product purpose without feature dumping.**

Use this category:

```text
Outreachr is a founder-owned opportunity operating system for capital, hackathons, grants, accelerators and strategic relationships.
```

Explain that Hackathon Studio turns each selected event into a bounded build, launch and distribution campaign.

- [ ] **Step 2: Explain the authority boundary.**

Prominently state:

```text
Agents research and propose.
The founder approves.
Outreachr never submits, publishes or signs on the founder's behalf.
```

- [ ] **Step 3: Document each workspace.**

Capital, Ventures, Narratives & demos, Hackathon Studio, Opportunities, Agent, Distribution and Review.

- [ ] **Step 4: Document migration and recovery.**

Founder instructions cover backup before upgrade, restore test, unsupported newer schemas, local deletion and release rollback.

- [ ] **Step 5: Preserve data-rights disclosure.**

Public investor seed and Atlas packages retain source-specific rights. Private vault and proof exports have different purposes and allowlists.

- [ ] **Step 6: Run docs assertions.**

```bash
pnpm format:check
node - <<'NODE'
const fs = require('node:fs');
const files = [
  'README.md','PRODUCT.md','DESIGN.md','docs/architecture.md','docs/user-guide.md',
  'docs/agents.md','docs/data-contributions.md','docs/hackathon-studio.md',
  'docs/opportunities-and-applications.md','docs/distribution-and-proof.md',
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\b(TBD|TODO|FIXME|PLACEHOLDER)\b/u.test(text)) throw new Error(`Placeholder in ${file}`);
  if (/autonomously (send|submit|publish|sign)/iu.test(text)) throw new Error(`Unsafe public claim in ${file}`);
}
NODE
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add README.md PRODUCT.md DESIGN.md docs
git commit -m "docs: document founder opportunity system"
```

---

### Task 9: Add the complete founder UAT scenario

**Files:**
- Create: `docs/releases/v0.2.0-founder-uat.md`
- Create: `apps/desktop/e2e/founder-opportunity-system.spec.ts`
- Test: headed Electron E2E and private founder walkthrough

**Interfaces:**
- Consumes every release feature.
- Produces one complete acceptance record.

- [ ] **Step 1: Automate the synthetic UAT path.**

```text
open a v9 workspace and migrate
review default legal entity/venture/mandate
create approved SW4P hackathon narrative and demo
import 100+ opportunity package
resolve one conflict
select one hackathon cycle
create SW4P and Alice candidates
approve only SW4P
review eligibility
record build and CI evidence
approve distribution campaign with 555stream, Arcade and sponsor experience
review and apply an agent-drafted application answer as draft
record manual hackathon submission
record finalist result and grant conversion
create grant application
record application receipt and interview
record verified public metrics and private costs
export public proof locally
create encrypted backup
restore into clean test workspace
verify audit chain and records
```

- [ ] **Step 2: Run headed on each desktop operating system where practical.**

CI runs packaged smoke/E2E across native targets. Founder manually completes the primary UAT on the intended daily-use operating system.

- [ ] **Step 3: Record exact evidence.**

The UAT document contains release candidate SHA, OS, app version, start/end time, checklist results, screenshots or local evidence references, defects and final founder decision.

- [ ] **Step 4: Block release on unresolved high-severity defects.**

Severity:

```text
S0 data loss, credential exposure or unauthorized external action: immediate block
S1 migration, restore, audit or privacy failure: block
S2 primary workflow or accessibility failure: block
S3 minor usability/documentation issue: may defer with explicit founder acceptance
```

- [ ] **Step 5: Run automated UAT and commit.**

```bash
pnpm --filter @outreachr/desktop test:e2e:headed -- founder-opportunity-system.spec.ts
pnpm test:e2e
git add apps/desktop/e2e/founder-opportunity-system.spec.ts docs/releases/v0.2.0-founder-uat.md
git commit -m "test(e2e): qualify the founder opportunity system"
```

---

### Task 10: Run the full security and quality gate

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/codeql.yml`
- Create: `docs/releases/v0.2.0-verification-summary.md`
- Test: all project gates

**Interfaces:**
- Consumes Tasks 1–9.
- Produces one machine- and human-readable verification summary.

- [ ] **Step 1: Add release-specific CI jobs.**

Add to quality/security or a dedicated release workflow:

```text
migration matrix
privacy boundary matrix
negative capability matrix
scale benchmark
network surface audit
release private-data scan
opportunity package deterministic fixture
public proof deterministic fixture
```

- [ ] **Step 2: Run local complete gate.**

```bash
corepack enable
corepack prepare pnpm@11.18.0 --activate
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm audit --audit-level=moderate
pnpm licenses
node scripts/validate-legal-notices.mjs
node scripts/self-test.mjs
```

Expected: every command passes with zero ignored failures.

- [ ] **Step 3: Run CodeQL.**

Do not dismiss a first-party alert merely to release. Fix or explicitly block the release.

- [ ] **Step 4: Generate summary.**

Include exact command, result, duration, evidence file, commit SHA and environment. The summary script fails if any required report is missing.

- [ ] **Step 5: Commit.**

```bash
git add .github/workflows/verify.yml .github/workflows/codeql.yml docs/releases/v0.2.0-verification-summary.md
git commit -m "ci: qualify v0.2.0 release gates"
```

---

### Task 11: Build and verify all native release artifacts

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `scripts/verify-packaged-resources.mjs`
- Modify: `scripts/collect-release-artifacts.mjs`
- Create: `docs/releases/v0.2.0-native-artifacts.md`
- Test: GitHub Actions native matrix

**Interfaces:**
- Consumes the release-candidate commit.
- Produces six native bundles with trust disclosures.

- [ ] **Step 1: Verify packaged resources.**

Require:

```text
SQLite WASM
investor seed and manifest
canonical demo seed
distribution metric taxonomy
agent sidecars and manifest
licenses and notices
no private Atlas or founder package
```

- [ ] **Step 2: Run native matrix.**

```text
macOS x64
macOS arm64
Windows x64
Windows arm64
Linux x64
Linux arm64
```

Each job runs full verify, E2E, legal notices, packaging, fuse verification, signing/trust disclosure, packaged smoke, SBOM, provenance and checksums.

- [ ] **Step 3: Verify package identity.**

Installed app displays RNDRNTWRK fork version and source commit without removing required upstream Apache attribution.

- [ ] **Step 4: Verify artifact manifests.**

Download every CI artifact into a clean verification workspace. Run checksum verification and confirm attestation subject paths match the downloaded bytes.

- [ ] **Step 5: Record native artifact report and commit.**

```bash
git add .github/workflows/release.yml scripts/verify-packaged-resources.mjs scripts/collect-release-artifacts.mjs docs/releases/v0.2.0-native-artifacts.md
git commit -m "release: verify native v0.2.0 artifacts"
```

---

### Task 12: Tag, release and preserve rollback

**Files:**
- Create: `docs/releases/v0.2.0-rollback.md`
- Finalize: `docs/releases/rndrntwrk-outreachr-v0.2.0-contract.md`
- Finalize: `CHANGELOG.md`
- Test: release download and clean-device smoke

**Interfaces:**
- Consumes approved verification, UAT and native artifacts.
- Produces the founder release and recovery path.

- [ ] **Step 1: Write rollback procedure.**

```text
1. Pause all outbound communication.
2. Close the application.
3. Preserve the current vault and logs without opening them in an older app.
4. Restore the last pre-upgrade encrypted backup into a separate test directory.
5. Install the prior trusted release.
6. Verify audit chain and representative records.
7. Continue only from the restored prior-version vault.
8. Never open a v15 vault with an older app that refuses the schema.
```

- [ ] **Step 2: Verify release decision evidence.**

Founder signs the contract checklist with:

```text
release candidate SHA
all required reports present
no S0/S1/S2 defects
UAT passed
native artifacts verified
rollback tested
GO decision and timestamp
```

- [ ] **Step 3: Merge release PR.**

Use squash or merge according to the protected ruleset; preserve the release-candidate SHA in the PR body and verification summary.

- [ ] **Step 4: Tag.**

```bash
git checkout main
git pull --ff-only origin main
git tag -a rndrntwrk-outreachr-v0.2.0 -m "Founder-operated opportunity system v0.2.0"
git push origin rndrntwrk-outreachr-v0.2.0
```

- [ ] **Step 5: Verify release page.**

The release contains:

```text
native installers/archives
SHA256SUMS per target
SBOM per target
provenance per target
GitHub attestations
LICENSE
NOTICE
THIRD_PARTY_NOTICES
signing/trust disclosure
release notes
migration and backup warning
```

- [ ] **Step 6: Perform clean-device smoke.**

On at least one primary founder device:

```text
install
launch
create synthetic workspace
import fixture
open Hackathon Studio
run one mocked agent proposal
export proof
create and restore backup
uninstall/reinstall
reopen workspace
```

- [ ] **Step 7: Finalize documentation.**

Replace evidence references in the release contract and reports with immutable release URLs and digests. Do not alter capability claims after tagging without a patch release.

---

## Phase 8 Verification Gate

Every gate below must be `PASS`:

```text
format
lint
typecheck
unit/integration tests
coverage
build
Electron E2E
dependency audit
CodeQL
migration matrix
backup/restore
audit-chain verification
privacy boundary matrix
agent negative-capability matrix
Atlas import determinism and conflict handling
public proof determinism and privacy
scale thresholds
accessibility and keyboard flows
network/logging audit
six native package smoke tests
SBOM/provenance/checksums/attestations
founder UAT
rollback test
```

## Phase 8 Definition of Done

- `rndrntwrk-outreachr-v0.2.0` is released from protected `main`.
- The release contract accurately describes implemented and verified behavior.
- All supported historical vault fixtures migrate to v15 and restore successfully.
- Private/public export boundaries pass canary scanning.
- Agent and MCP surfaces contain no autonomous external action.
- More than 100 hackathons and a large founder workload meet documented performance thresholds.
- Every new workspace passes accessibility, keyboard, zoom and reduced-motion tests.
- Six native artifacts have verified checksums, SBOM, provenance, attestations and explicit signing status.
- Founder UAT and rollback are complete.
- No S0, S1 or S2 defect remains open.
