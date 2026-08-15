# Phase 0: Fork Governance and Reproducible Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `rndrntwrk/outreachr` from an unmodified fork into a protected, independently verified, releasable RNDRNTWRK codebase before product changes begin.

**Architecture:** Keep upstream history intact and establish a strict upstream-sync workflow. The fork owns its branch protection, CODEOWNERS, security contact, CI history, release artifacts, and RNDRNTWRK-specific change policy while continuing to consume upstream fixes through reviewed sync pull requests.

**Tech Stack:** GitHub repository settings, GitHub Actions, Node.js 22.12+, pnpm 11.18, Electron packaging, CodeQL, SBOM/provenance/checksum scripts already in the repository.

## Global Constraints

- `main` remains releasable and accepts changes only through pull requests.
- The fork must have its own passing Actions and CodeQL history before feature work starts.
- Upstream sync never force-pushes `main` and never silently overwrites RNDRNTWRK changes.
- Private investor, opportunity, application, or diligence data never enters the public repository.
- Existing Apache-2.0 licensing and source-specific investor-data rights remain intact.
- Security reports involving credentials, private fundraising data, or outbound communication use private vulnerability reporting.
- All six native build targets remain required.

---

### Task 1: Replace upstream-only ownership with RNDRNTWRK ownership

**Files:**
- Modify: `.github/CODEOWNERS`
- Test: repository pull-request review requirements

**Interfaces:**
- Consumes: current owner account `@rndrntwrk`.
- Produces: explicit ownership for repository-wide, security-sensitive, connector, agent, MCP, core, and release paths.

- [ ] **Step 1: Write the failing ownership assertion.**

Create a temporary local check:

```bash
node - <<'NODE'
const fs = require('node:fs');
const text = fs.readFileSync('.github/CODEOWNERS', 'utf8');
for (const required of [
  '* @rndrntwrk',
  '/packages/core/ @rndrntwrk',
  '/packages/connectors/ @rndrntwrk',
  '/packages/agents/ @rndrntwrk',
  '/packages/mcp/ @rndrntwrk',
  '/apps/desktop/src/main/ @rndrntwrk',
  '/.github/workflows/ @rndrntwrk',
  '/SECURITY.md @rndrntwrk',
]) {
  if (!text.includes(required)) throw new Error(`Missing CODEOWNERS rule: ${required}`);
}
NODE
```

Expected before implementation: FAIL on the first missing RNDRNTWRK rule.

- [ ] **Step 2: Replace `.github/CODEOWNERS`.**

Use exactly:

```text
* @rndrntwrk
/packages/core/ @rndrntwrk
/packages/connectors/ @rndrntwrk
/packages/agents/ @rndrntwrk
/packages/mcp/ @rndrntwrk
/apps/desktop/src/main/ @rndrntwrk
/.github/workflows/ @rndrntwrk
/scripts/ @rndrntwrk
/SECURITY.md @rndrntwrk
```

- [ ] **Step 3: Re-run the ownership assertion.**

Expected: PASS with no output.

- [ ] **Step 4: Commit.**

```bash
git add .github/CODEOWNERS
git commit -m "chore: assign RNDRNTWRK code ownership"
```

---

### Task 2: Document the fork and upstream synchronization policy

**Files:**
- Create: `docs/UPSTREAM_SYNC.md`
- Create: `docs/RNDRNTWRK_FORK_POLICY.md`
- Modify: `CONTRIBUTING.md`
- Modify: `README.md`
- Test: documentation link check through `pnpm verify`

**Interfaces:**
- Consumes: upstream repository `lalalune/outreachr` and fork `rndrntwrk/outreachr`.
- Produces: a deterministic process for upstream intake and a boundary between generic contributions and RNDRNTWRK-specific modules.

- [ ] **Step 1: Write `docs/UPSTREAM_SYNC.md`.**

The document must contain this exact operational flow:

```bash
git remote add upstream https://github.com/lalalune/outreachr.git
git fetch upstream --prune
git checkout -b sync/upstream-YYYY-MM-DD origin/main
git merge --no-ff upstream/main
git push -u origin sync/upstream-YYYY-MM-DD
```

It must also require:

```text
1. Open a pull request from sync/upstream-YYYY-MM-DD to main.
2. Review migrations, connector scopes, agent capabilities, MCP tools, release scripts, and data-rights changes.
3. Run the complete fork CI matrix.
4. Resolve conflicts without weakening RNDRNTWRK security invariants.
5. Squash-merge only after required checks pass.
6. Record the upstream source SHA in the pull-request body.
```

- [ ] **Step 2: Write `docs/RNDRNTWRK_FORK_POLICY.md`.**

Define three change classes:

```text
UPSTREAM-CANDIDATE
Generic bug fixes, accessibility, safety, tests, and reusable improvements.

RNDRNTWRK-MODULE
Ventures, opportunity Atlas, Hackathon Studio, RNDRNTWRK CTRL adapters, and product taxonomy.

PRIVATE-ONLY
Contacts, warm paths, private opportunity packages, application answers, diligence, credentials, and vault backups.
```

Require RNDRNTWRK modules to remain isolated behind new domain files and typed interfaces instead of rewriting unrelated upstream code.

- [ ] **Step 3: Link both policies from `CONTRIBUTING.md` and `README.md`.**

Add a `RNDRNTWRK fork development` subsection with relative links.

- [ ] **Step 4: Run documentation and build checks.**

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add docs/UPSTREAM_SYNC.md docs/RNDRNTWRK_FORK_POLICY.md CONTRIBUTING.md README.md
git commit -m "docs: define fork and upstream sync policy"
```

---

### Task 3: Configure a private RNDRNTWRK security reporting route

**Files:**
- Modify: `SECURITY.md`
- Test: `pnpm verify`

**Interfaces:**
- Consumes: GitHub private vulnerability reporting.
- Produces: a fork-specific security reporting policy that does not direct reporters only to upstream.

- [ ] **Step 1: Update the opening policy.**

Replace the temporary upstream-oriented text with:

```markdown
Use GitHub private vulnerability reporting on `rndrntwrk/outreachr` for issues that could expose credentials, private fundraising or application data, bypass founder approval, alter the audit chain, or cause an external action. Do not open a public issue for those reports.
```

- [ ] **Step 2: Add fork support boundaries.**

State that RNDRNTWRK supports the latest tagged fork release and the current `main`, and that upstream-only releases are not RNDRNTWRK releases.

- [ ] **Step 3: Enable private vulnerability reporting in repository settings.**

Repository path:

```text
Settings → Security → Private vulnerability reporting → Enable
```

Expected: the Security tab exposes a private advisory submission route.

- [ ] **Step 4: Run verification.**

```bash
pnpm verify
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add SECURITY.md
git commit -m "docs: configure RNDRNTWRK security reporting"
```

---

### Task 4: Make fork verification visibly independent

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/codeql.yml`
- Modify: `README.md`
- Test: GitHub Actions on the fork

**Interfaces:**
- Consumes: existing native verification, quality/security, CodeQL, attestation, SBOM, provenance, and checksum workflows.
- Produces: workflow runs and badges that point to `rndrntwrk/outreachr`, plus a fork-baseline verification summary.

- [ ] **Step 1: Add a fork identity assertion to `verify.yml`.**

Insert after checkout in both `native-verify` and `quality-security`:

```yaml
      - name: Assert RNDRNTWRK fork identity
        run: node -e "if (process.env.GITHUB_REPOSITORY !== 'rndrntwrk/outreachr') process.exit(1)"
```

This deliberately prevents RNDRNTWRK release workflows from being mistaken for upstream release evidence.

- [ ] **Step 2: Update README badges.**

Use:

```markdown
[![CI](https://github.com/rndrntwrk/outreachr/actions/workflows/verify.yml/badge.svg)](https://github.com/rndrntwrk/outreachr/actions/workflows/verify.yml)
[![CodeQL](https://github.com/rndrntwrk/outreachr/actions/workflows/codeql.yml/badge.svg)](https://github.com/rndrntwrk/outreachr/actions/workflows/codeql.yml)
```

Retain upstream attribution elsewhere in the README.

- [ ] **Step 3: Push the branch and observe both workflows.**

```bash
git push -u origin chore/fork-governance
```

Expected:

```text
Verify native desktop builds: success
CodeQL: success
All six target-native jobs: success
Quality and security: success
Attest verified builds: success on push
```

- [ ] **Step 4: Commit.**

```bash
git add .github/workflows/verify.yml .github/workflows/codeql.yml README.md
git commit -m "ci: establish independent fork verification"
```

---

