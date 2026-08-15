# RNDRNTWRK fork policy

This document defines which changes belong in `rndrntwrk/outreachr`, which changes should be proposed upstream, and which information must remain private.

## Change classes

### UPSTREAM-CANDIDATE

Generic bug fixes, accessibility, safety, tests, and reusable improvements.

Examples:

- connector correctness and provider-neutral fixes;
- local-vault safety and backup hardening;
- general accessibility improvements;
- reusable MCP redaction, validation, and audit improvements;
- cross-platform packaging fixes;
- generic documentation corrections.

Keep these changes easy to extract into an upstream pull request. Avoid RNDRNTWRK product names or assumptions when the behavior is broadly useful.

### RNDRNTWRK-MODULE

Ventures, Opportunity Atlas, Hackathon Studio, RNDRNTWRK CTRL adapters, and product taxonomy.

Examples:

- legal entities, ventures, narrative profiles, canonical demos, and capital mandates;
- hackathon cycles, tracks, sponsors, bounties, eligibility, entries, build evidence, distribution plans, results, and conversion;
- accelerator, grant, credit, sponsor, strategic-partner, and design-partner applications;
- digest-pinned Opportunity Atlas packages;
- proposal-only opportunity tools for Alice and RNDRNTWRK CTRL;
- RNDRNTWRK product positioning and application narratives.

RNDRNTWRK modules must remain isolated behind focused files, migrations, validators, repositories, services, contracts, and typed interfaces. Do not rewrite unrelated upstream code merely to insert RNDRNTWRK terminology.

### PRIVATE-ONLY

Contacts, warm paths, private opportunity packages, application answers, diligence, credentials, and vault backups.

Private-only information also includes:

- founder notes and relationship history;
- personal or unpublished contact details;
- drafts, approvals, provider receipts, mailbox observations, and suppression reasons;
- meeting notes, diligence material, data-room links, expected checks, private budgets, and unpublished financial terms;
- application portal exports, submission credentials, unpublished sponsor briefs, and non-public judging feedback;
- agent context, prompts, proposals, runtime credentials, and local audit history;
- encrypted or plaintext vault copies and backup passphrases.

Private-only information must never be committed to this public repository, bundled into public fixtures, copied into issue bodies, or included in public contribution exports.

## Architectural boundary

The fork preserves four authorities:

1. GitHub owns source, branches, worktrees, pull requests, CI, releases, and technical evidence.
2. The Opportunity Atlas owns broad public discovery, scoring, provenance, freshness, and watchlists.
3. Outreachr owns the founder's private relationship, application, meeting, diligence, receipt, and decision record.
4. RNDRNTWRK CTRL governs agent execution identity, budget, tools, cost, traces, deployment, and recovery through bounded interfaces.

No layer silently assumes another layer's authority.

## Founder authority

The founder is the only authority to:

- send communication;
- submit an application;
- publish content;
- upload or disclose a document;
- spend funds;
- accept terms;
- sign an agreement;
- approve a legal or product narrative;
- merge source code;
- mark evidence verified.

Agents may read founder-selected records and create typed pending proposals only.

## Upstream intake

Follow [`UPSTREAM_SYNC.md`](UPSTREAM_SYNC.md). Every sync must retain the upstream SHA, run the complete fork checks, and review migrations, connectors, agent capabilities, MCP tools, release scripts, and data rights.

## Public-data contributions

The contribution exporter remains allowlist-based. New RNDRNTWRK tables are private by default and do not become contribution-eligible merely because their fields contain public-looking values. Each future public export path requires an explicit schema allowlist, source-rights review, deterministic digest, privacy test, and maintainer approval.

## Review expectations

Every RNDRNTWRK pull request should state its change class. A mixed change must separate generic upstream-candidate work from RNDRNTWRK-specific behavior when practical. Reviewers should reject changes that:

- weaken the local-vault or founder-approval boundary;
- add autonomous external actions;
- put private execution data in GitHub;
- bypass source provenance or redistribution rights;
- conflate legal entities, ventures, narratives, and capital mandates;
- represent hackathons only as prizes rather than build and distribution programs;
- make Cloudflare, MCP, or another implementation dependency the public product definition of RNDRNTWRK CTRL.
