# Founder-Operated Opportunity System Design

**Repository:** `rndrntwrk/outreachr`  
**Date:** 2026-08-15  
**Status:** Approved design, pending implementation plan  
**Primary operator:** Solo founder  

## 1. Executive decision

Outreachr will be extended from a local-first investor fundraising operating system into the founder's private execution system for capital, accelerators, grants, hackathons, ecosystem programs, sponsors, design partners, and strategic relationships.

The product remains single-user, local-first, evidence-first, and founder-controlled. Alice and other RNDRNTWRK agents extend the founder's capacity through bounded research and proposal workflows. They never acquire authority to send communication, submit an application, publish content, accept terms, spend money, sign an agreement, merge code, or mark evidence as verified.

Hackathons are a first-class operating lane. They are treated as time-bounded product, engineering, marketing, distribution, capital, and relationship campaigns. Their value is measured through reusable technical work, ecosystem integrations, prizes and grants, visibility, audience growth, sponsor relationships, investor access, product pilots, and downstream accelerator opportunities.

The resulting system has two primary workspaces that share common records and controls:

1. **Capital workspace** for investors, accelerators, grants, introductions, outreach, meetings, diligence, and commitments.
2. **Hackathon Studio** for discovery, qualification, product selection, build execution, submission, publishing, distribution, results, and conversion.

## 2. Goals

The system must let one founder operate a large opportunity portfolio without turning the application into a bulk-outreach tool, a generic team project manager, or a cloud-hosted CRM.

### 2.1 Capital goals

The founder must be able to:

- separate legal entities, ventures, product narratives, and capital mandates;
- maintain evidence-backed investor and program research;
- select the correct RNDRNTWRK product story for each opportunity;
- manage introductions, first outreach, meetings, diligence, expected checks, and decisions;
- preserve exact source provenance and freshness;
- keep private relationship history inside the local vault;
- use agents for research, prioritization, drafting, meeting preparation, and task proposals;
- retain founder approval for every external or consequential action.

### 2.2 Hackathon goals

The founder must be able to:

- track more than 100 current, upcoming, rolling, recurring, and watchlist hackathons;
- distinguish organizers, cycles, tracks, sponsors, bounties, rules, eligibility, judging criteria, and deadlines;
- evaluate several possible RNDRNTWRK component entries for one event;
- map each entry to a reusable canonical demo and the smallest honest ecosystem adapter;
- calculate effort, reuse, urgency, lock-in risk, capital upside, and distribution upside;
- create a founder-approved go/no-go decision;
- bind an entry to an immutable source baseline, branch, worktree, owner agent, evidence manifest, and submission artifact set;
- coordinate build-in-public content, 555stream programming, articles, clips, social posts, sponsor mentions, and launch materials;
- record submission receipts, results, prizes, credits, accelerator invitations, grants, partner conversations, and investor follow-up;
- measure the entry as an engineering and distribution campaign rather than only as a competition result;
- reuse the output across future hackathons, applications, pilots, and fundraising.

### 2.3 Agent goals

Alice and approved local agents must be able to:

- search and summarize authorized opportunities;
- compare product-component fit;
- propose a canonical demo and build delta;
- identify missing eligibility or evidence;
- draft application answers and outreach;
- propose build, publishing, and follow-up tasks;
- prepare judge, sponsor, accelerator, and investor briefs;
- summarize meetings and results;
- propose pipeline or application stage changes;
- produce a daily founder brief and weekly portfolio review.

Every agent operation must use selected context, bounded tools, typed proposals, audit records, and founder review.

## 3. Non-goals

The first implementation will not provide:

- multi-user accounts, team invitations, collaborative editing, or cloud synchronization;
- autonomous email, direct-message, social-post, or application-form submission;
- bulk outreach, drip sequences, unattended follow-ups, or volume-based growth automation;
- autonomous acceptance of accelerator, grant, hackathon, investment, or sponsor terms;
- a replacement for GitHub source control, code review, CI, or technical worktrees;
- a replacement for RNDRNTWRK CTRL's runtime governance and cost attribution;
- a public repository containing the founder's private opportunity, contact, application, or diligence data;
- a general company ERP;
- token price, investment-return, or guaranteed-outcome tracking.

