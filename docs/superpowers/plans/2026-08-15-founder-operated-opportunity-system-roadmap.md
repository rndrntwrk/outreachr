# Founder-Operated Opportunity System Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Outreachr into a solo-founder, local-first operating system for capital, hackathons, accelerators, grants, sponsors, design partners, public distribution, and bounded Alice/RNDRNTWRK CTRL assistance.

**Architecture:** Preserve the existing local SQLite vault, proposal-only agents, exact founder approval, and GitHub source authority. Add the new system in bounded layers: fork governance, real-world capital qualification, shared venture authority, Hackathon Studio, general applications, reviewed Atlas import, opportunity-aware MCP, and distribution/conversion reporting.

**Tech Stack:** TypeScript 5.9, Node.js 22.12+, pnpm 11.18, Electron, React, SQL.js SQLite, Zod 4, Vitest, Playwright Electron, MCP SDK 1.30, GitHub Actions.

## Global Constraints

- The product remains single-user and local-first; no cloud synchronization or multi-user account system is introduced.
- The founder is the only authority for send, submit, publish, upload, spend, sign, merge, approve narrative, or mark evidence verified.
- Agents may read founder-selected context and create typed pending proposals only.
- GitHub remains source, branch, worktree, review, CI, release, and technical evidence authority.
- The Opportunity Atlas remains the public discovery and scoring layer; Outreachr imports reviewed execution records only.
- Hackathons are first-class product, engineering, marketing, distribution, capital, and relationship campaigns.
- Each active hackathon entry requires both a reproducible build plan and a distribution/conversion plan.
- Legal entity, venture, narrative profile, and capital mandate are distinct records.
- An external application stores the exact approved narrative and canonical demo version used at submission time.
- No private vault, contact graph, application answer, diligence record, or private opportunity package is committed to GitHub.
- Preserve the current one-unsolicited-initial communication invariant until a separate reviewed plan explicitly changes it.
- Every migration is append-only, sequential, transactional, and covered by reopen, backup, restore, and contribution-boundary tests.
- Every new source-backed fact stores provenance, observation time, confidence, rights, freshness, and review state.

---

## Program Sequence

| Phase | Deliverable | Depends on | Independent release gate |
|---|---|---|---|
| 0 | Fork governance and reproducible RNDRNTWRK baseline | Approved design | Fork CI and release evidence exist |
| 1 | One real SW4P capital mandate operated on current product | Phase 0 | Founder completes one safe end-to-end capital workflow |
| 2 | Legal entity, venture, narrative, canonical demo, and capital mandate authority | Phase 0 | Existing investor workflows resolve through one mandate |
| 3 | First-class Hackathon Studio | Phase 2 | One imported or manually entered hackathon runs from qualification to result |
| 4 | Accelerators, grants, credits, sponsors, design partners, and general applications | Phase 2; reuses Phase 3 base | One non-hackathon application completes end to end |
| 5 | Digest-pinned Opportunity Atlas import | Phases 3–4 | Reviewed package imports idempotently with provenance |
| 6 | Alice and RNDRNTWRK CTRL opportunity MCP | Phases 2–5 | Agents can read selected records and create proposals only |
| 7 | Hackathon distribution and conversion engine | Phase 3; integrates Phases 4–6 | One entry produces build, public proof, outreach, and conversion records |
| 8 | Production hardening and founder release | All prior phases | Full verify, E2E, backup/restore, release, and privacy gates pass |

## Plan Documents

- `2026-08-15-phase-0-fork-governance.md`
- `2026-08-15-phase-1-sw4p-capital-mandate.md`
- `2026-08-15-phase-2-venture-narrative-domain.md`
- `2026-08-15-phase-3-hackathon-studio.md`
- `2026-08-15-phase-4-general-opportunity-applications.md`
- `2026-08-15-phase-5-opportunity-atlas-import.md`
- `2026-08-15-phase-6-alice-ctrl-opportunity-mcp.md`
- `2026-08-15-phase-7-distribution-conversion.md`
- `2026-08-15-phase-8-production-release.md`

---

### Task 1: Establish the program branch and release discipline

**Files:**
- Modify: `.github/CODEOWNERS`
- Modify: `.github/workflows/verify.yml`
- Modify: `SECURITY.md`
- Create: `docs/UPSTREAM_SYNC.md`
- Create: `docs/RNDRNTWRK_FORK_POLICY.md`
- Test: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: merged design at `docs/superpowers/specs/2026-08-15-founder-operated-opportunity-system-design.md`.
- Produces: a protected, independently verified RNDRNTWRK fork baseline for all later feature branches.

