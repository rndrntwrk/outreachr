import type { CoreVault } from './database.js';
import { appendAuditEntry } from './repository.js';
import { IdSchema, IsoDateTimeSchema } from './validation.js';
import {
  CanonicalDemoSchema,
  CanonicalDemoVersionCreateSchema,
  CanonicalDemoVersionSchema,
  CapitalMandateSchema,
  LegalEntitySchema,
  NarrativeProfileSchema,
  NarrativeVersionInputSchema,
  VentureSchema,
  canonicalDemoDigest,
  narrativeDigest,
  type CanonicalDemo,
  type CanonicalDemoInput,
  type CanonicalDemoVersion,
  type CanonicalDemoVersionInput,
  type CanonicalDemoWithVersions,
  type CapitalMandate,
  type CapitalMandateInput,
  type LegalEntity,
  type LegalEntityInput,
  type NarrativeContent,
  type NarrativeProfile,
  type NarrativeVersionInput,
  type Venture,
  type VentureInput,
} from './venture-validation.js';

interface LegalEntityRow {
  id: string;
  legal_name: string;
  display_name: string;
  jurisdiction: string | null;
  entity_type: string;
  status: string;
  incorporation_reference: string | null;
  cap_table_reference: string | null;
  founder_authority: string;
  public_website: string | null;
  created_at: string;
  updated_at: string;
}

interface VentureRow {
  id: string;
  legal_entity_id: string;
  name: string;
  category: string;
  utility: string;
  stage: string;
  status: string;
  public_url: string | null;
  default_narrative_profile_id: string | null;
  current_demo_version_id: string | null;
  created_at: string;
  updated_at: string;
}