## 4. Product and authority principles

### 4.1 One founder, many agents

The founder is the sole human authority. Agents prepare work, retain context, and make recommendations. The founder applies or rejects every proposal.

### 4.2 One legal story per mandate

A legal entity, venture, product narrative, and capital mandate are distinct records.

A product may lead an application without being a separate company. A separate company may own several product narratives. No external application may mix legal entity, cap-table, or product claims without an explicit founder-approved narrative profile.

### 4.3 Evidence travels with every decision

Every important public claim, eligibility rule, deadline, check range, prize, term, portfolio conflict, application route, or contact claim retains:

- source URL;
- publisher;
- observation date;
- confidence;
- freshness state;
- redistribution rights;
- review status.

Unknown information remains unknown.

### 4.4 External actions remain consequential

Sending, scheduling, publishing, submitting, sharing documents, accepting terms, and changing legal narratives require explicit review through an ordinary application command. No agent tool performs these actions.

### 4.5 Hackathons are product and distribution campaigns

Each selected hackathon entry produces two linked plans:

- a build plan;
- a distribution and conversion plan.

The entry is incomplete if it ships code without a submission and public proof package, or if it creates marketing without a reproducible technical artifact.

### 4.6 Private execution and public intelligence remain separate

The Opportunity Atlas holds broad public intelligence. Outreachr imports reviewed opportunities selected for private execution. The founder vault holds private contacts, decisions, drafts, meetings, application answers, and receipts.

## 5. System architecture

```text
Public opportunity sources
        ↓ research and review
Opportunity Atlas
        ↓ digest-pinned reviewed package
Outreachr local vault
        ↕ proposal-only local MCP
Alice / RNDRNTWRK CTRL
        ↓ founder approval
Outreach, calendar, portals, GitHub, publishing and partner actions
```

### 5.1 Opportunity Atlas

The Atlas remains the broad discovery and scoring layer for:

- hackathons;
- accelerators;
- grants;
- cloud-credit programs;
- startup programs;
- venture funds;
- ecosystem programs;
- sponsor and strategic opportunities.

It owns public opportunity intelligence, source freshness, scoring, product-component fit, and watchlists.

### 5.2 Outreachr

Outreachr is the sovereign private relationship and application record. It owns:

- venture and legal-entity context;
- capital mandates;
- selected opportunities;
- private contacts and warm paths;
- applications and submissions;
- outreach drafts and send receipts;
- meetings and diligence;
- founder decisions;
- private notes;
- document references;
- agent proposals;
- audit history.

### 5.3 RNDRNTWRK CTRL

RNDRNTWRK CTRL governs agent runtime concerns:

- execution identity;
- goal and task scope;
- tool policy;
- model selection;
- spend and cost attribution;
- release and deployment state;
- technical evidence manifests;
- recovery.

CTRL does not own the raw Outreachr vault, email credentials, private meeting notes, or diligence content. It interacts through bounded local MCP sessions.

### 5.4 GitHub

GitHub owns:

- source code;
- branches and worktrees;
- pull requests;
- review;
- CI;
- release artifacts;
- checksums;
- technical evidence.

Outreachr stores references and state, not a duplicate source repository.

## 6. Shared domain model

### 6.1 Legal entities

`legal_entities` defines the entity that signs, raises, applies, receives funds, or accepts terms.

Required fields:

- ID;
- legal name;
- display name;
- jurisdiction;
- entity type;
- status;
- incorporation reference;
- cap-table identity reference;
- founder authority;
- public website;
- created and updated timestamps.

### 6.2 Ventures

`ventures` defines an investable or submit-able product and strategy context.