- [ ] **Step 1: Implement and merge Phase 0 using its dedicated plan.**

Run after merge:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm verify
pnpm test:e2e
```

Expected: all local gates pass and the fork has its own successful GitHub Actions history.

- [ ] **Step 2: Tag the baseline release.**

```bash
git tag -a rndrntwrk-outreachr-v0.1.2-baseline -m "RNDRNTWRK Outreachr baseline"
git push origin rndrntwrk-outreachr-v0.1.2-baseline
```

Expected: release artifacts, checksums, provenance, and signing status are generated by the fork workflow.

- [ ] **Step 3: Commit the phase completion record.**

```bash
git add docs/UPSTREAM_SYNC.md docs/RNDRNTWRK_FORK_POLICY.md SECURITY.md .github/CODEOWNERS .github/workflows/verify.yml
git commit -m "chore: establish RNDRNTWRK fork governance"
```

---

### Task 2: Qualify the current product with one real SW4P mandate

**Files:**
- Create: `docs/runbooks/sw4p-capital-mandate.md`
- Create: `docs/runbooks/private-vault-qualification.md`
- Modify: `docs/user-guide.md`
- Test: `apps/desktop/test/integration/vault-service.test.ts`
- Test: `apps/desktop/test/integration/connector-service.test.ts`

**Interfaces:**
- Consumes: Phase 0 baseline; current investor, outreach, meeting, task, knowledge, backup, and agent workflows.
- Produces: a documented founder workflow and a list of verified product gaps before schema expansion.

- [ ] **Step 1: Execute Phase 1 without changing the schema.**

Use a private local vault. Load a focused SW4P target set, current narrative blocks, and one synthetic contact before any real send.

- [ ] **Step 2: Verify the safety path.**

Run:

```bash
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts connector-service.test.ts
pnpm test:e2e
```

Expected: exact approval, one-initial enforcement, suppression, backup/restore, and agent proposal review remain intact.

- [ ] **Step 3: Record founder findings in the runbook.**

The runbook must classify each observation as `works`, `workflow gap`, `domain gap`, or `security invariant` and link every domain gap to a later phase task.

---

### Task 3: Add shared legal, venture, narrative, demo, and mandate authority

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Create: `packages/core/src/venture-validation.ts`
- Create: `packages/core/src/venture-repository.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/venture-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Create: `apps/desktop/src/renderer/src/pages/VenturesPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/NarrativesPage.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Test: `packages/core/test/core.test.ts`
- Test: `apps/desktop/test/integration/vault-service.test.ts`
- Test: `apps/desktop/test/renderer/command-flows.test.tsx`

**Interfaces:**
- Consumes: Phase 0 baseline and the current `rounds`/`targets` model.
- Produces: `LegalEntity`, `Venture`, `NarrativeProfileVersion`, `CanonicalDemo`, and `CapitalMandate` interfaces used by every later phase.

- [ ] **Step 1: Implement Phase 2 using its dedicated TDD plan.**
- [ ] **Step 2: Migrate existing founder data into one default legal entity, venture, narrative, demo set, and capital mandate.**
- [ ] **Step 3: Verify an old v9 vault opens as v10 and an approved narrative cannot be silently mutated.**
- [ ] **Step 4: Commit.**

```bash
git add packages/core apps/desktop docs
git commit -m "feat: add venture and narrative authority"
```

---

### Task 4: Build Hackathon Studio as the first opportunity workspace

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Create: `packages/core/src/opportunity-validation.ts`
- Create: `packages/core/src/opportunity-repository.ts`
- Create: `packages/core/src/hackathon-validation.ts`
- Create: `packages/core/src/hackathon-repository.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/opportunity-service.ts`
- Create: `apps/desktop/src/main/hackathon-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Create: `apps/desktop/src/renderer/src/pages/HackathonStudioPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/HackathonScorecard.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/EligibilityPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/hackathons/BuildPlanPanel.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `apps/desktop/src/renderer/src/state/WorkspaceContext.tsx`
- Test: `packages/core/test/hackathon-domain.test.ts`
- Test: `apps/desktop/test/integration/hackathon-service.test.ts`
- Test: `apps/desktop/test/renderer/hackathon-studio.test.tsx`

**Interfaces:**
- Consumes: Phase 2 venture, narrative, and canonical demo records.
- Produces: generic `Opportunity` records plus `HackathonCycle`, `Track`, `Sponsor`, `Bounty`, `Rule`, `Entry`, `BuildRecord`, `SubmissionAsset`, and founder go/no-go state.

- [ ] **Step 1: Implement Phase 3 with hackathons prioritized over all other opportunity kinds.**
- [ ] **Step 2: Enter one event with two candidate component submissions and approve only one.**
- [ ] **Step 3: Prove the approved entry cannot reach `submission_ready` without eligibility resolution, build evidence, required assets, and a distribution plan.**
- [ ] **Step 4: Commit.**

```bash
git add packages/core apps/desktop
 git commit -m "feat: add founder-operated Hackathon Studio"