### Task 5: Protect `main` and enable repository operations

**Files:**
- Repository settings only
- Verify: GitHub branch and repository settings

**Interfaces:**
- Consumes: successful fork workflows from Task 4.
- Produces: protected `main`, enabled Issues/Projects/Actions, and no direct unreviewed pushes.

- [ ] **Step 1: Enable repository features.**

Set:

```text
Actions: enabled
Issues: enabled
Projects: enabled
Discussions: optional, disabled for the first release
Private vulnerability reporting: enabled
Automatically delete head branches: enabled
```

- [ ] **Step 2: Add a `main` ruleset.**

Require:

```text
Pull request before merge
1 approving review
Dismiss stale approvals
Require CODEOWNERS review
Require conversation resolution
Block force pushes
Block deletions
Require linear history
Require signed commits where GitHub can verify them
```

- [ ] **Step 3: Require status checks.**

Select the exact check names emitted by the fork after Task 4, including:

```text
All native targets
Quality and security
CodeQL
```

If GitHub exposes each matrix job individually, require the aggregate `All native targets` gate rather than six duplicated matrix entries.

- [ ] **Step 4: Verify protection.**

Attempt a direct test push from a disposable branch ref to `main` without a PR. Expected: rejected by the ruleset.

- [ ] **Step 5: Record settings in `docs/RNDRNTWRK_FORK_POLICY.md`.**

Add a checklist mirroring the active ruleset so a future owner can audit drift.

---

### Task 6: Retire the stale branch and create a baseline release

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `.github/RELEASE_CHECKLIST.md`
- Create: `docs/releases/rndrntwrk-outreachr-v0.1.2-baseline.md`
- Test: release workflow and artifact verification

**Interfaces:**
- Consumes: protected fork and passing CI.
- Produces: one fork-owned release with explicit upstream source SHA and trust disclosures.

- [ ] **Step 1: Delete or archive `feature/claude-subscription-local-signing`.**

The branch is behind current `main` and must not be merged. Delete it after confirming its relevant work already exists upstream.

```bash
git push origin --delete feature/claude-subscription-local-signing
```

Expected: branch no longer appears in the active branch list.

- [ ] **Step 2: Add the baseline changelog entry.**

Use:

```markdown
## RNDRNTWRK baseline - 2026-08-15

- Fork baseline from upstream commit `8340cfbcf197d5aa38fcd9766cba7af2f43f030d`.
- Added RNDRNTWRK governance, ownership, security, and upstream-sync policy.
- No RNDRNTWRK opportunity-domain behavior is included in this baseline.
```

- [ ] **Step 3: Run the release checklist locally.**

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm test:e2e
pnpm licenses
node scripts/validate-legal-notices.mjs
```

Expected: PASS.

- [ ] **Step 4: Tag and push.**

```bash
git tag -a rndrntwrk-outreachr-v0.1.2-baseline -m "RNDRNTWRK Outreachr baseline"
git push origin rndrntwrk-outreachr-v0.1.2-baseline
```

- [ ] **Step 5: Verify release artifacts.**

For each native target, verify:

```text
package artifact exists
SHA256SUMS verifies
SBOM exists
provenance exists
GitHub attestation exists
signing/trust status is explicit
packaged app smoke test passed
```

- [ ] **Step 6: Commit the release record.**

```bash
git add CHANGELOG.md .github/RELEASE_CHECKLIST.md docs/releases/rndrntwrk-outreachr-v0.1.2-baseline.md
git commit -m "docs: record RNDRNTWRK baseline release"
```

---

## Phase 0 Verification Gate

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

Expected: every command passes.

Verify on GitHub:

```text
main protected
fork Actions history present
fork CodeQL history present
private vulnerability reporting enabled
stale branch removed
baseline tag present
six native artifacts present
checksums, SBOM, provenance, and attestations present
```

## Phase 0 Definition of Done

- `main` is protected and direct unreviewed pushes are blocked.
- CODEOWNERS names `@rndrntwrk` for all security-sensitive surfaces.
- The fork documents upstream sync and RNDRNTWRK/private change boundaries.
- The fork has its own successful CI and CodeQL history.
- Private vulnerability reporting is enabled on the fork.
- The stale feature branch is removed rather than merged.
- A fork-owned baseline release identifies the exact upstream source commit.
- No product-domain schema or behavior changes are introduced during this phase.
