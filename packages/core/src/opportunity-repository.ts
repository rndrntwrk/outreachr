import type { CoreVault } from './database.js';
import {
  EvidenceReviewStateSchema,
  OpportunitySchema,
  OpportunitySourceSchema,
  OrganizationSchema,
  type Opportunity,
  type OpportunityFilter,
  type OpportunityInput,
  type OpportunitySource,
  type OpportunitySourceInput,
  type Organization,
  type OrganizationInput,
} from './opportunity-validation.js';
import { appendAuditEntry } from './repository.js';
import { IdSchema, IsoDateTimeSchema } from './validation.js';

interface OrganizationRow {
  id: string;
  name: string;
  normalized_name: string;
  kind: string;
  website: string | null;
  description: string | null;
  linked_firm_id: string | null;
  is_public: number;
  contribution_eligible: number;
  origin: string;
  created_at: string;
  updated_at: string;
}

interface OpportunityRow {
  id: string;
  organizer_organization_id: string | null;
  name: string;
  opportunity_type: string;
  status: string;
  public_url: string | null;
  application_url: string | null;
  open_date: string | null;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  format: string | null;
  location: string | null;
  eligibility_summary: string | null;
  terms_summary: string | null;
  capital_prize_summary: string | null;
  freshness_state: string;
  review_state: string;
  imported_package_id: string | null;
  imported_package_digest: string | null;
  created_at: string;
  updated_at: string;
}

interface OpportunitySourceRow {
  opportunity_id: string;
  source_id: string;
  source_role: string;
  observed_at: string;
  confidence: string;
  review_state: string;
  reviewed_at: string | null;
  created_at: string;
}

type OrganizationUpsertInput = Omit<OrganizationInput, 'normalizedName'> & {
  normalizedName?: string;
};

function bool(value: boolean): number {
  return value ? 1 : 0;
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/\s+/gu, ' ');
}