interface NarrativeRow {
  id: string;
  legal_entity_id: string;
  venture_id: string;
  purpose: string;
  version: number;
  description_50: string;
  description_100: string;
  description_250: string;
  problem: string;
  product_wedge: string;
  why_now: string;
  technical_differentiation: string;
  evidence_framing: string;
  business_model: string;
  use_of_funds: string;
  claims_boundary: string;
  deck_reference: string | null;
  demo_reference: string | null;
  content_sha256: string;
  approval_state: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CanonicalDemoRow {
  id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CanonicalDemoVersionRow {
  id: string;
  demo_id: string;
  version: number;
  baseline_repository: string;
  baseline_commit_sha: string;
  branch_convention: string;
  expected_baseline_hours: number;
  core_assets_json: string;
  evidence_requirements_json: string;
  approved_claims_json: string;
  content_sha256: string;
  approval_state: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CapitalMandateRow {
  id: string;
  round_id: string;
  legal_entity_id: string;
  venture_id: string;
  narrative_profile_id: string;
  stage: string;
  target_amount_usd: number;
  minimum_check_usd: number | null;
  maximum_check_usd: number | null;
  instrument: string;
  token_side_letter_policy: string;
  geographies_json: string;
  target_close_date: string | null;
  status: string;
  approved_use_of_funds: string;
  created_at: string;
  updated_at: string;
}

interface FounderRow {
  id: string;
  company_name: string;
  company_url: string | null;
  created_at: string;
}

interface RoundRow {
  id: string;
  name: string;
  stage: 'pre_seed' | 'seed' | 'series_a';
  target_amount_usd: number | null;
  minimum_check_usd: number | null;
  maximum_check_usd: number | null;
  status: 'planning' | 'active' | 'paused' | 'closed';
  thesis: string | null;
  closed_on: string | null;
}

export interface LegacyAuthorityResult {
  createdLegalEntityId: string | null;
  createdVentureId: string | null;
  createdNarrativeIds: string[];
  createdMandateIds: string[];
}

function parseStringArray(value: string, field: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${field} contains invalid JSON`);
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must contain a JSON string array`);
  }
  return parsed;
}

function mapLegalEntity(row: LegalEntityRow): LegalEntity {
  return LegalEntitySchema.parse({
    id: row.id,
    legalName: row.legal_name,
    displayName: row.display_name,
    jurisdiction: row.jurisdiction,
    entityType: row.entity_type,
    status: row.status,
    incorporationReference: row.incorporation_reference,
    capTableReference: row.cap_table_reference,
    founderAuthority: row.founder_authority,
    publicWebsite: row.public_website,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapVenture(row: VentureRow): Venture {
  return VentureSchema.parse({
    id: row.id,
    legalEntityId: row.legal_entity_id,
    name: row.name,
    category: row.category,
    utility: row.utility,
    stage: row.stage,
    status: row.status,
    publicUrl: row.public_url,
    defaultNarrativeProfileId: row.default_narrative_profile_id,
    currentDemoVersionId: row.current_demo_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapNarrative(row: NarrativeRow): NarrativeProfile {
  return NarrativeProfileSchema.parse({
    id: row.id,
    legalEntityId: row.legal_entity_id,
    ventureId: row.venture_id,
    purpose: row.purpose,
    version: row.version,
    description50: row.description_50,
    description100: row.description_100,
    description250: row.description_250,
    problem: row.problem,
    productWedge: row.product_wedge,
    whyNow: row.why_now,
    technicalDifferentiation: row.technical_differentiation,
    evidenceFraming: row.evidence_framing,
    businessModel: row.business_model,
    useOfFunds: row.use_of_funds,
    claimsBoundary: row.claims_boundary,
    deckReference: row.deck_reference,
    demoReference: row.demo_reference,
    contentSha256: row.content_sha256,
    approvalState: row.approval_state,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapCanonicalDemo(row: CanonicalDemoRow): CanonicalDemo {
  return CanonicalDemoSchema.parse({
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapCanonicalDemoVersion(row: CanonicalDemoVersionRow): CanonicalDemoVersion {
  return CanonicalDemoVersionSchema.parse({
    id: row.id,
    demoId: row.demo_id,
    version: row.version,
    baselineRepository: row.baseline_repository,
    baselineCommitSha: row.baseline_commit_sha,
    branchConvention: row.branch_convention,
    expectedBaselineHours: row.expected_baseline_hours,
    coreAssets: parseStringArray(row.core_assets_json, 'core_assets_json'),
    evidenceRequirements: parseStringArray(
      row.evidence_requirements_json,
      'evidence_requirements_json',
    ),
    approvedClaims: parseStringArray(row.approved_claims_json, 'approved_claims_json'),
    contentSha256: row.content_sha256,
    approvalState: row.approval_state,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapCapitalMandate(row: CapitalMandateRow): CapitalMandate {
  return CapitalMandateSchema.parse({
    id: row.id,
    roundId: row.round_id,
    legalEntityId: row.legal_entity_id,
    ventureId: row.venture_id,
    narrativeProfileId: row.narrative_profile_id,
    stage: row.stage,
    targetAmountUsd: row.target_amount_usd,
    minimumCheckUsd: row.minimum_check_usd,
    maximumCheckUsd: row.maximum_check_usd,
    instrument: row.instrument,
    tokenSideLetterPolicy: row.token_side_letter_policy,
    geographies: parseStringArray(row.geographies_json, 'geographies_json'),
    targetCloseDate: row.target_close_date,
    status: row.status,
    approvedUseOfFunds: row.approved_use_of_funds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function narrativeContent(profile: NarrativeProfile): NarrativeContent {
  return {
    purpose: profile.purpose,
    version: profile.version,
    description50: profile.description50,
    description100: profile.description100,
    description250: profile.description250,
    problem: profile.problem,
    productWedge: profile.productWedge,
    whyNow: profile.whyNow,
    technicalDifferentiation: profile.technicalDifferentiation,
    evidenceFraming: profile.evidenceFraming,
    businessModel: profile.businessModel,
    useOfFunds: profile.useOfFunds,
    claimsBoundary: profile.claimsBoundary,
    deckReference: profile.deckReference,
    demoReference: profile.demoReference,
  };
}

function demoContent(version: CanonicalDemoVersion) {
  return {
    version: version.version,
    baselineRepository: version.baselineRepository,
    baselineCommitSha: version.baselineCommitSha,
    branchConvention: version.branchConvention,
    expectedBaselineHours: version.expectedBaselineHours,
    coreAssets: version.coreAssets,
    evidenceRequirements: version.evidenceRequirements,
    approvedClaims: version.approvedClaims,
  };
}

export class VentureRepository {
  constructor(readonly vault: CoreVault) {}

  private audit(
    action: string,
    entityType: string,
    entityId: string,
    detail: unknown,
    at: string,
    actorType = 'founder',
    actorId: string | null = 'founder',
  ): void {
    appendAuditEntry(this.vault, {
      occurredAt: at,
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      detail,
    });
  }

  private requireLegalEntity(id: string): LegalEntity {
    const row = this.vault.one<LegalEntityRow>('SELECT * FROM legal_entities WHERE id=?', [
      IdSchema.parse(id),
    ]);
    if (!row) throw new Error(`Legal entity ${id} does not exist`);
    return mapLegalEntity(row);
  }

  private requireVenture(id: string): Venture {
    const row = this.vault.one<VentureRow>('SELECT * FROM ventures WHERE id=?', [IdSchema.parse(id)]);
    if (!row) throw new Error(`Venture ${id} does not exist`);
    return mapVenture(row);
  }

  private requireNarrative(id: string): NarrativeProfile {
    const row = this.vault.one<NarrativeRow>('SELECT * FROM narrative_profiles WHERE id=?', [
      IdSchema.parse(id),
    ]);
    if (!row) throw new Error(`Narrative profile ${id} does not exist`);
    return mapNarrative(row);
  }

  private requireCanonicalDemo(id: string): CanonicalDemo {
    const row = this.vault.one<CanonicalDemoRow>('SELECT * FROM canonical_demos WHERE id=?', [
      IdSchema.parse(id),
    ]);
    if (!row) throw new Error(`Canonical demo ${id} does not exist`);
    return mapCanonicalDemo(row);
  }

  private requireCanonicalDemoVersion(id: string): CanonicalDemoVersion {
    const row = this.vault.one<CanonicalDemoVersionRow>(
      'SELECT * FROM canonical_demo_versions WHERE id=?',
      [IdSchema.parse(id)],
    );
    if (!row) throw new Error(`Canonical demo version ${id} does not exist`);
    return mapCanonicalDemoVersion(row);
  }

  backfillLegacyAuthority(nowInput: string): LegacyAuthorityResult {
    const now = IsoDateTimeSchema.parse(nowInput);
    const result: LegacyAuthorityResult = {
      createdLegalEntityId: null,
      createdVentureId: null,
      createdNarrativeIds: [],
      createdMandateIds: [],
    };

    return this.vault.transaction(() => {
      const founder = this.vault.one<FounderRow>(
        'SELECT id,company_name,company_url,created_at FROM founder_profiles ORDER BY created_at,id LIMIT 1',
      );
      if (!founder) return result;

      const legalEntityId = 'legal-entity:founder';
      if (!this.vault.one('SELECT id FROM legal_entities WHERE id=?', [legalEntityId])) {
        this.vault.run(
          `INSERT INTO legal_entities(
            id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
            cap_table_reference,founder_authority,public_website,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            legalEntityId,
            founder.company_name,
            founder.company_name,
            null,
            'other',
            'active',
            null,
            null,
            'The founder controls external commitments and authority records.',
            founder.company_url,
            founder.created_at,
            now,
          ],
        );
        result.createdLegalEntityId = legalEntityId;
      }

      const ventureId = 'venture:legacy-default';
      if (!this.vault.one('SELECT id FROM ventures WHERE id=?', [ventureId])) {
        this.vault.run(
          `INSERT INTO ventures(
            id,legal_entity_id,name,category,utility,stage,status,public_url,
            default_narrative_profile_id,current_demo_version_id,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            ventureId,
            legalEntityId,
            founder.company_name,
            'Legacy founder company',
            'The founder company represented by the pre-authority Outreachr workspace.',
            'prototype',
            'active',
            founder.company_url,
            null,
            null,
            founder.created_at,
            now,
          ],
        );
        result.createdVentureId = ventureId;
      }

      if (result.createdLegalEntityId || result.createdVentureId) {
        this.audit(
          'authority.legacy_root_backfilled',
          'venture',
          ventureId,
          {
            legalEntityId,
            createdLegalEntity: Boolean(result.createdLegalEntityId),
            createdVenture: Boolean(result.createdVentureId),
          },
          now,
          'system',
          null,
        );
      }

      const rounds = this.vault.all<RoundRow>(
        `SELECT id,name,stage,target_amount_usd,minimum_check_usd,maximum_check_usd,
          status,thesis,closed_on FROM rounds ORDER BY created_at,id`,
      );
      for (const round of rounds) {
        if (this.vault.one('SELECT id FROM capital_mandates WHERE round_id=?', [round.id])) continue;

        const nextVersion =
          Number(
            this.vault.scalar(
              `SELECT COALESCE(MAX(version),0)+1 FROM narrative_profiles
               WHERE venture_id=? AND purpose='investor'`,
              [ventureId],
            ) ?? 1,
          ) || 1;
        const narrativeId = `narrative:legacy:${round.id}`;
        const thesis = round.thesis?.trim() || `${founder.company_name} legacy fundraising round.`;
        const content: NarrativeContent = {
          purpose: 'investor',
          version: nextVersion,
          description50: `${founder.company_name} is represented by the ${round.name} fundraising mandate.`,
          description100: thesis,
          description250: thesis,
          problem: thesis,
          productWedge: thesis,
          whyNow: 'This narrative was migrated from a legacy fundraising round and requires founder review before reuse.',
          technicalDifferentiation:
            'No structured technical differentiation was recorded before the authority migration.',
          evidenceFraming:
            'Treat all migrated statements as founder-provided legacy context until reviewed against current evidence.',
          businessModel: 'No structured business model was recorded before the authority migration.',
          useOfFunds: 'Legacy use-of-funds detail requires founder review.',
          claimsBoundary:
            'Do not use this migrated narrative externally without confirming every statement and replacing legacy placeholders.',
          deckReference: null,
          demoReference: null,
        };
        this.vault.run(
          `INSERT INTO narrative_profiles(
            id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
            description_250,problem,product_wedge,why_now,technical_differentiation,
            evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
            demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            narrativeId,
            legalEntityId,
            ventureId,
            content.purpose,
            content.version,
            content.description50,
            content.description100,
            content.description250,
            content.problem,
            content.productWedge,
            content.whyNow,
            content.technicalDifferentiation,
            content.evidenceFraming,
            content.businessModel,
            content.useOfFunds,
            content.claimsBoundary,
            content.deckReference,
            content.demoReference,
            narrativeDigest(content),
            'approved',
            founder.id,
            now,
            now,
            now,
          ],
        );
        const mandateId = `capital-mandate:${round.id}`;
        this.vault.run(
          `INSERT INTO capital_mandates(
            id,round_id,legal_entity_id,venture_id,narrative_profile_id,stage,target_amount_usd,
            minimum_check_usd,maximum_check_usd,instrument,token_side_letter_policy,
            geographies_json,target_close_date,status,approved_use_of_funds,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            mandateId,
            round.id,
            legalEntityId,
            ventureId,
            narrativeId,
            round.stage,
            round.target_amount_usd ?? 0,
            round.minimum_check_usd,
            round.maximum_check_usd,
            'Unspecified legacy instrument',
            'No token side-letter policy was recorded before authority migration.',
            '[]',
            round.closed_on,
            round.status,
            'Legacy use-of-funds detail requires founder review.',
            now,
            now,
          ],
        );
        this.vault.run(
          `UPDATE ventures SET default_narrative_profile_id=COALESCE(default_narrative_profile_id,?),
            updated_at=? WHERE id=?`,
          [narrativeId, now, ventureId],
        );
        result.createdNarrativeIds.push(narrativeId);
        result.createdMandateIds.push(mandateId);
        this.audit(
          'authority.legacy_round_backfilled',
          'capital_mandate',
          mandateId,
          { roundId: round.id, narrativeId, ventureId, legalEntityId },
          now,
          'system',
          null,
        );
      }

      return result;
    });
  }

  listLegalEntities(): LegalEntity[] {
    return this.vault
      .all<LegalEntityRow>('SELECT * FROM legal_entities ORDER BY display_name,id')
      .map(mapLegalEntity);
  }

  upsertLegalEntity(input: LegalEntityInput): LegalEntity {
    const value = LegalEntitySchema.parse(input);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO legal_entities(
          id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
          cap_table_reference,founder_authority,public_website,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          legal_name=excluded.legal_name,display_name=excluded.display_name,
          jurisdiction=excluded.jurisdiction,entity_type=excluded.entity_type,status=excluded.status,
          incorporation_reference=excluded.incorporation_reference,
          cap_table_reference=excluded.cap_table_reference,founder_authority=excluded.founder_authority,
          public_website=excluded.public_website,updated_at=excluded.updated_at`,
        [
          value.id,
          value.legalName,
          value.displayName,
          value.jurisdiction,
          value.entityType,
          value.status,
          value.incorporationReference,
          value.capTableReference,
          value.founderAuthority,
          value.publicWebsite,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'legal_entity.upsert',
        'legal_entity',
        value.id,
        { status: value.status, entityType: value.entityType },
        value.updatedAt,
      );
    });
    return this.requireLegalEntity(value.id);
  }

  listVentures(): Venture[] {
    return this.vault.all<VentureRow>('SELECT * FROM ventures ORDER BY name,id').map(mapVenture);
  }

  upsertVenture(input: VentureInput): Venture {
    const value = VentureSchema.parse(input);
    this.requireLegalEntity(value.legalEntityId);
    const existing = this.vault.one<VentureRow>('SELECT * FROM ventures WHERE id=?', [value.id]);
    if (existing && existing.legal_entity_id !== value.legalEntityId) {
      const authorityCount = Number(
        this.vault.scalar(
          `SELECT
            (SELECT COUNT(*) FROM narrative_profiles WHERE venture_id=?) +
            (SELECT COUNT(*) FROM capital_mandates WHERE venture_id=?)`,
          [value.id, value.id],
        ) ?? 0,
      );
      if (authorityCount > 0) {
        throw new Error('A venture with narrative or mandate history cannot change legal entity');
      }
    }
    if (value.defaultNarrativeProfileId) {
      const narrative = this.requireNarrative(value.defaultNarrativeProfileId);
      if (narrative.ventureId !== value.id) {
        throw new Error('Default narrative must belong to the venture');
      }
    }
    if (value.currentDemoVersionId) {
      const version = this.requireCanonicalDemoVersion(value.currentDemoVersionId);
      const linked = this.vault.one(
        'SELECT 1 FROM venture_demos WHERE venture_id=? AND demo_id=?',
        [value.id, version.demoId],
      );
      if (!linked) throw new Error('Current demo version must be linked to the venture');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO ventures(
          id,legal_entity_id,name,category,utility,stage,status,public_url,
          default_narrative_profile_id,current_demo_version_id,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          legal_entity_id=excluded.legal_entity_id,name=excluded.name,category=excluded.category,
          utility=excluded.utility,stage=excluded.stage,status=excluded.status,
          public_url=excluded.public_url,default_narrative_profile_id=excluded.default_narrative_profile_id,
          current_demo_version_id=excluded.current_demo_version_id,updated_at=excluded.updated_at`,
        [
          value.id,
          value.legalEntityId,
          value.name,
          value.category,
          value.utility,
          value.stage,
          value.status,
          value.publicUrl,
          value.defaultNarrativeProfileId,
          value.currentDemoVersionId,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'venture.upsert',
        'venture',
        value.id,
        { legalEntityId: value.legalEntityId, stage: value.stage, status: value.status },
        value.updatedAt,
      );
    });
    return this.requireVenture(value.id);
  }

  createNarrativeVersion(input: NarrativeVersionInput): NarrativeProfile {
    const value = NarrativeVersionInputSchema.parse(input);
    const venture = this.requireVenture(value.ventureId);
    if (venture.legalEntityId !== value.legalEntityId) {
      throw new Error('Narrative legal entity must own the selected venture');
    }

    return this.vault.transaction(() => {
      const version = Number(
        this.vault.scalar(
          'SELECT COALESCE(MAX(version),0)+1 FROM narrative_profiles WHERE venture_id=? AND purpose=?',
          [value.ventureId, value.purpose],
        ) ?? 1,
      );
      const content: NarrativeContent = {
        purpose: value.purpose,
        version,
        description50: value.description50,
        description100: value.description100,
        description250: value.description250,
        problem: value.problem,
        productWedge: value.productWedge,
        whyNow: value.whyNow,
        technicalDifferentiation: value.technicalDifferentiation,
        evidenceFraming: value.evidenceFraming,
        businessModel: value.businessModel,
        useOfFunds: value.useOfFunds,
        claimsBoundary: value.claimsBoundary,
        deckReference: value.deckReference,
        demoReference: value.demoReference,
      };
      this.vault.run(
        `INSERT INTO narrative_profiles(
          id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
          description_250,problem,product_wedge,why_now,technical_differentiation,
          evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
          demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          value.id,
          value.legalEntityId,
          value.ventureId,
          content.purpose,
          content.version,
          content.description50,
          content.description100,
          content.description250,
          content.problem,
          content.productWedge,
          content.whyNow,
          content.technicalDifferentiation,
          content.evidenceFraming,
          content.businessModel,
          content.useOfFunds,
          content.claimsBoundary,
          content.deckReference,
          content.demoReference,
          narrativeDigest(content),
          'draft',
          null,
          null,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'narrative.version_created',
        'narrative_profile',
        value.id,
        { ventureId: value.ventureId, purpose: value.purpose, version },
        value.updatedAt,
      );
      return this.requireNarrative(value.id);
    });
  }

  approveNarrativeVersion(
    idInput: string,
    founderIdInput: string,
    approvedAtInput: string,
  ): NarrativeProfile {
    const id = IdSchema.parse(idInput);
    const founderId = IdSchema.parse(founderIdInput);
    const approvedAt = IsoDateTimeSchema.parse(approvedAtInput);

    return this.vault.transaction(() => {
      const current = this.requireNarrative(id);
      if (current.approvalState !== 'draft') {
        throw new Error('Only a draft narrative version can be approved');
      }
      if (narrativeDigest(narrativeContent(current)) !== current.contentSha256) {
        throw new Error('Narrative content changed after its digest was recorded');
      }
      this.vault.run(
        `UPDATE narrative_profiles SET approval_state='superseded',updated_at=?
         WHERE venture_id=? AND purpose=? AND approval_state='approved' AND id!=?`,
        [approvedAt, current.ventureId, current.purpose, current.id],
      );
      this.vault.run(
        `UPDATE narrative_profiles SET approval_state='approved',approved_by=?,approved_at=?,updated_at=?
         WHERE id=? AND approval_state='draft'`,
        [founderId, approvedAt, approvedAt, current.id],
      );
      this.vault.run(
        `UPDATE ventures SET default_narrative_profile_id=COALESCE(default_narrative_profile_id,?),
         updated_at=? WHERE id=? AND ?='investor'`,
        [current.id, approvedAt, current.ventureId, current.purpose],
      );
      this.audit(
        'narrative.version_approved',
        'narrative_profile',
        current.id,
        { ventureId: current.ventureId, purpose: current.purpose, version: current.version },
        approvedAt,
        'founder',
        founderId,
      );
      return this.requireNarrative(current.id);
    });
  }

  listNarrativeProfiles(ventureIdInput?: string): NarrativeProfile[] {
    if (ventureIdInput) {
      const ventureId = IdSchema.parse(ventureIdInput);
      return this.vault
        .all<NarrativeRow>(
          'SELECT * FROM narrative_profiles WHERE venture_id=? ORDER BY purpose,version DESC,id',
          [ventureId],
        )
        .map(mapNarrative);
    }
    return this.vault
      .all<NarrativeRow>('SELECT * FROM narrative_profiles ORDER BY venture_id,purpose,version DESC,id')
      .map(mapNarrative);
  }

  upsertCanonicalDemo(input: CanonicalDemoInput): CanonicalDemo {
    const value = CanonicalDemoSchema.parse(input);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,category=excluded.category,status=excluded.status,
          updated_at=excluded.updated_at`,
        [value.id, value.name, value.category, value.status, value.createdAt, value.updatedAt],
      );
      this.audit(
        'canonical_demo.upsert',
        'canonical_demo',
        value.id,
        { category: value.category, status: value.status },
        value.updatedAt,
      );
    });
    return this.requireCanonicalDemo(value.id);
  }

  createCanonicalDemoVersion(input: CanonicalDemoVersionInput): CanonicalDemoVersion {
    const value = CanonicalDemoVersionCreateSchema.parse(input);
    this.requireCanonicalDemo(value.demoId);

    return this.vault.transaction(() => {
      const version = Number(
        this.vault.scalar(
          'SELECT COALESCE(MAX(version),0)+1 FROM canonical_demo_versions WHERE demo_id=?',
          [value.demoId],
        ) ?? 1,
      );
      const content = {
        version,
        baselineRepository: value.baselineRepository,
        baselineCommitSha: value.baselineCommitSha,
        branchConvention: value.branchConvention,
        expectedBaselineHours: value.expectedBaselineHours,
        coreAssets: value.coreAssets,
        evidenceRequirements: value.evidenceRequirements,
        approvedClaims: value.approvedClaims,
      };
      this.vault.run(
        `INSERT INTO canonical_demo_versions(
          id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
          expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
          content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          value.id,
          value.demoId,
          content.version,
          content.baselineRepository,
          content.baselineCommitSha,
          content.branchConvention,
          content.expectedBaselineHours,
          JSON.stringify(content.coreAssets),
          JSON.stringify(content.evidenceRequirements),
          JSON.stringify(content.approvedClaims),
          canonicalDemoDigest(content),
          'draft',
          null,
          null,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'canonical_demo.version_created',
        'canonical_demo_version',
        value.id,
        { demoId: value.demoId, version },
        value.updatedAt,
      );
      return this.requireCanonicalDemoVersion(value.id);
    });
  }

  approveCanonicalDemoVersion(
    idInput: string,
    founderIdInput: string,
    approvedAtInput: string,
  ): CanonicalDemoVersion {
    const id = IdSchema.parse(idInput);
    const founderId = IdSchema.parse(founderIdInput);
    const approvedAt = IsoDateTimeSchema.parse(approvedAtInput);

    return this.vault.transaction(() => {
      const current = this.requireCanonicalDemoVersion(id);
      if (current.approvalState !== 'draft') {
        throw new Error('Only a draft canonical demo version can be approved');
      }
      if (/^0{40}$/u.test(current.baselineCommitSha)) {
        throw new Error('A canonical demo requires a real baseline commit before approval');
      }
      if (canonicalDemoDigest(demoContent(current)) !== current.contentSha256) {
        throw new Error('Canonical demo content changed after its digest was recorded');
      }
      this.vault.run(
        `UPDATE canonical_demo_versions SET approval_state='superseded',updated_at=?
         WHERE demo_id=? AND approval_state='approved' AND id!=?`,
        [approvedAt, current.demoId, current.id],
      );
      this.vault.run(
        `UPDATE canonical_demo_versions
         SET approval_state='approved',approved_by=?,approved_at=?,updated_at=?
         WHERE id=? AND approval_state='draft'`,
        [founderId, approvedAt, approvedAt, current.id],
      );
      this.vault.run(
        `UPDATE ventures SET current_demo_version_id=?,updated_at=?
         WHERE id IN (
           SELECT venture_id FROM venture_demos WHERE demo_id=? AND is_primary=1
         )`,
        [current.id, approvedAt, current.demoId],
      );
      this.audit(
        'canonical_demo.version_approved',
        'canonical_demo_version',
        current.id,
        { demoId: current.demoId, version: current.version },
        approvedAt,
        'founder',
        founderId,
      );
      return this.requireCanonicalDemoVersion(current.id);
    });
  }

  listCanonicalDemos(): CanonicalDemoWithVersions[] {
    return this.vault
      .all<CanonicalDemoRow>('SELECT * FROM canonical_demos ORDER BY name,id')
      .map((row) => {
        const demo = mapCanonicalDemo(row);
        const versions = this.vault
          .all<CanonicalDemoVersionRow>(
            'SELECT * FROM canonical_demo_versions WHERE demo_id=? ORDER BY version DESC,id',
            [demo.id],
          )
          .map(mapCanonicalDemoVersion);
        return { ...demo, versions };
      });
  }

  linkVentureDemo(
    ventureIdInput: string,
    demoIdInput: string,
    primaryInput: boolean,
    createdAtInput: string,
  ): void {
    const ventureId = IdSchema.parse(ventureIdInput);
    const demoId = IdSchema.parse(demoIdInput);
    const primary = Boolean(primaryInput);
    const createdAt = IsoDateTimeSchema.parse(createdAtInput);
    this.requireVenture(ventureId);
    this.requireCanonicalDemo(demoId);

    this.vault.transaction(() => {
      if (primary) {
        this.vault.run('UPDATE venture_demos SET is_primary=0 WHERE venture_id=?', [ventureId]);
      }
      this.vault.run(
        `INSERT INTO venture_demos(venture_id,demo_id,is_primary,created_at)
         VALUES (?,?,?,?) ON CONFLICT(venture_id,demo_id) DO UPDATE SET is_primary=excluded.is_primary`,
        [ventureId, demoId, primary ? 1 : 0, createdAt],
      );
      this.audit(
        'venture.demo_linked',
        'venture',
        ventureId,
        { demoId, primary },
        createdAt,
      );
    });
  }

  upsertCapitalMandate(input: CapitalMandateInput): CapitalMandate {
    const value = CapitalMandateSchema.parse(input);
    const round = this.vault.one<{ stage: string }>('SELECT stage FROM rounds WHERE id=?', [
      value.roundId,
    ]);
    if (!round) throw new Error(`Round ${value.roundId} does not exist`);
    const venture = this.requireVenture(value.ventureId);
    const narrative = this.requireNarrative(value.narrativeProfileId);
    if (venture.legalEntityId !== value.legalEntityId) {
      throw new Error('Capital mandate legal entity must own the selected venture');
    }
    if (
      narrative.legalEntityId !== value.legalEntityId ||
      narrative.ventureId !== value.ventureId ||
      narrative.purpose !== 'investor' ||
      narrative.approvalState !== 'approved'
    ) {
      throw new Error('Capital mandate requires an approved investor narrative for its authority');
    }
    if (round.stage !== value.stage) {
      throw new Error('Capital mandate stage must match its fundraising round');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO capital_mandates(
          id,round_id,legal_entity_id,venture_id,narrative_profile_id,stage,target_amount_usd,
          minimum_check_usd,maximum_check_usd,instrument,token_side_letter_policy,
          geographies_json,target_close_date,status,approved_use_of_funds,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          round_id=excluded.round_id,legal_entity_id=excluded.legal_entity_id,
          venture_id=excluded.venture_id,narrative_profile_id=excluded.narrative_profile_id,
          stage=excluded.stage,target_amount_usd=excluded.target_amount_usd,
          minimum_check_usd=excluded.minimum_check_usd,maximum_check_usd=excluded.maximum_check_usd,
          instrument=excluded.instrument,token_side_letter_policy=excluded.token_side_letter_policy,
          geographies_json=excluded.geographies_json,target_close_date=excluded.target_close_date,
          status=excluded.status,approved_use_of_funds=excluded.approved_use_of_funds,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.roundId,
          value.legalEntityId,
          value.ventureId,
          value.narrativeProfileId,
          value.stage,
          value.targetAmountUsd,
          value.minimumCheckUsd,
          value.maximumCheckUsd,
          value.instrument,
          value.tokenSideLetterPolicy,
          JSON.stringify(value.geographies),
          value.targetCloseDate,
          value.status,
          value.approvedUseOfFunds,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'capital_mandate.upsert',
        'capital_mandate',
        value.id,
        {
          roundId: value.roundId,
          legalEntityId: value.legalEntityId,
          ventureId: value.ventureId,
          narrativeProfileId: value.narrativeProfileId,
          status: value.status,
        },
        value.updatedAt,
      );
    });
    return this.getMandateForRound(value.roundId) as CapitalMandate;
  }

  listCapitalMandates(): CapitalMandate[] {
    return this.vault
      .all<CapitalMandateRow>('SELECT * FROM capital_mandates ORDER BY created_at,id')
      .map(mapCapitalMandate);
  }

  getMandateForRound(roundIdInput: string): CapitalMandate | null {
    const roundId = IdSchema.parse(roundIdInput);
    const row = this.vault.one<CapitalMandateRow>(
      'SELECT * FROM capital_mandates WHERE round_id=?',
      [roundId],
    );
    return row ? mapCapitalMandate(row) : null;
  }
}
