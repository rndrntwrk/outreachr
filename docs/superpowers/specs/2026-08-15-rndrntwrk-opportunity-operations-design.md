# RNDRNTWRK Opportunity Operations for Outreachr

**Date:** 2026-08-15  
**Status:** Approved design, pending implementation plan  
**Repository:** `rndrntwrk/outreachr`

## 1. Purpose

Extend Outreachr from a local-first investor fundraising workspace into RNDRNTWRK's private execution system for capital, accelerator, grant, hackathon, cloud-credit, sponsor, strategic-partner, and design-partner work.

The extension must preserve Outreachr's strongest properties:

- one founder-owned local SQLite authority;
- exact, evidence-backed public research;
- founder review for consequential actions;
- proposal-only agents;
- append-only audit history;
- encrypted backups;
- no unattended outreach;
- no private workspace data in the public repository.

The Opportunity Atlas remains the broad public intelligence system. Outreachr stores only reviewed opportunities selected for active work and the private relationships, applications, meetings, answers, diligence, and receipts created around them.

## 2. Scope

### In scope

1. Fork governance and a reproducible RNDRNTWRK baseline release.
2. Operational qualification of the unmodified application with one SW4P capital mandate.
3. Explicit separation of legal entities, ventures, product narratives, and capital mandates.
4. First-class opportunity and application records beyond investors.
5. Deterministic, source-aware import from the RNDRNTWRK Opportunity Atlas.
6. Application assets, answers, milestones, events, receipts, deadlines, and review state.
7. New desktop views and commands for ventures, opportunities, and applications.
8. Proposal-only Alice/RNDRNTWRK CTRL access through local MCP.
9. Migration, backup, privacy, audit, accessibility, native-build, and end-to-end coverage.

### Out of scope

- cloud-hosting the canonical private vault;
- multi-user or real-time vault synchronization;
- bulk email or unattended sequences;
- agent-controlled email sending;
- automated application-portal submission;
- automatic acceptance of terms, signatures, SAFEs, grants, or investment documents;
- storing private investor or application data in GitHub;
- a visual redesign of Outreachr;
- replacing GitHub as the source, review, and engineering evidence system;
- replacing the Opportunity Atlas as the public discovery and scoring system.

## 3. System boundaries

```text
Opportunity Atlas
public opportunities, deadlines, scoring, source freshness
        |
        | reviewed, digest-pinned package
        v
Outreachr local vault
ventures, contacts, applications, meetings, answers, diligence, receipts
        ^
        | bounded reads and pending proposals only
        v
Alice + RNDRNTWRK CTRL
research, prioritization, drafting, task and next-action proposals
        |
        | founder-approved ordinary commands
        v
Email, calendar, application portals, GitHub evidence and partner actions
```

### Authority ownership

| Authority | Canonical owner |
|---|---|
| Public opportunity research and scoring | Opportunity Atlas |
| Private contacts and relationship state | Outreachr local vault |
| Legal entity and capital-mandate selection | Outreachr local vault |
| Application answers, notes, diligence, and receipts | Outreachr local vault |
| Source code, branches, tests, and build artifacts | GitHub |
| Agent execution policy, model budget, and operational trace | RNDRNTWRK CTRL |
| Email and calendar credentials | Operating-system credential store through Outreachr |
| External send or application submission | Founder-controlled provider or portal action |

## 4. Design principles

1. **One legal story per mandate.** A product narrative may differ from the parent narrative, but every capital or accelerator application must resolve to one legal entity and one cap-table identity.
2. **Products are not automatically entities.** SW4P, SW4P Earn, Alice, 555stream, 555 Arcade, RNDRNTWRK Ads, and RNDRNTWRK CTRL can have distinct narratives without implying distinct companies.
3. **Public intelligence and private execution remain separate.** Importing an opportunity never creates outreach, a draft, or an application automatically.
4. **Agents propose; founders apply.** Alice may research, rank, draft, summarize, and create pending proposals. She may not send, submit, sign, accept terms, or disclose unselected records.
5. **Evidence travels with the decision.** Every opportunity, application answer, deadline, conflict, and external claim retains source, freshness, confidence, and review state where applicable.
6. **Backward compatibility first.** Existing single-round investor workflows and current v9 vaults continue to open and work after every migration.
7. **Upstream-friendly isolation.** Generic Outreachr improvements remain separable from RNDRNTWRK-specific domain modules, data packages, and terminology.
8. **No hidden collaboration model.** The first release remains a single-owner local vault. Team work happens through GitHub and non-secret task/evidence systems.

