# Phase 1: SW4P Capital Mandate Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify the existing Outreachr product by operating one real, founder-controlled SW4P pre-seed mandate before expanding the schema.

**Architecture:** Use a new private local vault and the current investor, knowledge, task, meeting, outreach, agent, backup, and audit features exactly as shipped. Store only public or synthetic fixtures in GitHub; the founder’s contacts, applications, notes, and vault remain outside the repository.

**Tech Stack:** Existing Outreachr v0.1.2 desktop app, SQL.js SQLite vault, Gmail or Outlook optional connector, Google or Microsoft Calendar optional connector, Codex or Claude proposal-only agent, encrypted backup.

## Global Constraints

- This phase changes documentation and tests only; it does not add opportunity-domain tables.
- Use one legal story: SW4P as programmable internet-native settlement for applications.
- Do not load RNDRNTWRK parent, 555stream, Arcade, Ads, or $555 as competing company narratives inside the mandate.
- No real outbound message is sent until a synthetic end-to-end send has passed.
- One unsolicited initial per canonical person remains enforced.
- No private vault, contact, note, application answer, or diligence artifact is committed.
- Current implementation evidence is framed as technical proof and design-partner readiness, not launched-user traction.

---

### Task 1: Add a private-vault qualification runbook

**Files:**
- Create: `docs/runbooks/private-vault-qualification.md`
- Modify: `docs/user-guide.md`
- Test: manual checklist plus `pnpm verify`

**Interfaces:**
- Consumes: the current onboarding, backup, connector, agent, contribution export, and reset flows.
- Produces: a repeatable qualification procedure for every future real founder vault.

- [ ] **Step 1: Write the runbook with the required environment.**

Specify:

```text
Device: founder-controlled macOS, Windows, or Linux account
Vault: new local workspace, not a copied demo vault
Secrets: operating-system credential facility available
Backup: separate founder-controlled directory
Mail: optional founder-owned Google or Microsoft account
Calendar: optional founder-owned Google or Microsoft account
Agent: Codex or Claude, optional and proposal-only
```

- [ ] **Step 2: Add the first-launch checklist.**

The checklist must require:

```text
[ ] founder identity and SW4P company identity entered
[ ] pre-seed round configured
[ ] postal address and opt-out text reviewed
[ ] current investor seed digest visible
[ ] encrypted backup created before connector setup
[ ] audit chain reports healthy
[ ] local vault path recorded privately
```

- [ ] **Step 3: Add the destructive recovery test.**

Use a synthetic vault, not the founder’s live vault:

```text
1. Create encrypted backup.
2. Add a synthetic investor, task, meeting, and draft.
3. Restore the earlier backup.
4. Verify the synthetic records are absent.
5. Verify schema integrity, foreign keys, and audit chain.
```

- [ ] **Step 4: Link the runbook from `docs/user-guide.md`.**
- [ ] **Step 5: Run documentation checks.**

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add docs/runbooks/private-vault-qualification.md docs/user-guide.md
git commit -m "docs: add private vault qualification runbook"
```

---

### Task 2: Define the SW4P mandate source-of-truth package

**Files:**
- Create: `docs/runbooks/sw4p-capital-mandate.md`
- Create: `docs/fixtures/sw4p-capital-knowledge.example.json`
- Test: JSON parse and content-policy assertion

**Interfaces:**
- Consumes: the approved SW4P category and current product evidence.
- Produces: knowledge blocks that may be copied into a private vault without mixing company narratives.

- [ ] **Step 1: Write the mandate identity.**

Use exactly:

```text
Company: SW4P
Category: Programmable internet-native settlement
Stage: Pre-seed
Primary customer: Applications that move value across EVM and Solana
Core outcome: One settlement instruction becomes a gas-aware, fee-correct, provable and reconcilable result
Initial use cases: creator platforms, wallets, marketplaces, treasury tools, community applications and agent workflows
```

- [ ] **Step 2: Add the 50-word description.**

```text
SW4P gives applications one interface to execute settlement across EVM and Solana. A product specifies the receiver, asset, destination, fee and gas policy; SW4P handles routing, execution state, finality, failure recovery, proof and reconciliation. More rails are added when customer settlement demand justifies them.
```

- [ ] **Step 3: Add the 100-word description.**

```text
SW4P is programmable internet-native settlement for applications. A product submits an instruction such as: deliver 250 USDC on Solana, collect the application fee, apply the approved gas policy and return proof. SW4P coordinates route choice, execution state, finality, failure recovery, webhooks and reconciliation across EVM and Solana. Creator platforms, wallets, marketplaces, treasury tools, community applications and agent workflows use one product interface instead of rebuilding settlement operations for every rail. SW4P is seeking design partners, ecosystem grants and pre-seed investors who care about correctness, developer experience and stablecoin settlement.
```

- [ ] **Step 4: Add the claims boundary.**

The runbook must separate:

```text
Implemented or evidenced
Current source repositories, test results, route proofs, SDK/API surfaces and founder-provided product truth.

Planned
Additional chains, partner-led fiat endpoints, broader production availability and customer-specific integrations.