```

---

### Task 5: Generalize opportunities and applications beyond hackathons

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Create: `packages/core/src/application-validation.ts`
- Create: `packages/core/src/application-repository.ts`
- Modify: `packages/core/src/opportunity-validation.ts`
- Modify: `packages/core/src/opportunity-repository.ts`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/application-service.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Create: `apps/desktop/src/renderer/src/pages/OpportunitiesPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/ApplicationDetailPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/applications/ApplicationAnswers.tsx`
- Create: `apps/desktop/src/renderer/src/components/applications/ApplicationAssets.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Test: `packages/core/test/application-domain.test.ts`
- Test: `apps/desktop/test/integration/application-service.test.ts`
- Test: `apps/desktop/test/renderer/application-flows.test.tsx`

**Interfaces:**
- Consumes: Phase 2 authority records and Phase 3 generic opportunity base.
- Produces: accelerator, grant, startup program, cloud credit, strategic partner, sponsor, and design-partner application workflows.

- [ ] **Step 1: Implement Phase 4 using the dedicated plan.**
- [ ] **Step 2: Complete one accelerator application and one grant application using different venture narratives.**
- [ ] **Step 3: Verify submitted answers and assets retain their approved versions.**
- [ ] **Step 4: Commit.**

```bash
git add packages/core apps/desktop
 git commit -m "feat: add general opportunity applications"
```

---

### Task 6: Import reviewed Opportunity Atlas packages

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Create: `packages/core/src/opportunity-package.ts`
- Create: `packages/core/src/opportunity-import.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Modify: `apps/desktop/src/main/command-service.ts`
- Modify: `apps/desktop/src/main/vault-service.ts`
- Create: `scripts/build-opportunity-package.mjs`
- Create: `docs/opportunity-package-format.md`
- Test: `packages/core/test/opportunity-import.test.ts`
- Test: `apps/desktop/test/integration/opportunity-import.test.ts`

**Interfaces:**
- Consumes: reviewed Atlas JSON exports and Phase 3–4 repositories.
- Produces: an idempotent, digest-pinned, source-aware import with explicit add/update/conflict results.

- [ ] **Step 1: Implement Phase 5 using a canonical JSON package with deterministic serialization and SHA-256 digest.**
- [ ] **Step 2: Reject packages with unsupported schema, digest mismatch, prohibited redistribution, invalid dates, or missing source records.**
- [ ] **Step 3: Import a fixture containing at least 100 hackathons and verify a second import is idempotent.**
- [ ] **Step 4: Commit.**

```bash
git add packages/core apps/desktop scripts docs
 git commit -m "feat: import reviewed opportunity atlas packages"
```

---

### Task 7: Extend proposal-only MCP for opportunities and hackathons

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Modify: `packages/mcp/src/types.ts`
- Modify: `packages/mcp/src/schemas.ts`
- Modify: `packages/mcp/src/redaction.ts`
- Modify: `packages/mcp/src/server.ts`
- Modify: `apps/desktop/src/main/mcp-service.ts`
- Modify: `apps/desktop/src/main/mcp-stdio-entry.ts`
- Modify: `apps/desktop/src/main/agent-service.ts`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Modify: `apps/desktop/src/renderer/src/pages/AgentPage.tsx`
- Test: `packages/mcp/test/server.test.ts`
- Test: `apps/desktop/test/integration/mcp-service.test.ts`
- Test: `apps/desktop/test/renderer/agent-page.test.tsx`

**Interfaces:**
- Consumes: Phase 2–5 read models and application commands.
- Produces: bounded opportunity reads and pending proposals; no external action tools.

- [ ] **Step 1: Implement Phase 6 with new context classes for ventures, opportunities, hackathons, and applications.**
- [ ] **Step 2: Add read tools and safe proposal tools only.**
- [ ] **Step 3: Add negative tests proving send, submit, publish, upload, sign, spend, merge, verify, raw SQL, filesystem, and shell tools do not exist.**
- [ ] **Step 4: Commit.**

```bash
git add packages/core packages/mcp apps/desktop
 git commit -m "feat: add opportunity-aware proposal-only MCP"