## 5. Domain model

The storage changes are split into migrations so each domain can be tested and released independently.

### 5.1 Migration v10: legal entity, venture, narrative, and mandate

#### `legal_entities`

Represents the company or other legal body whose cap table, contracts, and external representations govern a mandate.

Required fields:

- `id`
- `name`
- `jurisdiction`
- `entity_type`
- `registration_reference` nullable
- `status`
- `created_at`
- `updated_at`

Private by default and never contribution-eligible.

#### `ventures`

Represents an operating product or parent platform.

Required fields:

- `id`
- `legal_entity_id`
- `name`
- `slug`
- `category`
- `one_liner`
- `stage`
- `status`
- `created_at`
- `updated_at`

Initial records may include RNDRNTWRK, SW4P, SW4P Earn, Alice/Milady, 555stream, 555 Arcade, RNDRNTWRK Ads, and RNDRNTWRK CTRL.

#### `narrative_profiles`

Versioned public or private positioning for a venture and use case.

Required fields:

- `id`
- `venture_id`
- `name`
- `version`
- `audience`
- `one_liner`
- `short_description`
- `long_description`
- `problem`
- `solution`
- `why_now`
- `traction_evidence`
- `disclosure_policy`
- `content_sha256`
- `active`
- `created_at`
- `updated_at`

No application refers to mutable narrative text directly. It records the narrative profile and content hash used for the application.

#### `capital_mandates`

Represents one raise, accelerator capital process, grant strategy, or other capital objective.

Required fields:

- `id`
- `legal_entity_id`
- `lead_venture_id`
- `name`
- `mandate_type`
- `stage`
- `target_amount_usd` nullable
- `minimum_check_usd` nullable
- `maximum_check_usd` nullable
- `status`
- `opened_on` nullable
- `target_close_on` nullable
- `created_at`
- `updated_at`

Existing `rounds` receive a nullable `capital_mandate_id`. Migration creates one default legal entity, venture, narrative profile, and capital mandate from the existing founder and active round, then attaches the round. This preserves current application behavior while enabling later mandate selection.

#### `venture_assets`

Stores founder-controlled references, not copied external documents.

Required fields:

- `id`
- `venture_id`
- `asset_type`
- `label`
- `uri_or_path`
- `content_sha256` nullable
- `disclosure_policy`
- `version`
- `created_at`
- `updated_at`

### 5.2 Migration v11: organizations, opportunities, and applications

#### `organizations`

Represents a program organizer, ecosystem, company, foundation, university, conference, or government body. An optional unique `firm_id` links an organization to an existing investor firm without merging the two domains.

#### `opportunities`

One record represents one exact program cycle or current rolling program, not an abstract recurring brand.

Required fields:

- `id`
- `organizer_id`
- `kind`
- `name`
- `cycle_key`
- `canonical_url`
- `application_url` nullable
- `status`
- `open_at` nullable
- `deadline_at` nullable
- `start_at` nullable
- `end_at` nullable
- `format`
- `location` nullable
- `eligibility` nullable
- `terms` nullable
- `capital_or_prize` nullable
- `component_fit_json`
- `canonical_demo_id` nullable
- `weighted_score` nullable
- `source_freshness_at` nullable
- `origin`
- `created_at`
- `updated_at`

Opportunity kinds:

- investor
- accelerator
- grant
- hackathon
- startup_program
- cloud_credits
- strategic_partner
- sponsor
- design_partner

Opportunity status:

- discovered
- open
- upcoming
- rolling
- closed_recurring
- watchlist
- expired
- withdrawn

#### `opportunity_sources`

