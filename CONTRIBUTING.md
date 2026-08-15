# Contributing to Outreachr

Outreachr welcomes code, documentation, accessibility, connector, and rights-reviewed investor-data contributions.

## Development

1. Install Node.js 22 or newer and pnpm 11.18.0.
2. Run `pnpm install --frozen-lockfile` after the first lockfile is published, or `pnpm install` while bootstrapping.
3. Run `pnpm verify` before opening a pull request.
4. For desktop changes, also run `pnpm test:e2e` and the appropriate local package smoke test.

## RNDRNTWRK fork development

Changes to this fork must follow the [RNDRNTWRK fork policy](docs/RNDRNTWRK_FORK_POLICY.md) and the [upstream synchronization procedure](docs/UPSTREAM_SYNC.md).

Classify work as one of:

- `UPSTREAM-CANDIDATE` for generic fixes and reusable improvements;
- `RNDRNTWRK-MODULE` for ventures, the Opportunity Atlas, Hackathon Studio, RNDRNTWRK CTRL adapters, and product taxonomy;
- `PRIVATE-ONLY` for contacts, warm paths, application answers, diligence, credentials, vaults, and other founder-private execution data.

Keep RNDRNTWRK modules behind focused files and typed interfaces. Never commit private founder data or weaken the proposal-only agent and founder-approval boundaries.

## Data contributions

Never commit a founder's private activity, email history, calendar content, notes, meetings, drafts, approvals, send receipts, relationship graph, credentials, or suppression reasons. Use the in-app contribution exporter, review the generated diff, and include source URLs and rights metadata for every assertion. Publicly published professional work email addresses are permitted when necessary, attributed, and legally redistributable; personal addresses are not.

By contributing code or project-authored documentation, you agree that your contribution is licensed under Apache-2.0. Data retains its actual per-source license or permission status.