```

---

### Task 8: Add distribution and conversion operations

**Files:**
- Modify: `packages/core/src/migrations.ts`
- Create: `packages/core/src/distribution-validation.ts`
- Create: `packages/core/src/distribution-repository.ts`
- Modify: `apps/desktop/src/shared/contracts.ts`
- Create: `apps/desktop/src/main/distribution-service.ts`
- Create: `apps/desktop/src/renderer/src/pages/DistributionPage.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/DistributionPlan.tsx`
- Create: `apps/desktop/src/renderer/src/components/distribution/ConversionLedger.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/HackathonEntryPage.tsx`
- Test: `packages/core/test/distribution-domain.test.ts`
- Test: `apps/desktop/test/integration/distribution-service.test.ts`
- Test: `apps/desktop/test/renderer/distribution-flows.test.tsx`

**Interfaces:**
- Consumes: Phase 3 hackathon entry, Phase 4 applications, Phase 6 agent proposals.
- Produces: founder-operated publication tasks, sponsor/judge/investor follow-up, results, and conversion metrics without autonomous publishing.

- [ ] **Step 1: Implement Phase 7 using the dedicated plan.**
- [ ] **Step 2: Require every approved hackathon entry to contain a build plan and distribution plan.**
- [ ] **Step 3: Record one result that converts into a grant, accelerator, pilot, investor, sponsor, or reusable demo opportunity.**
- [ ] **Step 4: Commit.**

```bash
git add packages/core apps/desktop
 git commit -m "feat: add hackathon distribution and conversion"
```

---

### Task 9: Complete production qualification and release

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/RELEASE_CHECKLIST.md`
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `SECURITY.md`
- Modify: `docs/architecture.md`
- Modify: `docs/privacy-and-threat-model.md`
- Modify: `docs/user-guide.md`
- Test: `packages/core/test/core.test.ts`
- Test: `packages/mcp/test/server.test.ts`
- Test: `apps/desktop/test/integration/*.test.ts`
- Test: `apps/desktop/test/renderer/*.test.tsx`
- Test: Electron E2E suites

**Interfaces:**
- Consumes: all phase deliverables.
- Produces: a signed or explicitly disclosed RNDRNTWRK founder release and migration-safe local vault.

- [ ] **Step 1: Run the full verification gate.**

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

Expected: PASS with no moderate-or-higher advisories and no accessibility regression.

- [ ] **Step 2: Run migration and privacy qualification.**

Verify:

```text
v9 vault → latest schema → reopen → encrypted backup → restore → reopen
Atlas package → import → re-import → deterministic no-op
private vault → contribution export → zero private opportunity/application/hackathon tables
agent context → selected records only → pending proposal only
```

- [ ] **Step 3: Build all six native targets through GitHub Actions.**
- [ ] **Step 4: Verify SBOM, provenance, checksums, signing disclosure, and package smoke tests.**
- [ ] **Step 5: Tag the founder release.**

```bash
git tag -a rndrntwrk-outreachr-v0.2.0 -m "Founder-operated opportunity system"
git push origin rndrntwrk-outreachr-v0.2.0
```

---

## Cross-Phase Definition of Done

The program is complete only when all of the following are true:

- One local founder vault operates distinct legal entities, ventures, narrative profiles, demos, and capital mandates without economic or cap-table drift.
- Existing investor workflows still function and resolve through a capital mandate.
- More than 100 hackathons can be stored, searched, scored, and refreshed without reducing them to investor records.
- One cycle can hold multiple candidate RNDRNTWRK entries using different components and demos.
- Only founder-approved entries become active builds.
- Entry readiness is blocked until eligibility, source freshness, build evidence, required submission assets, and distribution planning are complete.
- Hackathon success records engineering, prize, grant, audience, sponsor, partner, investor, pilot, content, and reuse outcomes.
- Accelerators, grants, credits, sponsors, design partners, and strategic programs use application stages distinct from investor and hackathon stages.
- Atlas imports are source-aware, digest-pinned, reviewable, idempotent, and rights-conscious.
- Alice and RNDRNTWRK CTRL can read only selected records and create only pending proposals.
- No agent can send, submit, publish, upload, spend, sign, merge, verify, or access raw SQL, filesystem, shell, or credentials.
- Every new private table remains excluded from public contribution exports.
- The fork has passing CI, CodeQL, native package, accessibility, backup/restore, migration, audit-chain, SBOM, provenance, and checksum evidence.
