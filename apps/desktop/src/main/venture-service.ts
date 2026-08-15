import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  Sha256Schema,
  VentureRepository,
  canonicalDemoSeedDigest,
  importCanonicalDemoSeed,
  type CanonicalDemoVersion,
  type CanonicalDemoWithVersions,
  type CapitalMandate,
  type LegalEntity,
  type NarrativeProfile,
  type Venture,
} from '@outreachr/core';
import type {
  CanonicalDemoSummary,
  CanonicalDemoVersionCreateInput,
  CanonicalDemoVersionSummary,
  CapitalMandateSaveInput,
  CapitalMandateSummary,
  LegalEntitySaveInput,
  LegalEntitySummary,
  NarrativeProfileSummary,
  NarrativeVersionCreateInput,
  VentureBootstrap,
  VentureSaveInput,
  VentureSummary,
} from '../shared/venture-contracts';
import type { VaultService } from './vault-service';

const MAX_CANONICAL_DEMO_SEED_BYTES = 5 * 1024 * 1024;

interface VentureServiceOptions {
  vault: VaultService;
  resourceDirectory: string;
  now?: () => Date;
}

function legalEntitySummary(value: LegalEntity): LegalEntitySummary {
  return {
    id: value.id,
    legalName: value.legalName,
    displayName: value.displayName,
    jurisdiction: value.jurisdiction,
    entityType: value.entityType,
    status: value.status,
    incorporationReference: value.incorporationReference,
    capTableReference: value.capTableReference,
    founderAuthority: value.founderAuthority,
    publicWebsite: value.publicWebsite,
  };
}

function ventureSummary(value: Venture): VentureSummary {
  return {
    id: value.id,
    legalEntityId: value.legalEntityId,
    name: value.name,
    category: value.category,
    utility: value.utility,
    stage: value.stage,
    status: value.status,
    publicUrl: value.publicUrl,
    defaultNarrativeProfileId: value.defaultNarrativeProfileId,
    currentDemoVersionId: value.currentDemoVersionId,
  };
}