Links opportunities to the existing `sources` table and records source role, evidence granularity, review state, and observed timestamp.

#### `applications`

Joins one venture to one exact opportunity cycle.

Required fields:

- `id`
- `venture_id`
- `legal_entity_id`
- `capital_mandate_id` nullable
- `opportunity_id`
- `owner`
- `stage`
- `priority`
- `narrative_profile_id`
- `narrative_content_sha256`
- `demo_id` nullable
- `deadline_snapshot_at` nullable
- `next_action` nullable
- `next_action_at` nullable
- `submitted_at` nullable
- `decision_at` nullable
- `decision` nullable
- `created_at`
- `updated_at`

Unique constraint: one application for each `(venture_id, opportunity_id)`. Separate program cycles are separate opportunities.

Application stages:

- discovered
- qualified
- registered
- drafting
- internal_review
- submitted
- interview
- demo
- selected
- rejected
- completed
- withdrawn

A database constraint rejects applications whose venture and selected legal entity disagree.

#### `application_events`

Append-only history of stage changes, reviews, submissions, interviews, decisions, and receipt capture.

#### `application_answers`

Versioned answers linked to an application, with prompt, answer, share policy, source narrative hash, content hash, review state, and timestamps.

#### `application_assets`

Links an application to venture assets or application-specific references such as deck, demo video, repository, architecture, data room, budget, and founder video.

#### `application_receipts`

Records a manual external submission outcome:

- provider or portal
- external reference
- receipt URI or local path
- submitted timestamp
- application snapshot hash
- notes

The receipt does not cause or imply an automated submission.

#### `program_milestones`

Tracks grant, accelerator, hackathon, credit, or partner milestones with owner, due date, status, evidence reference, and completion timestamp.

### 5.3 Migration v12: reviewed import packages

#### `opportunity_imports`

Records package ID, version, logical digest, file digest, source count, opportunity count, rights status, imported timestamp, and review identity.

The importer is transactional and idempotent by package ID and digest. A package ID may never silently change to a different digest.

## 6. Atlas import contract

The Opportunity Atlas exports a reviewed SQLite or canonical JSON package plus a manifest.

Required package properties:

- schema version;
- package ID and version;
- logical SHA-256 digest;
- file SHA-256 digest;
- retrieval date;
- source and rights metadata;
- exact opportunity cycle identity;
- source URLs and observed dates;
- confidence and review state;
- no private relationship or contact history.

### Import workflow

1. Founder selects a package.
2. Outreachr validates file size, schema, manifest, digest, rights metadata, URLs, timestamps, and enums in isolation.
3. The app presents a human-readable diff: create, update, stale conflict, unchanged, and rejected rows.
4. Founder confirms the import.
5. Outreachr merges the package transactionally.
6. No application, target, draft, contact, task, or outreach action is created by import.
7. The audit chain records the package digest and result.

### Conflict policy

- Private founder edits are never overwritten by imported public research.
- A fresher reviewed source may update public opportunity fields.
- Conflicting deadlines are shown for review rather than silently resolved.
- Closed or expired opportunities remain in history.
- Duplicate detection uses explicit external IDs where available, then canonical URL plus cycle key. Name similarity alone is insufficient.

## 7. Desktop application changes

### Navigation

Add:

- Ventures
- Opportunities
- Applications

Preserve the existing investor, pipeline, outreach, meeting, knowledge, document, agent, review, and settings workspaces.

### Venture workspace

Shows legal entity, venture category, active narratives, assets, capital mandates, application count, and current evidence gaps.

### Opportunity workspace

Provides filters for type, status, deadline, component, demo, score, source freshness, and decision. It is a decision queue, not another decorative dashboard.

### Application workspace

Shows:

- opportunity and organizer;
- legal entity and venture;
- frozen narrative version;
- deadline snapshot;
- answers and review status;
- assets and evidence;
- milestones;
- meetings and contacts;
- events and receipts;
- next action.

### Review behavior

An application can enter `submitted` only after the founder records a manual receipt against a deterministic snapshot hash covering the selected narrative, reviewed answers, and selected assets. Editing those records after snapshot creation marks the application as changed-after-review and requires a new snapshot before another receipt can be recorded.