Prohibited
Guaranteed coverage, guaranteed transaction success, guaranteed token performance, guaranteed liquidity, or unsupported live-route claims.
```

- [ ] **Step 5: Create the public example JSON.**

Use this schema:

```json
{
  "company": "SW4P",
  "stage": "pre_seed",
  "knowledge": [
    {
      "title": "SW4P category",
      "category": "company",
      "sharePolicy": "safe_for_outreach",
      "content": "SW4P is programmable internet-native settlement for applications."
    },
    {
      "title": "SW4P evidence boundary",
      "category": "disclosure",
      "sharePolicy": "internal",
      "content": "Use reproducible route proofs, tests and dated implementation evidence. Do not present planned rails as currently live."
    }
  ]
}
```

- [ ] **Step 6: Write and run the fixture assertion.**

```bash
node - <<'NODE'
const data = require('./docs/fixtures/sw4p-capital-knowledge.example.json');
if (data.company !== 'SW4P') throw new Error('Wrong company');
if (data.knowledge.some((item) => /555stream|Arcade|RNDRNTWRK Ads|\$555/u.test(item.content))) {
  throw new Error('Mixed parent/product narrative');
}
NODE
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add docs/runbooks/sw4p-capital-mandate.md docs/fixtures/sw4p-capital-knowledge.example.json
git commit -m "docs: define SW4P capital mandate"
```

---

### Task 3: Load a focused private investor set

**Files:**
- Private local vault only
- Reference: `docs/runbooks/sw4p-capital-mandate.md`
- Verify: Outreachr UI and local audit log

**Interfaces:**
- Consumes: current bundled investor seed plus founder-reviewed public research.
- Produces: one active SW4P target list with no unrelated product narratives.

- [ ] **Step 1: Create private lists.**

Create:

```text
SW4P / Apply now
SW4P / Warm introduction
SW4P / Stablecoin and payments
SW4P / Crypto infrastructure
SW4P / Developer infrastructure
SW4P / Ecosystem capital
SW4P / Conflict review
```

- [ ] **Step 2: Add the first target cohort.**

Include only founder-reviewed targets relevant to settlement, payments, stablecoins, developer infrastructure, EVM, or Solana. The initial cohort should contain 25–50 firms, not the entire 151-target atlas.

- [ ] **Step 3: Record one next action for every targeted firm.**

Each action must be concrete:

```text
Request introduction from [known person]
Review partner X portfolio conflict
Complete formal application
Prepare settlement architecture note
Send approved initial after source review
Do not contact until route proof is current
```

- [ ] **Step 4: Verify no target has an empty next action.**

Use the UI filter or private CSV export. Expected: every target in `SW4P / Apply now` has a next action and date.

---

### Task 4: Qualify agent proposals without external authority

**Files:**
- Modify: `apps/desktop/test/integration/mcp-service.test.ts`
- Modify: `apps/desktop/test/renderer/agent-page.test.tsx`
- Test: existing MCP and agent suites

**Interfaces:**
- Consumes: existing investor/round/company/activity context classes.
- Produces: regression evidence that the current agent can prepare SW4P fundraising work but cannot send or mutate external systems.

- [ ] **Step 1: Write the failing integration test.**

Add a test that starts an authorized agent/MCP session with `company`, `round`, and one selected investor, then requests a draft proposal. Assert:

```ts
expect(proposal.status).toBe('pending');
expect(proposal.kind).toBe('draft');
expect(proposal.payload).toMatchObject({ personId: selectedPersonId });
```

Also call a nonexistent send tool and assert MCP returns method/tool-not-found.

- [ ] **Step 2: Run the targeted test and confirm current behavior.**

```bash
pnpm --filter @outreachr/desktop test:integration -- mcp-service.test.ts
```

Expected: existing proposal-only behavior passes. If the new test reveals a fixture gap, update the fixture only; do not add send capability.

- [ ] **Step 3: Add the renderer review test.**

Render the pending draft proposal and assert the founder sees `Apply`, `Reject`, and `Convert to task`, with no `Send` control inside the agent proposal component.

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/desktop test -- agent-page.test.tsx
pnpm --filter @outreachr/desktop test:integration -- mcp-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/desktop/test/integration/mcp-service.test.ts apps/desktop/test/renderer/agent-page.test.tsx
git commit -m "test: qualify proposal-only fundraising agents"
```

---

### Task 5: Run a synthetic outreach and meeting lifecycle

**Files:**
- Private synthetic vault
- Test: `apps/desktop/test/integration/connector-service.test.ts`
- Test: `apps/desktop/test/renderer/command-flows.test.tsx`

**Interfaces:**
- Consumes: configured test connector or connector test seam.
- Produces: proof that a founder can move from research to approved initial, reply observation, meeting, and diligence task without unattended sequences.

- [ ] **Step 1: Create a synthetic investor and person.**

Use a `.example` address and mark it private. Do not use a real recipient.

- [ ] **Step 2: Draft the synthetic initial.**

The body must contain the exact configured postal address and opt-out text. Approve the exact recipient, sender, subject, body and empty attachment set.

