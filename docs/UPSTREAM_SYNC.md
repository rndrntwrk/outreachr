# Upstream synchronization

`rndrntwrk/outreachr` tracks `lalalune/outreachr` as its upstream source while maintaining RNDRNTWRK-specific opportunity, Hackathon Studio, and agent-control modules in the fork.

## Required sync flow

Run the following commands from a clean clone of the RNDRNTWRK fork:

```bash
git remote add upstream https://github.com/lalalune/outreachr.git
git fetch upstream --prune
git checkout -b sync/upstream-YYYY-MM-DD origin/main
git merge --no-ff upstream/main
git push -u origin sync/upstream-YYYY-MM-DD
```

Then:

1. Open a pull request from `sync/upstream-YYYY-MM-DD` to `main`.
2. Review migrations, connector scopes, agent capabilities, MCP tools, release scripts, and data-rights changes.
3. Run the complete fork CI matrix.
4. Resolve conflicts without weakening RNDRNTWRK security invariants.
5. Squash-merge only after required checks pass.
6. Record the upstream source SHA in the pull-request body.

## Review checklist

Every upstream synchronization pull request must answer:

- Which upstream commit is being incorporated?
- Did any SQLite migration, validation rule, import/export boundary, backup format, or audit-chain behavior change?
- Did any Gmail, Outlook, Google Calendar, Microsoft Calendar, Codex, Claude, or MCP capability change?
- Did any change expand agent access, external-action authority, inherited environment variables, network access, file access, or disclosure scope?
- Did any change alter the one-unsolicited-initial communication invariant?
- Did any release, packaging, signing, SBOM, provenance, or dependency policy change?
- Did any source-data license, attribution, or redistribution assumption change?
- Do RNDRNTWRK modules still compile and pass their focused tests without modifying the upstream change unnecessarily?

## Conflict policy

Prefer an upstream-compatible fix when it preserves RNDRNTWRK requirements. Keep RNDRNTWRK-specific behavior behind typed domain modules and explicit adapters. Never resolve a conflict by deleting a security check, broadening an agent capability, importing private data into the public seed, or bypassing founder approval.

A conflict affecting legal-entity identity, cap-table narratives, opportunity imports, hackathon eligibility, application receipts, external communication, or agent authority requires an explicit review note in the pull request.

## Sync evidence

The merged pull request is the synchronization record. It must retain:

- upstream source SHA;
- RNDRNTWRK base SHA;
- conflict-resolution notes;
- required-check results;
- migration and data-rights review outcome;
- any follow-up issues created for RNDRNTWRK modules.

Do not force-push `main`, fast-forward it directly to upstream, or silently overwrite fork-specific commits.