## 8. Commands and contracts

Add typed commands for:

- legal entity create/update;
- venture create/update;
- narrative create/version/activate;
- capital mandate create/update/select;
- opportunity get/qualify/watch/archive;
- application create/update/stage/next action;
- answer save/review;
- asset attach/detach;
- milestone create/update;
- submission snapshot create;
- receipt record;
- Atlas package preview/import.

Every new command crosses a Zod validation boundary and repeats invariant checks in SQLite or the repository layer.

## 9. Agent and MCP design

### New disclosure classes

- ventures
- opportunities
- applications

Each run selects explicit classes and expands them into exact record IDs. Private fields are omitted unless the founder grants the record and field.

### Read tools

- `outreachr_list_ventures`
- `outreachr_get_venture`
- `outreachr_search_opportunities`
- `outreachr_get_opportunity`
- `outreachr_list_applications`
- `outreachr_get_application`
- `outreachr_list_deadlines`

### Proposal tools

- `outreachr_propose_application`
- `outreachr_propose_application_stage`
- `outreachr_propose_application_task`
- `outreachr_propose_application_answer`
- `outreachr_propose_application_next_action`
- `outreachr_propose_source_review`

### Forbidden tools

The MCP server must reject and never advertise tools that:

- send email;
- submit an application;
- upload documents;
- sign or accept terms;
- create provider calendar events without the ordinary founder command path;
- expose credentials, raw SQL, arbitrary files, shell, or open-network access;
- apply their own proposal.

RNDRNTWRK CTRL may launch and budget the agent process, but Outreachr remains the authority for its local records, disclosure grants, proposals, approval state, communication ledger, and audit chain.

## 10. Security and privacy

1. Every new private table is excluded from contribution export by default because the exporter builds a new allowlisted database.
2. Contribution tests must prove that ventures, legal entities, capital mandates, applications, answers, assets, receipts, milestones, events, and imports cannot leak.
3. Encrypted backups include the new tables and pass integrity, foreign-key, and migration checks before replacement.
4. Production logs never contain application answers, receipt details, private asset paths, meeting notes, or disclosed agent context.
5. Imported packages are untrusted input and are parsed in isolation before transactional merge.
6. The current one-initial-send boundary remains unchanged during these phases.
7. Portal submission remains manual.
8. No new provider credential or cloud service is required for the opportunity domain.

## 11. Error handling

- Unsupported or newer schema: refuse import and preserve the current vault.
- Digest mismatch: refuse import and write no rows.
- Duplicate package ID with a new digest: refuse import.
- Invalid venture/legal-entity relationship: reject before persistence.
- Missing or stale narrative snapshot: block receipt recording.
- Deadline conflict: create a review item; do not silently overwrite.
- Agent authorization overreach: fail before tool dispatch and record an audit failure.
- Audit write failure: fail the operation closed.
- Backup restore failure: leave the current vault unchanged.
- Unknown application or opportunity status: reject at both Zod and SQLite boundaries.

## 12. Testing strategy

### Migration and repository tests

- Open representative v9 vaults and migrate to v10, v11, and v12.
- Reopen and verify all relationships and user versions.
- Verify default entity, venture, narrative, and mandate creation.
- Verify legal-entity mismatch constraints.
- Verify application and opportunity stage transitions.
- Verify append-only application events.
- Verify deterministic submission snapshot hashing.
- Verify Atlas import digest pinning, idempotency, diff, conflict handling, and rollback.

### Privacy and security tests

- Contribution export contains none of the new private tables or values.
- Backup and restore preserve new records and audit integrity.
- MCP discovery omits ungranted record classes and forbidden tools.
- Proposal results remain pending until founder review.
- Malformed, oversized, stale, or unauthorized responses fail closed.
- Existing email approval, deduplication, suppression, and ambiguous-send tests remain unchanged.

### Desktop tests