Examples:

- RNDRNTWRK parent;
- SW4P;
- SW4P Earn / composable crypto economies;
- Alice / Milady;
- 555stream;
- 555 Arcade;
- RNDRNTWRK Ads;
- RNDRNTWRK Coordination Layer;
- RNDRNTWRK CTRL;
- $555 network economy.

Required fields:

- ID;
- legal entity ID;
- name;
- category;
- one-line utility;
- stage;
- status;
- current demo ID;
- default narrative profile ID;
- public URL;
- created and updated timestamps.

### 6.3 Narrative profiles

`narrative_profiles` stores immutable, versioned external stories.

Each profile includes:

- venture ID;
- legal entity ID;
- purpose: investor, accelerator, grant, hackathon, sponsor, partner, or media;
- 50-, 100-, and 250-word descriptions;
- problem;
- product wedge;
- why now;
- technical differentiation;
- evidence framing;
- business model;
- use of funds;
- claims boundary;
- approved deck and demo references;
- version;
- approval state;
- content digest;
- approved by and approved at.

An application stores the exact narrative profile version used. Later edits do not silently alter submitted history.

### 6.4 Canonical demos

`canonical_demos` stores reusable submission baselines.

Initial demos:

1. SW4P programmable settlement;
2. gas-abstracted creator payouts;
3. Alice governed MCP operator;
4. white-label community agent;
5. human-and-agent live studio;
6. RNDRNTWRK Coordination Layer;
7. 555 Arcade agent-native play;
8. SW4P Earn composable crypto economies;
9. RNDRNTWRK CTRL;
10. cross-community composable economy;
11. RNDRNTWRK Ads programmable sponsor experiences.

Fields include:

- demo ID;
- venture IDs;
- category;
- baseline repository;
- baseline commit SHA;
- branch convention;
- expected baseline hours;
- core assets;
- evidence requirements;
- approved claims;
- current version;
- status.

## 7. Capital workspace domain

The existing investor model remains, with ventures and mandates added above it.

### 7.1 Capital mandates

`capital_mandates` binds one legal entity and one venture narrative to a financing objective.

Fields include:

- legal entity ID;
- venture ID;
- narrative profile ID;
- stage;
- target amount;
- useful check range;
- instrument;
- token side-letter policy;
- geography;
- target close date;
- status;
- approved use of funds.

### 7.2 Investor targets

Existing firm, person, fund, source, contact, target, pipeline, meeting, task, knowledge, draft, approval, and send-ledger concepts remain.

Each target must link to one capital mandate. Pipeline economics must never combine expectations from separate legal entities or mandates.

### 7.3 Accelerator and grant applications

Accelerators and grants use the general application domain described below rather than being forced into investor pipeline stages. A program may also have related people and firms for relationship tracking.

## 8. General opportunity and application domain

### 8.1 Opportunities

`opportunities` represents an external path that may be pursued.

Opportunity types:

- investor;
- accelerator;
- grant;
- hackathon;
- startup program;
- cloud credits;
- strategic partner;
- sponsor;
- design partner.

Fields include:

- organizer organization ID;
- name;
- type;
- status: open, upcoming, rolling, closed recurring, watchlist, cancelled;
- URL and application URL;
- open date;
- deadline;
- start and end dates;
- format and location;
- eligibility summary;
- terms summary;
- capital or prize summary;
- source freshness;
- review state;
- imported package ID and digest.

### 8.2 Applications

`applications` joins a venture and narrative to an opportunity.

Application stages:

```text
discovered
qualified
registered
drafting
internal_review
submitted
interview
demo
selected
rejected
completed
withdrawn
```

Fields include:

- opportunity ID;
- legal entity ID;
- venture ID;
- narrative profile version;
- canonical demo version;
- founder decision;
- priority;
- deadline;
- owner: founder;
- next action;
- next action date;
- stage;
- submitted timestamp;
- receipt reference;
- decision and decision date;
- expected value type and amount;
- private notes.

