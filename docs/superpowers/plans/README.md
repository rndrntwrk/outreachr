# Founder-Operated Opportunity System Plan Index

This directory contains the implementation roadmap and phase plans for the approved founder-operated opportunity system.

## Execution order

1. `2026-08-15-phase-0-fork-governance.md`
2. `2026-08-15-phase-1-sw4p-capital-mandate.md`
3. `2026-08-15-phase-2-venture-narrative-domain.md`
4. `2026-08-15-phase-3-hackathon-studio.md`
5. `2026-08-15-phase-4-general-opportunity-applications.md`
6. `2026-08-15-phase-5-opportunity-atlas-import.md`
7. `2026-08-15-phase-6-alice-ctrl-opportunity-mcp.md`
8. `2026-08-15-phase-7-distribution-conversion.md`
9. `2026-08-15-phase-8-production-release.md`

The cross-phase sequence and release gates are summarized in `2026-08-15-founder-operated-opportunity-system-roadmap.md`.

## Controlling implementation corrections

The plans were reviewed as one system after all phases were written. The following corrections are normative and override a conflicting example in an individual phase plan. Apply them directly when implementing the affected task.

### Phase 0 release order

Commit the completed baseline changelog, checklist and release record **before** tagging. The correct order is:

```text
complete governance changes
run local and GitHub verification
commit the baseline release record
merge the governance pull request
update local main
create and push the baseline tag on the verified main commit
verify release artifacts
```

A tag must never point to a commit that omits its own release record.

### Phase 2 venture default references

Migration v10 must add database triggers for `ventures.default_narrative_profile_id` and `ventures.current_demo_version_id` because those cyclic references cannot be expressed safely as inline foreign keys during table creation.

Require:

```text
default narrative exists, belongs to the venture and is approved
current demo version exists, is approved and belongs to a demo linked through venture_demos
```

Reject deleting or superseding a referenced record until the venture reference is moved to another approved version.

### Phase 3 one lead venture per hackathon entry

Add this partial unique index in migration v11:

```sql
CREATE UNIQUE INDEX hackathon_entry_one_lead_venture_idx
ON hackathon_entry_ventures(entry_id)
WHERE role='lead';
```

The service and transition guard must additionally require exactly one lead venture before an entry leaves `candidate`.

### Phase 4 one application per opportunity, legal entity and venture

Use this uniqueness rule:

```sql
UNIQUE(opportunity_id,legal_entity_id,venture_id)
```

Do **not** include `narrative_profile_id` in the application identity. A draft application may move to a newer approved narrative before submission. Once submitted, its narrative is frozen by the receipt snapshot. A later program cycle must be represented by a new opportunity/cycle record, not a duplicate application differentiated only by narrative version.

### Phase 5 import conflict integrity

`opportunity_import_conflicts.package_id` must be declared:

```sql
package_id TEXT NOT NULL REFERENCES opportunity_imports(package_id) ON DELETE RESTRICT
```

Conflict resolution must append an audit event and must not mutate the stored incoming package snapshot.

### Phase 7 metric correction history

Add this nullable column to `distribution_metrics` during the v15 migration:

```sql
supersedes_metric_id TEXT REFERENCES distribution_metrics(id) ON DELETE RESTRICT
```

A corrected observation creates a new row referencing the original. Verified metric rows are never overwritten or deleted.

### Phase 7 conversion attribution identity

Do not use nullable columns inside a composite primary key. Use:

```sql
CREATE TABLE conversion_attribution (
  id TEXT PRIMARY KEY,
  conversion_id TEXT NOT NULL REFERENCES hackathon_conversions(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  distribution_item_id TEXT REFERENCES hackathon_distribution_items(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES distribution_contacts(id) ON DELETE SET NULL,
  attribution TEXT NOT NULL CHECK(attribution IN ('direct','contributing','unknown')),
  evidence_reference TEXT,
  rationale TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX conversion_attribution_identity_idx
ON conversion_attribution(
  conversion_id,
  campaign_id,
  COALESCE(distribution_item_id,''),
  COALESCE(contact_id,'')
);
```

### Command examples

Leading whitespace before a shell command in any Markdown code block is editorial only. Execute commands without an unintended leading shell token.

## Schema sequence

```text
v9  current upstream baseline
v10 legal entities, ventures, narratives, demos and capital mandates
v11 organizations, opportunities and Hackathon Studio
v12 general applications
v13 Atlas import history and conflicts
v14 opportunity-aware agent context grants
v15 distribution, metrics, conversion and public proof
```

Released migrations are immutable. Before `v0.2.0` is tagged, implement each planned version once in sequence. After the tag, any correction uses a new migration number rather than editing v10–v15.

## Plan self-review result

- No implementation choice remains marked `TBD`, `TODO`, `FIXME` or placeholder.
- Founder authority and proposal-only agent boundaries are consistent across every phase.
- Hackathons remain first-class product, engineering, marketing, visibility, distribution, capital and relationship programs.
- Opportunity Atlas intelligence and private Outreachr execution remain separate.
- Schema versions and phase dependencies are consistent with the sequence above.
- Public and private export paths retain separate allowlists.
- The release is blocked by migration, privacy, agent-boundary, accessibility, native-build or founder-UAT failure.