- Create and switch ventures and mandates.
- Import an Atlas package through preview and confirmation.
- Qualify an opportunity and create an application.
- Select and freeze a narrative.
- Draft and review answers.
- Attach assets and milestones.
- Record a manual receipt and verify snapshot state.
- Run an agent with selected application context and review a pending proposal.
- Complete keyboard, screen-reader, reduced-motion, zoom, and WCAG 2.2 AA checks.

### Release tests

Retain the existing six-target native matrix, complete verification gate, dependency audit, CodeQL, Electron fuse checks, packaged smoke tests, SBOM, checksums, provenance, and attestations.

## 13. Implementation phases and exit criteria

### Phase 0: fork governance

Deliver:

- protected `main`;
- required verification and CodeQL checks;
- enabled issues or project tracking;
- documented upstream-sync policy;
- stale branch disposition;
- fork-owned baseline release;
- private security-reporting route;
- CODEOWNERS for core, connectors, agents, MCP, and desktop.

Exit: the fork's exact baseline commit has its own passing CI evidence and reproducible release.

### Phase 1: operational qualification

Run one SW4P capital mandate in the existing product with synthetic or founder-approved data.

Qualify:

- target research and lists;
- knowledge disclosures;
- draft and exact approval;
- one safe synthetic provider send or mocked equivalent;
- meeting flow;
- Codex proposal and rejection;
- audit verification;
- encrypted backup and restore;
- contribution export privacy.

Exit: a signed qualification report records passes, failures, and required fixes before domain migration.

### Phase 2: venture domain

Implement migration v10, repositories, contracts, commands, bootstrap compatibility, UI, and tests.

Exit: existing v9 vaults migrate safely, current investor workflows remain usable, and multiple product narratives cannot cross legal-entity boundaries.

### Phase 3: opportunity and application domain

Implement migration v11, new workspaces, commands, review behavior, snapshots, receipts, milestones, and tests.

Exit: one opportunity can move from qualification through a manually receipted submission without being represented as an investor.

### Phase 4: Atlas import

Implement migration v12, package tooling, preview, conflict review, transactional merge, and tests.

Exit: a reviewed package imports deterministically, a repeated import is idempotent, and private state remains unchanged.

### Phase 5: Alice and RNDRNTWRK CTRL

Implement disclosure classes, MCP tools, proposal review, trace fields, CTRL launch metadata, and tests.

Exit: Alice can read selected venture/opportunity/application records and create pending proposals, but cannot send, submit, sign, upload, or access unselected data.

### Phase 6: integrated release

Run the full end-to-end scenario:

```text
Atlas opportunity
→ reviewed import
→ venture and legal-entity selection
→ application creation
→ agent-drafted answer
→ founder review
→ manual external submission
→ receipt capture
→ interview task
→ decision record
```

Exit: all native builds, security and privacy gates, accessibility checks, backup/restore, contribution privacy, and package provenance pass on the fork.

## 14. Branch and pull-request strategy

```text
main
  protected RNDRNTWRK release branch

chore/fork-governance
feat/venture-domain-v10
feat/opportunity-domain-v11
feat/atlas-import-v12
feat/application-ui
feat/opportunity-mcp
feat/rndrntwrk-ctrl-adapter
release/rndrntwrk-opportunity-operations
```

Each branch starts from an immutable base SHA, has one bounded responsibility, and closes through a pull request. Generic improvements should remain separable for potential upstream contribution.

## 15. Definition of done

The work is complete only when:

1. The fork has its own passing CI, CodeQL, and release history.
2. Existing v9 vaults migrate without data loss.
3. One legal entity can own several product narratives without implying several cap tables.
4. Opportunities and applications are first-class records.
5. Atlas import is reviewed, digest-pinned, idempotent, and source-aware.
6. Application answers, assets, milestones, events, and receipts are private and auditable.
7. Manual receipt capture binds to an exact reviewed application snapshot.
8. Alice and CTRL remain read/proposal-only through MCP.
9. Email sending remains founder-approved and initial-only.
10. Application submission remains manual.
11. Contribution export contains no new private records.
12. Encrypted backup and restore pass after every migration.
13. The full native verification and release pipeline succeeds on the fork.
14. The integrated end-to-end scenario passes in Electron E2E tests.