### 8.3 Application answers

`application_answers` stores versioned responses to named questions. Each answer retains:

- question text;
- response text;
- source narrative profile;
- evidence references;
- disclosure policy;
- draft, approved, or submitted state;
- content digest;
- approved by and time.

### 8.4 Application assets

`application_assets` stores founder-controlled references to:

- decks;
- demo videos;
- repositories;
- architecture diagrams;
- budgets;
- data rooms;
- source registers;
- founder videos;
- screenshots;
- submission exports;
- receipts.

Outreachr stores a link or local reference and disclosure policy. It does not silently upload or share the asset.

## 9. Hackathon Studio domain

### 9.1 Hackathon cycles

A hackathon organizer may run recurring events. `hackathon_cycles` stores one exact cycle with its dates, rules, sponsors, and results.

Fields include:

- opportunity ID;
- cycle name;
- registration open and close dates;
- build start and end;
- submission deadline;
- judging period;
- demo day;
- result date;
- format and location;
- current state;
- rules source and retrieved date.

### 9.2 Tracks, sponsors, and bounties

`hackathon_tracks` stores named tracks and judging goals.

`hackathon_sponsors` stores participating organizations and relationship contacts.

`hackathon_bounties` stores:

- sponsor;
- track;
- title;
- amount and asset;
- required technology;
- eligibility;
- judging criteria;
- submission requirements;
- source;
- freshness;
- conflict or lock-in notes.

### 9.3 Eligibility rules

`hackathon_rules` stores structured constraints:

- geography;
- age;
- student status;
- company age;
- existing-code policy;
- team-size minimum and maximum;
- intellectual-property terms;
- open-source requirement;
- chain or sponsor technology requirement;
- in-person attendance requirement;
- prior funding limit;
- prohibited participants;
- submission language;
- required artifacts.

A rule evaluator generates a founder-reviewable eligibility result. Uncertain rules block automatic qualification and create a source-review task.

### 9.4 Hackathon entries

`hackathon_entries` represents one deliberate submission concept.

One hackathon cycle may have several candidate entries using different products. Only founder-approved entries become active builds.

Fields include:

- cycle ID;
- track and bounty IDs;
- legal entity ID;
- venture IDs;
- narrative profile version;
- canonical demo version;
- submission concept;
- user outcome;
- ecosystem adapter;
- estimated hours;
- reuse percentage;
- strategic fit;
- distribution upside;
- technical leverage;
- prize or capital upside;
- urgency;
- effort;
- lock-in risk;
- weighted score;
- go/no-go decision;
- founder rationale;
- state.

Entry states:

```text
candidate
approved
scoped
building
verification
submission_ready
submitted
judging
finalist
won
not_selected
withdrawn
converted
archived
```

### 9.5 Build records

`hackathon_builds` binds the approved entry to source control and evidence.

Fields include:

- repository;
- immutable base SHA;
- branch;
- worktree path reference;
- adapter path;
- build owner agent;
- approved tool policy;
- budget;
- start and stop conditions;
- current commit;
- CI state;
- security review state;
- evidence manifest digest;
- merge decision.

Outreachr does not edit the repository directly. It records proposed and verified state from GitHub and RNDRNTWRK CTRL.

### 9.6 Submission requirements and assets

`hackathon_submission_requirements` stores every required artifact and its status.

Examples:

- project name;
- description;
- repository;
- live URL;
- demo video;
- architecture image;
- presentation;
- team list;
- sponsor technology disclosure;
- open-source license;
- screenshots;
- test proof;
- submission form receipt.

`hackathon_submission_assets` references the exact artifact versions used.

### 9.7 Distribution plan

Each approved entry receives a `distribution_campaign` with stages:

```text
pre_build
build_in_public
submission_launch
judging
result
post_event_conversion
```

The plan may include:

- announcement;
- 555stream build session;
- creator collaboration;
- sponsor acknowledgement;
- technical article;
- short demo clips;
- X posts and thread;
- Arcade activation;
- community event;
- investor update;
- judge and sponsor follow-up;
- grant or accelerator follow-on;
- product release notes;
- design-partner invitation.

Each item is a draft or task. Publishing remains manual and founder-approved.

### 9.8 Results and conversion

`hackathon_results` records:

- submitted state;
- finalist state;
- ranking;
- prize or bounty;
- credits;
- accelerator invitation;
- grant invitation;
- sponsor feedback;
- judge feedback;
- public metrics;
- reusable technical outputs.

`conversion_events` records downstream outcomes:

- investor meeting;
- ecosystem introduction;
- grant application;
- accelerator application;
- pilot;
- user activation;
- partner integration;
- sponsor program;
- earned-media mention;
- future hackathon reuse.

## 10. Hackathon scoring and go/no-go

An entry may proceed only when the founder approves a scorecard.

Default weighted dimensions:

- strategic fit;
- reusable code percentage;
- product evidence created;
- capital or prize upside;
- ecosystem and partner access;
- marketing and distribution upside;
- technical leverage;
- credibility;
- deadline runway;
- engineering effort;
- platform lock-in;
- legal or claims risk.

Default go conditions:

- score at least 70;
- reuse at least 60 percent;
- estimated engineering work no more than 80 hours unless founder overrides;
- one canonical demo baseline;
- one named submission outcome;
- one approved distribution plan;
- no unresolved eligibility conflict;
- no dishonest platform-specific claim;
- no existential lock-in;
- a reproducible evidence plan.

Every override requires a founder rationale and audit record.

## 11. Hackathon success metrics

Winning is only one result class.

### 11.1 Engineering

- reusable adapters shipped;
- canonical demo improvements;
- tests and CI evidence;
- production delta;
- documentation;
- open-source artifacts;
- percentage reused by later entries.

### 11.2 Competition

- registered;
- submitted;
- finalist;
- sponsor bounty;
- prize;
- accelerator invitation;
- grant invitation.

### 11.3 Distribution

- 555stream viewers;
- demo views;
- article reads;
- social reach;
- repository traffic;
- sign-ups;
- Arcade participation;
- creator and community distribution.

### 11.4 Ecosystem and relationships

- sponsor engineer conversations;
- judge relationships;
- accelerator conversations;
- ecosystem support;
- partner introductions;
- investor meetings;
- creator relationships.

### 11.5 Product and capital

- pilots;
- integrations;
- users;
- design-partner commitments;
- grants;
- credits;
- prizes;
- investment processes;
- sponsor revenue.

### 11.6 Efficiency

- founder hours;
- agent and model cost;
- cash cost;
- engineering hours;
- reuse percentage;
- opportunities unlocked.

## 12. Founder experience

### 12.1 Morning brief

The home workspace shows the founder:

1. deadlines at risk;
2. decisions awaiting approval;
3. active agent proposals;
4. blocked builds;
5. applications awaiting review;
6. submissions ready for manual completion;
7. distribution assets awaiting approval;
8. relationships requiring follow-up;
9. reusable prior work matching new opportunities;
10. current capital, prize, grant, credit, and distribution outcomes.

### 12.2 Workspace navigation

Recommended top-level navigation:

- Up next;
- Ventures;
- Capital;
- Opportunities;
- Hackathon Studio;
- Applications;
- Relationships;
- Meetings;
- Knowledge;
- Documents;
- Agents;
- Review;
- Settings.

The interface follows Outreachr's existing evidence-first, calm, dense design system. It does not adopt a decorative RNDRNTWRK marketing treatment.

### 12.3 Decision-first views

Every opportunity or entry detail view presents:

- the next founder decision;
- supporting evidence;
- uncertainty and freshness;
- narrative and entity context;
- build and distribution impact;
- deadline;
- consequence of approval.

## 13. Agent and MCP boundary