function narrativeSummary(value: NarrativeProfile): NarrativeProfileSummary {
  return {
    id: value.id,
    legalEntityId: value.legalEntityId,
    ventureId: value.ventureId,
    purpose: value.purpose,
    version: value.version,
    approvalState: value.approvalState,
    contentSha256: value.contentSha256,
    approvedAt: value.approvedAt,
    descriptions: {
      words50: value.description50,
      words100: value.description100,
      words250: value.description250,
    },
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
}

function canonicalDemoVersionSummary(
  value: CanonicalDemoVersion,
): CanonicalDemoVersionSummary {
  return {
    id: value.id,
    demoId: value.demoId,
    version: value.version,
    baselineRepository: value.baselineRepository,
    baselineCommitSha: value.baselineCommitSha,
    branchConvention: value.branchConvention,
    expectedBaselineHours: value.expectedBaselineHours,
    coreAssets: [...value.coreAssets],
    evidenceRequirements: [...value.evidenceRequirements],
    approvedClaims: [...value.approvedClaims],
    contentSha256: value.contentSha256,
    approvalState: value.approvalState,
    approvedAt: value.approvedAt,
  };
}

function canonicalDemoSummary(value: CanonicalDemoWithVersions): CanonicalDemoSummary {
  return {
    id: value.id,
    name: value.name,
    category: value.category,
    status: value.status,
    versions: value.versions.map(canonicalDemoVersionSummary),
  };
}

function capitalMandateSummary(value: CapitalMandate): CapitalMandateSummary {
  return {
    id: value.id,
    roundId: value.roundId,
    legalEntityId: value.legalEntityId,
    ventureId: value.ventureId,
    narrativeProfileId: value.narrativeProfileId,
    stage: value.stage,
    targetAmountUsd: value.targetAmountUsd,
    minimumCheckUsd: value.minimumCheckUsd,
    maximumCheckUsd: value.maximumCheckUsd,
    instrument: value.instrument,
    tokenSideLetterPolicy: value.tokenSideLetterPolicy,
    geographies: [...value.geographies],
    targetCloseDate: value.targetCloseDate,
    status: value.status,
    approvedUseOfFunds: value.approvedUseOfFunds,
  };
}

function backfillChanged(result: {
  createdLegalEntityId: string | null;
  createdVentureId: string | null;
  createdNarrativeIds: string[];
  createdMandateIds: string[];
}): boolean {
  return Boolean(
    result.createdLegalEntityId ||
      result.createdVentureId ||
      result.createdNarrativeIds.length ||
      result.createdMandateIds.length,
  );
}

export class VentureService {
  readonly #vault: VaultService;
  readonly #resourceDirectory: string;
  readonly #now: () => Date;

  constructor(options: VentureServiceOptions) {
    this.#vault = options.vault;
    this.#resourceDirectory = options.resourceDirectory;
    this.#now = options.now ?? (() => new Date());
  }

  #repository(): VentureRepository {
    return new VentureRepository(this.#vault.vault);
  }

  async bootstrap(): Promise<VentureBootstrap> {
    const repository = this.#repository();
    const backfill = repository.backfillLegacyAuthority(this.#now().toISOString());
    if (backfillChanged(backfill)) await this.#vault.persist();
    const currentRound = this.#vault.vault.one<{ id: string }>(
      `SELECT id FROM rounds
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 ELSE 2 END,created_at
       LIMIT 1`,
    );
    const activeMandate = currentRound
      ? repository.getMandateForRound(currentRound.id)
      : null;
    return {
      legalEntities: repository.listLegalEntities().map(legalEntitySummary),
      ventures: repository.listVentures().map(ventureSummary),
      narrativeProfiles: repository.listNarrativeProfiles().map(narrativeSummary),
      canonicalDemos: repository.listCanonicalDemos().map(canonicalDemoSummary),
      capitalMandates: repository.listCapitalMandates().map(capitalMandateSummary),
      activeCapitalMandateId: activeMandate?.id ?? null,
    };
  }

  async saveLegalEntity(input: LegalEntitySaveInput): Promise<LegalEntitySummary> {
    const repository = this.#repository();
    const now = this.#now().toISOString();
    const id = input.id ?? `legal-entity:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM legal_entities WHERE id=?',
      [id],
    );
    const saved = repository.upsertLegalEntity({
      id,
      legalName: input.legalName,
      displayName: input.displayName,
      jurisdiction: input.jurisdiction,
      entityType: input.entityType,
      status: input.status,
      incorporationReference: input.incorporationReference,
      capTableReference: input.capTableReference,
      founderAuthority: input.founderAuthority,
      publicWebsite: input.publicWebsite,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return legalEntitySummary(saved);
  }

  async saveVenture(input: VentureSaveInput): Promise<VentureSummary> {
    const repository = this.#repository();
    const now = this.#now().toISOString();
    const id = input.id ?? `venture:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM ventures WHERE id=?',
      [id],
    );
    const saved = repository.upsertVenture({
      id,
      legalEntityId: input.legalEntityId,
      name: input.name,
      category: input.category,
      utility: input.utility,
      stage: input.stage,
      status: input.status,
      publicUrl: input.publicUrl,
      defaultNarrativeProfileId: input.defaultNarrativeProfileId,
      currentDemoVersionId: input.currentDemoVersionId,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return ventureSummary(saved);
  }

  async createNarrativeVersion(
    input: NarrativeVersionCreateInput,
  ): Promise<NarrativeProfileSummary> {
    const now = this.#now().toISOString();
    const created = this.#repository().createNarrativeVersion({
      id: input.id ?? `narrative:${randomUUID()}`,
      legalEntityId: input.legalEntityId,
      ventureId: input.ventureId,
      purpose: input.purpose,
      description50: input.descriptions.words50,
      description100: input.descriptions.words100,
      description250: input.descriptions.words250,
      problem: input.problem,
      productWedge: input.productWedge,
      whyNow: input.whyNow,
      technicalDifferentiation: input.technicalDifferentiation,
      evidenceFraming: input.evidenceFraming,
      businessModel: input.businessModel,
      useOfFunds: input.useOfFunds,
      claimsBoundary: input.claimsBoundary,
      deckReference: input.deckReference,
      demoReference: input.demoReference,
      createdAt: now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return narrativeSummary(created);
  }

  async approveNarrative(
    id: string,
    expectedDigest: string,
  ): Promise<NarrativeProfileSummary> {
    const digest = Sha256Schema.parse(expectedDigest);
    const repository = this.#repository();
    const current = repository.listNarrativeProfiles().find((item) => item.id === id);
    if (!current) throw new Error('Narrative profile does not exist');
    if (current.contentSha256 !== digest) {
      throw new Error('Narrative content changed after founder review');
    }
    const approved = repository.approveNarrativeVersion(
      current.id,
      'founder',
      this.#now().toISOString(),
    );
    await this.#vault.persist();
    return narrativeSummary(approved);
  }

  async importCanonicalDefaults(
    expectedPackageDigest: string,
  ): Promise<CanonicalDemoSummary[]> {
    const expected = Sha256Schema.parse(expectedPackageDigest);
    const path = join(
      this.#resourceDirectory,
      'rndrntwrk',
      'canonical-demos.json',
    );
    const metadata = await stat(path);
    if (!metadata.isFile()) throw new Error('Canonical demo seed must be a regular file');
    if (metadata.size <= 0 || metadata.size > MAX_CANONICAL_DEMO_SEED_BYTES) {
      throw new Error('Canonical demo seed is outside the supported size bounds');
    }
    let input: unknown;
    try {
      input = JSON.parse(await readFile(path, 'utf8')) as unknown;
    } catch {
      throw new Error('Canonical demo seed contains invalid JSON');
    }
    const currentDigest = canonicalDemoSeedDigest(input);
    if (currentDigest !== expected) {
      throw new Error('Canonical demo package digest does not match founder review');
    }
    const repository = this.#repository();
    importCanonicalDemoSeed(repository, input, {
      importedAt: this.#now().toISOString(),
      founderId: 'founder',
    });
    await this.#vault.persist();
    return repository.listCanonicalDemos().map(canonicalDemoSummary);
  }

  async createCanonicalDemoVersion(
    input: CanonicalDemoVersionCreateInput,
  ): Promise<CanonicalDemoVersionSummary> {
    const now = this.#now().toISOString();
    const created = this.#repository().createCanonicalDemoVersion({
      id: input.id ?? `canonical-demo-version:${randomUUID()}`,
      demoId: input.demoId,
      baselineRepository: input.baselineRepository,
      baselineCommitSha: input.baselineCommitSha,
      branchConvention: input.branchConvention,
      expectedBaselineHours: input.expectedBaselineHours,
      coreAssets: input.coreAssets,
      evidenceRequirements: input.evidenceRequirements,
      approvedClaims: input.approvedClaims,
      createdAt: now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return canonicalDemoVersionSummary(created);
  }

  async approveCanonicalDemo(
    id: string,
    expectedDigest: string,
  ): Promise<CanonicalDemoVersionSummary> {
    const digest = Sha256Schema.parse(expectedDigest);
    const repository = this.#repository();
    const current = repository
      .listCanonicalDemos()
      .flatMap((demo) => demo.versions)
      .find((version) => version.id === id);
    if (!current) throw new Error('Canonical demo version does not exist');
    if (current.contentSha256 !== digest) {
      throw new Error('Canonical demo content changed after founder review');
    }
    const approved = repository.approveCanonicalDemoVersion(
      current.id,
      'founder',
      this.#now().toISOString(),
    );
    await this.#vault.persist();
    return canonicalDemoVersionSummary(approved);
  }

  async saveCapitalMandate(
    input: CapitalMandateSaveInput,
  ): Promise<CapitalMandateSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `capital-mandate:${input.roundId}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM capital_mandates WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertCapitalMandate({
      id,
      roundId: input.roundId,
      legalEntityId: input.legalEntityId,
      ventureId: input.ventureId,
      narrativeProfileId: input.narrativeProfileId,
      stage: input.stage,
      targetAmountUsd: input.targetAmountUsd,
      minimumCheckUsd: input.minimumCheckUsd,
      maximumCheckUsd: input.maximumCheckUsd,
      instrument: input.instrument,
      tokenSideLetterPolicy: input.tokenSideLetterPolicy,
      geographies: input.geographies,
      targetCloseDate: input.targetCloseDate,
      status: input.status,
      approvedUseOfFunds: input.approvedUseOfFunds,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return capitalMandateSummary(saved);
  }
}