- [ ] **Step 3: Send through the connector test seam.**

Expected:

```text
one durable reservation
one provider attempt
definitive synthetic receipt or terminal ambiguous state
no automatic retry
```

- [ ] **Step 4: Attempt a second initial.**

Expected: blocked by canonical-person and normalized-address invariants.

- [ ] **Step 5: Import a synthetic reply and create a meeting.**

Record an agenda, meeting notes and one diligence task.

- [ ] **Step 6: Run connector tests.**

```bash
pnpm --filter @outreachr/desktop test:integration -- connector-service.test.ts
pnpm --filter @outreachr/desktop test -- command-flows.test.tsx
```

Expected: PASS.

---

### Task 6: Verify backup, restore, contribution privacy and reset

**Files:**
- Modify: `packages/core/test/core.test.ts`
- Modify: `apps/desktop/test/integration/vault-service.test.ts`
- Test: core and desktop integration suites

**Interfaces:**
- Consumes: synthetic qualification vault.
- Produces: proof that real founder use does not weaken backup, import, audit or contribution boundaries.

- [ ] **Step 1: Add a qualification fixture to the core test.**

The fixture must contain:

```text
founder
round
one investor target
one private contact
one draft and approval
one meeting
one task
one internal knowledge item
one audit event
```

- [ ] **Step 2: Write the encrypted round-trip test.**

```ts
const backup = await createEncryptedBackup(vault.export(), 'correct horse battery staple');
const restoredBytes = await restoreEncryptedBackup(backup, 'correct horse battery staple');
const restored = await openNodeVault({ bytes: restoredBytes });
expect(restored.scalar('PRAGMA integrity_check')).toBe('ok');
expect(Number(restored.scalar('PRAGMA foreign_key_check'))).toBe(0);
```

Adapt the final assertion to the repository’s actual `CoreVault` helpers; do not replace integrity verification with snapshot equality alone.

- [ ] **Step 3: Verify contribution exclusion.**

Export a contribution and assert it contains none of:

```text
rounds
targets
messages
approvals
send_ledger
meetings
tasks
notes
knowledge_items
connector_configs
agent_runs
agent_proposals
audit_log
```

- [ ] **Step 4: Run tests.**

```bash
pnpm --filter @outreachr/core test
pnpm --filter @outreachr/desktop test:integration -- vault-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/core/test/core.test.ts apps/desktop/test/integration/vault-service.test.ts
git commit -m "test: qualify a private SW4P capital vault"
```

---

### Task 7: Record the qualification outcome

**Files:**
- Modify: `docs/runbooks/sw4p-capital-mandate.md`
- Create: `docs/qualification/sw4p-capital-mandate-result.md`
- Test: no private data or live contact identifiers in the committed result

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: a public-safe engineering qualification record and exact domain gaps for Phase 2 onward.

- [ ] **Step 1: Use this result structure.**

```markdown
# SW4P Capital Mandate Qualification Result

## Environment
App version, operating system and baseline commit only.

## Passed
Vault, backup/restore, investor targeting, exact approval, agent proposal, meeting and contribution boundaries.

## Workflow gaps
Usability problems that do not require a new domain model.

## Domain gaps
Legal entity, venture, narrative version, canonical demo, capital mandate, opportunity, application and hackathon records.

## Security invariants retained
Proposal-only agents, one initial, suppressions, local vault, encrypted secrets, audit chain.

## Decision
Proceed or stop before Phase 2.
```

- [ ] **Step 2: Scan for private data.**

```bash
node - <<'NODE'
const fs = require('node:fs');
const text = fs.readFileSync('docs/qualification/sw4p-capital-mandate-result.md', 'utf8');
for (const forbidden of ['@gmail.com', '@outlook.com', 'warm intro from', 'private note:', 'vault path:']) {
  if (text.toLowerCase().includes(forbidden)) throw new Error(`Private marker found: ${forbidden}`);
}
NODE
```

Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add docs/runbooks/sw4p-capital-mandate.md docs/qualification/sw4p-capital-mandate-result.md
git commit -m "docs: record SW4P mandate qualification"
```

---

## Phase 1 Verification Gate

Run:

```bash
pnpm verify
pnpm test:e2e
```

Expected: PASS.

Private founder checklist:

```text
[ ] focused SW4P target list exists
[ ] every active target has a next action
[ ] current narrative is stored with disclosure policies
[ ] one synthetic initial lifecycle passed
[ ] a second initial was blocked
[ ] one agent draft remained pending until founder action
[ ] encrypted backup and restore passed
[ ] contribution export contained no private workflow state
[ ] no unrelated RNDRNTWRK product narrative contaminated the mandate
```

## Phase 1 Definition of Done

- One real SW4P capital mandate is usable on the current application.
- The founder has a private focused pipeline and evidence-backed narrative.
- Existing communication and agent safety boundaries are verified.
- Backup, restore and contribution privacy pass on a representative vault.
- Public qualification records contain no private contacts or relationship data.
- All remaining blockers are classified as Phase 2–7 domain work rather than vague product dissatisfaction.