### 13.1 Read tools

Add bounded read tools for:

- ventures;
- legal entities;
- narrative profiles;
- opportunities;
- hackathon cycles;
- tracks and bounties;
- applications;
- entries;
- deadlines;
- build status;
- submission requirements;
- distribution campaigns;
- results and conversion events.

### 13.2 Proposal tools

Add proposal-only tools for:

- targeting an opportunity;
- creating an application;
- selecting a venture and narrative;
- proposing an entry concept;
- proposing a canonical demo;
- proposing a go/no-go rationale;
- creating build tasks;
- drafting an application answer;
- drafting a submission description;
- drafting a distribution plan;
- proposing a follow-up task;
- proposing a stage change;
- proposing a source review.

### 13.3 Forbidden tools

No MCP or embedded agent tool may:

- send communication;
- submit forms;
- publish content;
- upload documents;
- accept terms;
- spend funds;
- sign agreements;
- merge branches;
- mark evidence verified;
- modify credentials;
- access raw SQL;
- execute arbitrary shell commands;
- read unselected private records.

### 13.4 Context model

New context classes:

- ventures;
- capital;
- opportunities;
- hackathons;
- applications;
- relationships;
- activity;
- documents;
- technical evidence.

Each run receives only selected record IDs and permitted fields. Every MCP call repeats the active run, purpose, requested records, risk class, and minimum disclosure subset.

## 14. Import and export

### 14.1 Opportunity Atlas import

The importer accepts a reviewed SQLite or signed JSON package containing public opportunity records and sources.

The package includes:

- package ID and version;
- file SHA-256;
- logical digest;
- rights manifest;
- generated date;
- source retrieval dates;
- opportunity records;
- source records;
- component-fit recommendations;
- scoring inputs.

The importer:

- validates schema and size;
- validates the pinned digest;
- treats all content as untrusted;
- imports transactionally;
- preserves local private decisions;
- never downgrades a newer reviewed local fact silently;
- generates a review diff;
- records import history;
- creates source-review tasks for conflicts.

### 14.2 Private export

Founder-owned exports may include selected private records. They remain local and clearly labeled private.

### 14.3 Public contribution export

The existing allowlist-based contribution model remains. New private tables are excluded by default.

Only explicitly reviewed public opportunity research with permitted rights may enter a public contribution. The exporter never includes:

- ventures' private legal information;
- capital mandates;
- private contacts;
- application answers;
- decisions;
- drafts;
- submission receipts;
- meetings;
- notes;
- build worktree paths;
- agent runs;
- distribution plans;
- results containing private feedback;
- diligence;
- credentials.

## 15. Error handling

### 15.1 Source uncertainty

Missing, conflicting, stale, or ambiguous facts remain visibly uncertain. They create a source-review task and cannot satisfy a hard eligibility gate.

### 15.2 Deadline changes

A changed imported deadline never silently overwrites an active application. The founder sees the old value, new value, source, and consequence before accepting it.

### 15.3 Import failure

An invalid package, digest mismatch, unsupported schema, oversized content, rights failure, or database constraint error aborts the entire import. The current vault remains unchanged.

### 15.4 Concurrent access

The application continues to prevent unsafe concurrent access to the SQL.js vault. Desktop and standalone MCP usage must not write the same vault simultaneously.

### 15.5 Agent failure

A failed, malformed, oversized, unauthorized, or prompt-injected agent result creates no applied mutation. The run ends with a bounded diagnostic and audit record.

### 15.6 Build failure

A failed CI run, missing evidence manifest, changed base SHA, or unreviewed dependency blocks `submission_ready` state.

### 15.7 Submission ambiguity

A portal action performed manually by the founder remains `submission_ready` until a receipt, confirmation ID, timestamp, or founder attestation is recorded. The system never infers success from a browser visit.

### 15.8 Publication ambiguity

A draft is not marked published without a founder-recorded URL or provider confirmation. Agents cannot advance the state.