function mapOrganization(row: OrganizationRow): Organization {
  return OrganizationSchema.parse({
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    kind: row.kind,
    website: row.website,
    description: row.description,
    linkedFirmId: row.linked_firm_id,
    isPublic: row.is_public === 1,
    contributionEligible: row.contribution_eligible === 1,
    origin: row.origin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapOpportunity(row: OpportunityRow): Opportunity {
  return OpportunitySchema.parse({
    id: row.id,
    organizerOrganizationId: row.organizer_organization_id,
    name: row.name,
    opportunityType: row.opportunity_type,
    status: row.status,
    publicUrl: row.public_url,
    applicationUrl: row.application_url,
    openDate: row.open_date,
    deadline: row.deadline,
    startDate: row.start_date,
    endDate: row.end_date,
    format: row.format,
    location: row.location,
    eligibilitySummary: row.eligibility_summary,
    termsSummary: row.terms_summary,
    capitalPrizeSummary: row.capital_prize_summary,
    freshnessState: row.freshness_state,
    reviewState: row.review_state,
    importedPackageId: row.imported_package_id,
    importedPackageDigest: row.imported_package_digest,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapOpportunitySource(row: OpportunitySourceRow): OpportunitySource {
  return OpportunitySourceSchema.parse({
    opportunityId: row.opportunity_id,
    sourceId: row.source_id,
    sourceRole: row.source_role,
    observedAt: row.observed_at,
    confidence: row.confidence,
    reviewState: row.review_state,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  });
}

function sameEvidence(left: OpportunitySource, right: OpportunitySource): boolean {
  return (
    left.opportunityId === right.opportunityId &&
    left.sourceId === right.sourceId &&
    left.sourceRole === right.sourceRole &&
    left.observedAt === right.observedAt &&
    left.confidence === right.confidence &&
    left.reviewState === right.reviewState &&
    left.reviewedAt === right.reviewedAt &&
    left.createdAt === right.createdAt
  );
}

export class OpportunityRepository {
  constructor(readonly vault: CoreVault) {}

  private audit(
    action: string,
    entityType: string,
    entityId: string,
    detail: unknown,
    occurredAt: string,
    actorType = 'founder',
    actorId: string | null = 'founder',
  ): void {
    appendAuditEntry(this.vault, {
      occurredAt,
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      detail,
    });
  }

  private requireOrganization(idInput: string): Organization {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<OrganizationRow>('SELECT * FROM organizations WHERE id=?', [id]);
    if (!row) throw new Error(`Organization ${id} does not exist`);
    return mapOrganization(row);
  }

  private requireOpportunity(idInput: string): Opportunity {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<OpportunityRow>('SELECT * FROM opportunities WHERE id=?', [id]);
    if (!row) throw new Error(`Opportunity ${id} does not exist`);
    return mapOpportunity(row);
  }

  upsertOrganization(input: OrganizationUpsertInput): Organization {
    const value = OrganizationSchema.parse({
      ...input,
      normalizedName: normalizedName(input.name),
    });
    if (value.linkedFirmId !== null) {
      const firm = this.vault.one('SELECT 1 FROM firms WHERE id=?', [value.linkedFirmId]);
      if (!firm) throw new Error(`Linked investor firm ${value.linkedFirmId} does not exist`);
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO organizations(
          id,name,normalized_name,kind,website,description,linked_firm_id,is_public,
          contribution_eligible,origin,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,normalized_name=excluded.normalized_name,kind=excluded.kind,
          website=excluded.website,description=excluded.description,
          linked_firm_id=excluded.linked_firm_id,is_public=excluded.is_public,
          contribution_eligible=excluded.contribution_eligible,origin=excluded.origin,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.name.trim().replace(/\s+/gu, ' '),
          value.normalizedName,
          value.kind,
          value.website,
          value.description,
          value.linkedFirmId,
          bool(value.isPublic),
          bool(value.contributionEligible),
          value.origin,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'opportunity.organization_upserted',
        'organization',
        value.id,
        { kind: value.kind, origin: value.origin },
        value.updatedAt,
      );
    });
    return this.requireOrganization(value.id);
  }

  listOrganizations(): Organization[] {
    return this.vault
      .all<OrganizationRow>('SELECT * FROM organizations ORDER BY normalized_name,id')
      .map(mapOrganization);
  }

  getOrganization(idInput: string): Organization | null {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<OrganizationRow>('SELECT * FROM organizations WHERE id=?', [id]);
    return row ? mapOrganization(row) : null;
  }

  upsertOpportunity(input: OpportunityInput): Opportunity {
    const value = OpportunitySchema.parse(input);
    if (value.organizerOrganizationId !== null) {
      this.requireOrganization(value.organizerOrganizationId);
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO opportunities(
          id,organizer_organization_id,name,opportunity_type,status,public_url,application_url,
          open_date,deadline,start_date,end_date,format,location,eligibility_summary,terms_summary,
          capital_prize_summary,freshness_state,review_state,imported_package_id,
          imported_package_digest,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          organizer_organization_id=excluded.organizer_organization_id,name=excluded.name,
          opportunity_type=excluded.opportunity_type,status=excluded.status,
          public_url=excluded.public_url,application_url=excluded.application_url,
          open_date=excluded.open_date,deadline=excluded.deadline,start_date=excluded.start_date,
          end_date=excluded.end_date,format=excluded.format,location=excluded.location,
          eligibility_summary=excluded.eligibility_summary,terms_summary=excluded.terms_summary,
          capital_prize_summary=excluded.capital_prize_summary,
          freshness_state=excluded.freshness_state,review_state=excluded.review_state,
          imported_package_id=excluded.imported_package_id,
          imported_package_digest=excluded.imported_package_digest,updated_at=excluded.updated_at`,
        [
          value.id,
          value.organizerOrganizationId,
          value.name,
          value.opportunityType,
          value.status,
          value.publicUrl,
          value.applicationUrl,
          value.openDate,
          value.deadline,
          value.startDate,
          value.endDate,
          value.format,
          value.location,
          value.eligibilitySummary,
          value.termsSummary,
          value.capitalPrizeSummary,
          value.freshnessState,
          value.reviewState,
          value.importedPackageId,
          value.importedPackageDigest,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'opportunity.upserted',
        'opportunity',
        value.id,
        {
          opportunityType: value.opportunityType,
          status: value.status,
          reviewState: value.reviewState,
          deadline: value.deadline,
        },
        value.updatedAt,
      );
    });
    return this.requireOpportunity(value.id);
  }

  attachSource(input: OpportunitySourceInput): OpportunitySource {
    const value = OpportunitySourceSchema.parse(input);
    this.requireOpportunity(value.opportunityId);
    const source = this.vault.one('SELECT 1 FROM sources WHERE id=?', [value.sourceId]);
    if (!source) throw new Error(`Source ${value.sourceId} does not exist`);

    const existingRow = this.vault.one<OpportunitySourceRow>(
      `SELECT * FROM opportunity_sources
       WHERE opportunity_id=? AND source_id=? AND source_role=?`,
      [value.opportunityId, value.sourceId, value.sourceRole],
    );
    if (existingRow) {
      const existing = mapOpportunitySource(existingRow);
      if (existing.reviewState !== 'pending') {
        if (sameEvidence(existing, value)) return existing;
        throw new Error('Reviewed opportunity evidence cannot be changed');
      }
    } else if (value.reviewState !== 'pending') {
      throw new Error('New opportunity evidence must start pending');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO opportunity_sources(
          opportunity_id,source_id,source_role,observed_at,confidence,review_state,reviewed_at,created_at
        ) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(opportunity_id,source_id,source_role) DO UPDATE SET
          observed_at=excluded.observed_at,confidence=excluded.confidence,
          review_state=excluded.review_state,reviewed_at=excluded.reviewed_at`,
        [
          value.opportunityId,
          value.sourceId,
          value.sourceRole,
          value.observedAt,
          value.confidence,
          value.reviewState,
          value.reviewedAt,
          value.createdAt,
        ],
      );
      this.audit(
        'opportunity.source_attached',
        'opportunity',
        value.opportunityId,
        {
          sourceId: value.sourceId,
          sourceRole: value.sourceRole,
          confidence: value.confidence,
        },
        value.createdAt,
      );
    });
    return this.requireSource(value.opportunityId, value.sourceId, value.sourceRole);
  }

  private requireSource(
    opportunityIdInput: string,
    sourceIdInput: string,
    roleInput: string,
  ): OpportunitySource {
    const opportunityId = IdSchema.parse(opportunityIdInput);
    const sourceId = IdSchema.parse(sourceIdInput);
    const role = roleInput.trim();
    if (!role) throw new Error('Opportunity source role is required');
    const row = this.vault.one<OpportunitySourceRow>(
      `SELECT * FROM opportunity_sources
       WHERE opportunity_id=? AND source_id=? AND source_role=?`,
      [opportunityId, sourceId, role],
    );
    if (!row) throw new Error('Opportunity evidence does not exist');
    return mapOpportunitySource(row);
  }

  reviewSource(
    opportunityIdInput: string,
    sourceIdInput: string,
    roleInput: string,
    decisionInput: 'accept' | 'reject',
    reviewedAtInput: string,
  ): OpportunitySource {
    const reviewedAt = IsoDateTimeSchema.parse(reviewedAtInput);
    const decision = decisionInput === 'accept' ? 'accepted' : 'rejected';
    EvidenceReviewStateSchema.parse(decision);
    const current = this.requireSource(opportunityIdInput, sourceIdInput, roleInput);
    if (current.reviewState !== 'pending') {
      if (current.reviewState === decision && current.reviewedAt === reviewedAt) return current;
      throw new Error('Reviewed opportunity evidence cannot be changed');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `UPDATE opportunity_sources SET review_state=?,reviewed_at=?
         WHERE opportunity_id=? AND source_id=? AND source_role=? AND review_state='pending'`,
        [decision, reviewedAt, current.opportunityId, current.sourceId, current.sourceRole],
      );
      this.audit(
        'opportunity.source_reviewed',
        'opportunity',
        current.opportunityId,
        {
          sourceId: current.sourceId,
          sourceRole: current.sourceRole,
          decision,
        },
        reviewedAt,
      );
    });
    return this.requireSource(current.opportunityId, current.sourceId, current.sourceRole);
  }

  listSources(opportunityIdInput: string): OpportunitySource[] {
    const opportunityId = IdSchema.parse(opportunityIdInput);
    return this.vault
      .all<OpportunitySourceRow>(
        `SELECT * FROM opportunity_sources
         WHERE opportunity_id=? ORDER BY observed_at DESC,source_role,source_id`,
        [opportunityId],
      )
      .map(mapOpportunitySource);
  }

  listOpportunities(filter: OpportunityFilter = {}): Opportunity[] {
    const clauses: string[] = [];
    const params: Array<string> = [];
    if (filter.opportunityType !== undefined) {
      clauses.push('opportunity_type=?');
      params.push(filter.opportunityType);
    }
    if (filter.status !== undefined) {
      clauses.push('status=?');
      params.push(filter.status);
    }
    if (filter.organizerOrganizationId !== undefined) {
      clauses.push('organizer_organization_id=?');
      params.push(IdSchema.parse(filter.organizerOrganizationId));
    }
    if (filter.freshnessState !== undefined) {
      clauses.push('freshness_state=?');
      params.push(filter.freshnessState);
    }
    if (filter.reviewState !== undefined) {
      clauses.push('review_state=?');
      params.push(filter.reviewState);
    }
    if (filter.deadlineBefore !== undefined) {
      const deadline = filter.deadlineBefore.trim();
      if (Number.isNaN(Date.parse(deadline))) {
        throw new Error('deadlineBefore must be a valid date');
      }
      clauses.push('deadline IS NOT NULL AND deadline<=?');
      params.push(deadline.slice(0, 10));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return this.vault
      .all<OpportunityRow>(
        `SELECT * FROM opportunities ${where}
         ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,deadline,name,id`,
        params,
      )
      .map(mapOpportunity);
  }

  getOpportunity(idInput: string): Opportunity | null {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<OpportunityRow>('SELECT * FROM opportunities WHERE id=?', [id]);
    return row ? mapOpportunity(row) : null;
  }
}