## 16. Security and privacy

The existing threat model remains authoritative and expands to cover:

- application answers;
- sponsor and judge contacts;
- unpublished demos;
- private product claims;
- build and worktree references;
- submission receipts;
- grant terms;
- accelerator interviews;
- venture and legal-entity relationships.

Required controls:

- OS-backed credential encryption;
- local SQLite authority;
- typed IPC;
- sandboxed renderer;
- proposal-only agents;
- record-level disclosure;
- append-only audit chain;
- encrypted backup;
- fail-closed imports;
- no private data in public seeds;
- no secret or private content in production logs;
- exact founder review for every external action.

## 17. Testing strategy

### 17.1 Migration tests

For every migration:

- create a pre-migration fixture;
- apply migration;
- verify foreign keys and integrity;
- reopen the vault;
- verify backup and restore;
- verify downgrade refusal;
- verify new private tables are excluded from public contribution export.

### 17.2 Domain tests

Test:

- legal-entity and narrative separation;
- mandate economics;
- opportunity identity and deduplication;
- recurring hackathon cycles;
- eligibility rule evaluation;
- entry scoring;
- go/no-go overrides;
- canonical-demo binding;
- immutable narrative and demo versions;
- application stages;
- result and conversion accounting.

### 17.3 Agent and MCP tests

Test:

- tool discovery by context class;
- record-level redaction;
- proposal-only behavior;
- unauthorized record rejection;
- forbidden tool names;
- malformed output rejection;
- audit failure behavior;
- no send, submit, publish, upload, spend, sign, merge, or verify capability.

### 17.4 Import tests

Test:

- deterministic digest validation;
- schema mismatch;
- stale update review;
- conflicting source review;
- idempotent import;
- private-state preservation;
- rights metadata;
- oversized and malicious package rejection.

### 17.5 End-to-end tests

Required founder workflow:

```text
Atlas opportunity
→ reviewed import
→ venture and legal entity selection
→ hackathon candidate entry
→ eligibility review
→ canonical demo selection
→ founder go decision
→ build reference and CI evidence
→ agent-drafted application answer
→ founder approval
→ manual portal submission
→ receipt capture
→ launch and distribution tasks
→ result record
→ sponsor, grant, accelerator, or investor conversion
```

Required capital workflow:

```text
capital mandate
→ investor qualification
→ agent-drafted initial
→ exact founder approval
→ one provider send
→ meeting
→ diligence
→ decision or commitment
```

### 17.6 Native verification

Every release continues to run:

- formatting;
- lint;
- type checking;
- unit and integration tests;
- coverage gates;
- Electron end-to-end tests;
- dependency audit;
- CodeQL;
- legal notices;
- native packaging;
- package smoke tests;
- Electron fuse verification;
- SBOM;
- checksums;
- provenance;
- build attestations.

## 18. Rollout phases

### Phase 0 — Fork governance and reproducibility

Deliverables:

- protected `main`;
- required CI and CodeQL;
- enabled issues or project tracking;
- upstream synchronization policy;
- stale branch resolution;
- fork-owned baseline release;
- private vulnerability reporting;
- RNDRNTWRK CODEOWNERS;
- successful fork-native build matrix.

Exit: the exact fork commit has reproducible release evidence.

### Phase 1 — Existing-product qualification

Operate one real SW4P capital mandate without schema changes.

Deliverables:

- 25–50 qualified targets;
- product-specific knowledge;
- encrypted backup and restore proof;
- one synthetic communication flow;
- one agent proposal and rejection;
- audit verification;
- contribution-export privacy proof.

Exit: the existing product successfully runs one real capital lane.

### Phase 2 — Venture and narrative authority

Add legal entities, ventures, narrative profiles, canonical demos, capital mandates, and immutable versions.

Exit: applications cannot mix entity or narrative authority accidentally.

### Phase 3 — Hackathon Studio

Add hackathon cycles, rules, tracks, bounties, entries, scoring, builds, submissions, distribution campaigns, results, and conversion.

Exit: one imported hackathon can support several component candidates and one complete founder-operated submission campaign.

### Phase 4 — General opportunities and applications

Add accelerators, grants, startup programs, credits, sponsors, strategic partners, general applications, answers, assets, receipts, and milestones.

Exit: non-investor opportunities are first-class and do not masquerade as firms or targets.

### Phase 5 — Opportunity Atlas importer

Add reviewed, digest-pinned import and conflict review.

Exit: selected public intelligence enters the private execution system reproducibly.

### Phase 6 — Alice and RNDRNTWRK CTRL

Add bounded read and proposal tools, new context classes, cost and trace references, and founder review flows.

Exit: Alice can prepare opportunity and hackathon work but cannot perform external actions.

### Phase 7 — Distribution and conversion

Complete launch-plan, sponsor/judge follow-up, investor update, grant follow-on, partner conversion, and portfolio metrics.

Exit: every selected hackathon has measurable technical, distribution, relationship, and capital outcomes.

## 19. Fork and branch strategy

```text
main
  protected RNDRNTWRK release branch

upstream/main
  canonical upstream reference

chore/fork-governance
  Actions, protection, ownership and security policy

feat/venture-domain
  legal entities, ventures, narratives, demos and mandates

feat/hackathon-domain
  cycles, tracks, bounties, entries, builds and results

feat/application-domain
  general opportunities, applications, answers and assets

feat/atlas-import
  digest-pinned reviewed import

feat/opportunity-ui
  founder workspaces and detail views

feat/opportunity-mcp
  bounded read and proposal tools

feat/rndrntwrk-ctrl-adapter
  purpose-, budget-, identity- and evidence-bound integration

feat/distribution-conversion
  launch campaigns, results and follow-on conversion
```

Each feature begins from an immutable base SHA, uses an isolated worktree, and closes through a pull request with tests and migration evidence.

## 20. Definition of done

The founder-operated opportunity system is complete when:

1. The fork has its own protected, passing CI and release history.
2. One founder can operate the application without a hosted account.
3. Legal entities, ventures, narratives, and mandates are unambiguous.
4. Investor fundraising continues to preserve all existing safety invariants.
5. Hackathons are first-class, exhaustive, and independently scored by RNDRNTWRK component.
6. One hackathon may support several candidate entries without forcing the full platform story.
7. Every approved entry has a build plan and a distribution plan.
8. Build records bind to immutable source, CI, and evidence.
9. Submission success requires a founder-recorded receipt.
10. Results include prizes, credits, visibility, relationships, technical reuse, pilots, and capital conversion.
11. General accelerators, grants, credits, sponsors, and partners are first-class opportunities.
12. Atlas import is deterministic, source-aware, rights-aware, and conflict-reviewed.
13. Alice receives only selected records and can create only pending proposals.
14. No agent can send, submit, publish, upload, spend, sign, merge, or verify.
15. Encrypted backup and restore pass after every new migration.
16. Public contribution export excludes all new private state.
17. Audit-chain verification covers every new consequential command.
18. Native package, security, accessibility, provenance, and release gates pass.
19. A complete hackathon entry can move from discovery through conversion inside one founder-controlled record.
20. The founder's morning brief clearly identifies the next safe and highest-leverage action.

## 21. Resolved decisions

- The system is founder-operated and single-user.
- The canonical private vault remains local.
- Agents remain proposal-only.
- Hackathons are a primary product and distribution channel.
- Hackathon Studio receives a dedicated workflow and data model.
- Capital and Hackathon Studio share records but use separate stages.
- GitHub remains the source and engineering authority.
- RNDRNTWRK CTRL governs agent execution but does not own private relationship data.
- The Opportunity Atlas remains the public intelligence layer.
- Multi-user collaboration and cloud synchronization are outside the first implementation.
