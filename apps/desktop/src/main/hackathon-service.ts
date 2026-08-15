import { randomUUID } from 'node:crypto';

import {
  HackathonRepository,
  VentureRepository,
  calculateHackathonReadiness,
  evaluateHackathonEligibility,
  type DistributionItem,
  type DistributionPlan,
  type EligibilityEvaluation,
  type HackathonAsset,
  type HackathonBounty,
  type HackathonBuild,
  type HackathonConversion,
  type HackathonCycle,
  type HackathonEntryDetail as CoreHackathonEntryDetail,
  type HackathonEntrySummary as CoreHackathonEntrySummary,
  type HackathonResult,
  type HackathonRule,
  type HackathonSponsor,
  type HackathonSubmission,
  type HackathonTrack,
  type NarrativeProfile,
  type CanonicalDemoVersion,
  type Venture,
  type LegalEntity,
} from '@outreachr/core';
import type {
  DistributionItemSummary,
  DistributionPlanSummary,
  EligibilityProfileInput,
  HackathonAssetSummary,
  HackathonBootstrap,
  HackathonBountySummary,
  HackathonBuildSummary,
  HackathonConversionSummary,
  HackathonCycleSaveInput,
  HackathonCycleSummary,
  HackathonEligibilitySummary,
  HackathonEntryCreateCommand,
  HackathonEntryDetail,
  HackathonEntrySummary,
  HackathonPortfolioMetrics,
  HackathonReadinessSummary,
  HackathonResultSummary,
  HackathonRuleSummary,
  HackathonSponsorSummary,
  HackathonSubmissionSummary,
  HackathonTrackSummary,
  OpportunitySaveInput,
  OpportunitySummary,
  OrganizationSaveInput,
  OrganizationSummary,
} from '../shared/hackathon-contracts';
import { OpportunityService } from './opportunity-service';
import type { VaultService } from './vault-service';

interface HackathonServiceOptions {
  vault: VaultService;
  now?: () => Date;
}

interface AuthorityIndex {
  legalEntities: Map<string, LegalEntity>;
  ventures: Map<string, Venture>;
  narratives: Map<string, NarrativeProfile>;
  demoVersions: Map<string, { demoId: string; demoName: string; value: CanonicalDemoVersion }>;
}

function trackSummary(value: HackathonTrack): HackathonTrackSummary {
  return {
    id: value.id,
    cycleId: value.cycleId,
    name: value.name,
    goals: value.goals,
    judgingCriteria: [...value.judgingCriteria],
  };
}

function sponsorSummary(
  value: HackathonSponsor,
  organizations: ReadonlyMap<string, OrganizationSummary>,
): HackathonSponsorSummary {
  return {
    cycleId: value.cycleId,
    organizationId: value.organizationId,
    organizationName: organizations.get(value.organizationId)?.name ?? 'Unknown organization',
    contactPersonId: value.contactPersonId,
    relationshipState: value.relationshipState,
  };
}

function bountySummary(
  value: HackathonBounty,
  organizations: ReadonlyMap<string, OrganizationSummary>,
  tracks: ReadonlyMap<string, HackathonTrack>,
): HackathonBountySummary {
  return {
    id: value.id,
    cycleId: value.cycleId,
    sponsorOrganizationId: value.sponsorOrganizationId,
    sponsorName: value.sponsorOrganizationId
      ? (organizations.get(value.sponsorOrganizationId)?.name ?? null)
      : null,
    trackId: value.trackId,
    trackName: value.trackId ? (tracks.get(value.trackId)?.name ?? null) : null,
    title: value.title,
    amountValue: value.amountValue,
    amountAsset: value.amountAsset,
    requiredTechnology: value.requiredTechnology,
    eligibility: value.eligibility,
    judgingCriteria: value.judgingCriteria,
    submissionRequirements: value.submissionRequirements,
    sourceId: value.sourceId,
    freshnessState: value.freshnessState,
    conflictLockInNotes: value.conflictLockInNotes,
  };
}

function ruleSummary(value: HackathonRule): HackathonRuleSummary {
  return {
    id: value.id,
    cycleId: value.cycleId,
    ruleType: value.ruleType,
    value: value.value,
    blocking: value.blocking,
    sourceId: value.sourceId,
    observedAt: value.observedAt,
    confidence: value.confidence,
    reviewState: value.reviewState,
    reviewedAt: value.reviewedAt,
  };
}

function eligibilitySummary(value: EligibilityEvaluation): HackathonEligibilitySummary {
  return {
    id: value.id,
    entryId: value.entryId,
    status: value.status,
    evaluatedAt: value.evaluatedAt,
    rulesSnapshotSha256: value.rulesSnapshotSha256,
    detail: value.detail.map((item) => ({
      ruleId: item.ruleId,
      ruleType: item.ruleType,
      blocking: item.blocking,
      status: item.status,
      reason: item.reason,
    })),
    founderReviewState: value.founderReviewState,
    reviewedAt: value.reviewedAt,
  };
}

function buildSummary(value: HackathonBuild): HackathonBuildSummary {
  return {
    id: value.id,
    entryId: value.entryId,
    status: value.status,
    repository: value.repository,
    baseCommitSha: value.baseCommitSha,
    branchName: value.branchName,
    worktreeReference: value.worktreeReference,
    adapterPath: value.adapterPath,
    ownerAgent: value.ownerAgent,
    toolPolicy: value.toolPolicy,
    budgetUsd: value.budgetUsd,
    budgetHours: value.budgetHours,
    startConditions: value.startConditions,
    stopConditions: value.stopConditions,
    currentCommitSha: value.currentCommitSha,
    ciState: value.ciState as HackathonBuildSummary['ciState'],
    securityReviewState: value.securityReviewState,
    evidenceManifestSha256: value.evidenceManifestSha256,
    mergeDecision: value.mergeDecision as HackathonBuildSummary['mergeDecision'],
    approvedBy: value.approvedBy,
    approvedAt: value.approvedAt,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
  };
}

function assetSummary(value: HackathonAsset): HackathonAssetSummary {
  return {
    id: value.id,
    entryId: value.entryId,
    kind: value.kind,
    required: value.required,
    status: value.status as HackathonAssetSummary['status'],
    reference: value.reference,
    contentSha256: value.contentSha256,
    founderReviewState: value.founderReviewState,
    reviewedAt: value.reviewedAt,
  };
}

function distributionPlanSummary(value: DistributionPlan): DistributionPlanSummary {
  return {
    id: value.id,
    entryId: value.entryId,
    summary: value.summary,
    status: value.status,
    contentSha256: value.contentSha256,
    approvedBy: value.approvedBy,
    approvedAt: value.approvedAt,
  };
}

function distributionItemSummary(value: DistributionItem): DistributionItemSummary {
  return {
    id: value.id,
    planId: value.planId,
    kind: value.kind,
    phase: value.phase as DistributionItemSummary['phase'],
    status: value.status,
    title: value.title,
    scheduledAt: value.scheduledAt,
    completedAt: value.completedAt,
    reference: value.reference,
  };
}

function submissionSummary(value: HackathonSubmission): HackathonSubmissionSummary {
  return {
    id: value.id,
    entryId: value.entryId,
    portalUrl: value.portalUrl,
    submittedAt: value.submittedAt,
    narrativeProfileId: value.narrativeProfileId,
    canonicalDemoVersionId: value.canonicalDemoVersionId,
    repositoryCommitSha: value.repositoryCommitSha,
    receiptAssetId: value.receiptAssetId,
    contentSha256: value.contentSha256,
    status: value.status,
  };
}

function resultSummary(value: HackathonResult): HackathonResultSummary {
  return {
    id: value.id,
    entryId: value.entryId,
    outcome: value.outcome,
    placement: value.placement,
    prizeValue: value.prizeValue,
    prizeAsset: value.prizeAsset,
    credits: [...value.credits],
    invitations: [...value.invitations],
    recordedAt: value.recordedAt,
  };
}

function conversionSummary(
  value: HackathonConversion,
  organizations: ReadonlyMap<string, OrganizationSummary>,
): HackathonConversionSummary {
  return {
    id: value.id,
    entryId: value.entryId,
    kind: value.kind,
    organizationId: value.organizationId,
    organizationName: value.organizationId
      ? (organizations.get(value.organizationId)?.name ?? null)
      : null,
    title: value.title,
    detail: value.detail,
    valueUsd: value.valueUsd,
    status: value.status,
    referenceUrl: value.referenceUrl,
    occurredAt: value.occurredAt,
  };
}

export class HackathonService {
  readonly #vault: VaultService;
  readonly #now: () => Date;
  readonly #opportunities: OpportunityService;

  constructor(options: HackathonServiceOptions) {
    this.#vault = options.vault;
    this.#now = options.now ?? (() => new Date());
    this.#opportunities = new OpportunityService({ vault: options.vault, now: this.#now });
  }

  #repository(): HackathonRepository {
    return new HackathonRepository(this.#vault.vault);
  }

  #authority(): AuthorityIndex {
    const repository = new VentureRepository(this.#vault.vault);
    const demoVersions = new Map<
      string,
      { demoId: string; demoName: string; value: CanonicalDemoVersion }
    >();
    for (const demo of repository.listCanonicalDemos()) {
      for (const version of demo.versions) {
        demoVersions.set(version.id, { demoId: demo.id, demoName: demo.name, value: version });
      }
    }
    return {
      legalEntities: new Map(repository.listLegalEntities().map((value) => [value.id, value])),
      ventures: new Map(repository.listVentures().map((value) => [value.id, value])),
      narratives: new Map(repository.listNarrativeProfiles().map((value) => [value.id, value])),
      demoVersions,
    };
  }

  async saveOrganization(input: OrganizationSaveInput): Promise<OrganizationSummary> {
    return this.#opportunities.saveOrganization(input);
  }

  async saveOpportunity(input: OpportunitySaveInput): Promise<OpportunitySummary> {
    return this.#opportunities.saveOpportunity(input);
  }

  async saveCycle(input: HackathonCycleSaveInput): Promise<HackathonCycleSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-cycle:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string; rules_sha256: string | null }>(
      'SELECT created_at,rules_sha256 FROM hackathon_cycles WHERE id=?',
      [id],
    );
    this.#repository().upsertCycle({
      id,
      opportunityId: input.opportunityId,
      cycleName: input.cycleName,
      registrationOpenAt: input.registrationOpenAt,
      registrationCloseAt: input.registrationCloseAt,
      buildStartAt: input.buildStartAt,
      buildEndAt: input.buildEndAt,
      submissionDeadlineAt: input.submissionDeadlineAt,
      judgingStartAt: input.judgingStartAt,
      judgingEndAt: input.judgingEndAt,
      demoDayAt: input.demoDayAt,
      resultAt: input.resultAt,
      format: input.format,
      location: input.location,
      state: input.state,
      rulesSourceId: input.rulesSourceId,
      rulesRetrievedAt: input.rulesRetrievedAt,
      rulesSha256: existing?.rules_sha256 ?? null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const cycle = (await this.bootstrap()).cycles.find((value) => value.id === id);
    if (!cycle) throw new Error('Saved hackathon cycle could not be read back');
    return cycle;
  }

  async saveTrack(input: Omit<HackathonTrackSummary, 'id'> & { id?: string }): Promise<HackathonTrackSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-track:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_tracks WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertTrack({
      id,
      cycleId: input.cycleId,
      name: input.name,
      goals: input.goals,
      judgingCriteria: input.judgingCriteria,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return trackSummary(saved);
  }

  async saveSponsor(
    input: Omit<HackathonSponsorSummary, 'organizationName'>,
  ): Promise<HackathonSponsorSummary> {
    const now = this.#now().toISOString();
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_sponsors WHERE cycle_id=? AND organization_id=?',
      [input.cycleId, input.organizationId],
    );
    const saved = this.#repository().upsertSponsor({
      cycleId: input.cycleId,
      organizationId: input.organizationId,
      contactPersonId: input.contactPersonId,
      relationshipState: input.relationshipState,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const organizations = new Map(
      this.#opportunities.summaries().organizations.map((value) => [value.id, value]),
    );
    return sponsorSummary(saved, organizations);
  }

  async saveBounty(
    input: Omit<HackathonBountySummary, 'id' | 'sponsorName' | 'trackName'> & { id?: string },
  ): Promise<HackathonBountySummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-bounty:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_bounties WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertBounty({
      id,
      cycleId: input.cycleId,
      sponsorOrganizationId: input.sponsorOrganizationId,
      trackId: input.trackId,
      title: input.title,
      amountValue: input.amountValue,
      amountAsset: input.amountAsset,
      requiredTechnology: input.requiredTechnology,
      eligibility: input.eligibility,
      judgingCriteria: input.judgingCriteria,
      submissionRequirements: input.submissionRequirements,
      sourceId: input.sourceId,
      freshnessState: input.freshnessState,
      conflictLockInNotes: input.conflictLockInNotes,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const repository = this.#repository();
    const organizations = new Map(
      this.#opportunities.summaries().organizations.map((value) => [value.id, value]),
    );
    const tracks = new Map(repository.listTracks(saved.cycleId).map((value) => [value.id, value]));
    return bountySummary(saved, organizations, tracks);
  }

  async saveRule(input: {
    id?: string;
    cycleId: string;
    ruleType: HackathonRuleSummary['ruleType'];
    value: unknown;
    blocking: boolean;
    sourceId: string | null;
    observedAt: string | null;
    confidence: HackathonRuleSummary['confidence'];
  }): Promise<HackathonRuleSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-rule:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_rules WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertRule({
      id,
      cycleId: input.cycleId,
      ruleType: input.ruleType,
      value: input.value,
      blocking: input.blocking,
      sourceId: input.sourceId,
      observedAt: input.observedAt,
      confidence: input.confidence,
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return ruleSummary(saved);
  }

  async reviewRule(
    id: string,
    decision: 'accepted' | 'rejected',
  ): Promise<HackathonRuleSummary> {
    const reviewed = this.#repository().reviewRule(id, decision, this.#now().toISOString());
    await this.#vault.persist();
    return ruleSummary(reviewed);
  }

  async createEntry(input: HackathonEntryCreateCommand): Promise<HackathonEntrySummary> {
    const now = this.#now().toISOString();
    const authority = this.#authority();
    const legalEntity = authority.legalEntities.get(input.legalEntityId);
    if (!legalEntity) throw new Error('Selected hackathon legal entity does not exist');
    const leadVenture = authority.ventures.get(input.leadVentureId);
    if (!leadVenture || leadVenture.legalEntityId !== legalEntity.id) {
      throw new Error('Lead venture must belong to the selected hackathon legal entity');
    }
    const supportingVentureIds = [
      ...new Set(input.supportingVentureIds.filter((id) => id !== input.leadVentureId)),
    ];
    for (const ventureId of supportingVentureIds) {
      const venture = authority.ventures.get(ventureId);
      if (!venture || venture.legalEntityId !== legalEntity.id) {
        throw new Error('Supporting ventures must belong to the selected hackathon legal entity');
      }
    }
    const narrative = authority.narratives.get(input.narrativeProfileId);
    if (
      !narrative ||
      narrative.legalEntityId !== legalEntity.id ||
      narrative.ventureId !== leadVenture.id ||
      narrative.purpose !== 'hackathon' ||
      narrative.approvalState !== 'approved'
    ) {
      throw new Error('Hackathon entry requires an approved hackathon narrative for the lead venture');
    }
    const demo = authority.demoVersions.get(input.canonicalDemoVersionId);
    if (!demo || demo.value.approvalState !== 'approved') {
      throw new Error('Hackathon entry requires an approved canonical demo version');
    }

    const repository = this.#repository();
    const entryId = input.id ?? `hackathon-entry:${randomUUID()}`;
    this.#vault.vault.transaction(() => {
      repository.createEntry({
        id: entryId,
        cycleId: input.cycleId,
        legalEntityId: input.legalEntityId,
        narrativeProfileId: input.narrativeProfileId,
        canonicalDemoVersionId: input.canonicalDemoVersionId,
        submissionConcept: input.submissionConcept,
        userOutcome: input.userOutcome,
        ecosystemAdapter: input.ecosystemAdapter,
        estimatedHours: input.estimatedHours,
        reusePercentage: input.reusePercentage,
        strategicFit: input.strategicFit,
        acceptanceProbability: input.acceptanceProbability,
        capitalUpside: input.capitalUpside,
        distributionUpside: input.distributionUpside,
        technicalLeverage: input.technicalLeverage,
        credibility: input.credibility,
        urgency: input.urgency,
        effortEfficiency: input.effortEfficiency,
        lockInSafety: input.lockInSafety,
        createdAt: now,
        updatedAt: now,
      });
      repository.replaceEntryVentures(entryId, [
        { entryId, ventureId: leadVenture.id, role: 'lead', createdAt: now },
        ...supportingVentureIds.map((ventureId) => ({
          entryId,
          ventureId,
          role: 'supporting' as const,
          createdAt: now,
        })),
      ]);
      repository.replaceEntryTracks(entryId, input.trackIds, now);
      repository.replaceEntryBounties(entryId, input.bountyIds, now);
    });
    await this.#vault.persist();
    return this.getEntry(entryId);
  }

  async evaluateEligibility(
    entryId: string,
    profile: EligibilityProfileInput,
  ): Promise<HackathonEligibilitySummary> {
    const repository = this.#repository();
    const entry = repository.getEntry(entryId);
    if (!entry) throw new Error('Hackathon entry does not exist');
    const rules = repository.listRules(entry.cycleId);
    if (!rules.length) throw new Error('Eligibility cannot be evaluated without reviewed rules');
    const evaluatedAt = this.#now().toISOString();
    const result = evaluateHackathonEligibility({ ...profile, evaluatedAt }, rules);
    const saved = repository.saveEligibilityEvaluation({
      id: `hackathon-eligibility:${randomUUID()}`,
      entryId,
      status: result.status,
      evaluatedAt: result.evaluatedAt,
      rulesSnapshotSha256: result.rulesSnapshotSha256,
      detail: result.details,
      founderReviewState: 'pending',
      reviewedAt: null,
    });
    await this.#vault.persist();
    return eligibilitySummary(saved);
  }

  async reviewEligibility(
    evaluationId: string,
    decision: 'accepted' | 'rejected',
  ): Promise<HackathonEligibilitySummary> {
    const repository = this.#repository();
    let evaluation: EligibilityEvaluation | null = null;
    for (const entry of repository.listEntries()) {
      const detail = repository.getEntry(entry.id);
      const candidate = detail?.eligibilityEvaluations.find((value) => value.id === evaluationId);
      if (candidate) {
        evaluation = candidate;
        break;
      }
    }
    if (!evaluation) throw new Error('Eligibility evaluation does not exist');
    if (evaluation.founderReviewState !== 'pending') {
      if (evaluation.founderReviewState === decision) return eligibilitySummary(evaluation);
      throw new Error('Reviewed eligibility evaluation cannot be changed');
    }
    const saved = repository.saveEligibilityEvaluation({
      ...evaluation,
      founderReviewState: decision,
      reviewedAt: this.#now().toISOString(),
    });
    await this.#vault.persist();
    return eligibilitySummary(saved);
  }

  async decideEntry(input: {
    id: string;
    decision: 'go' | 'conditional_go' | 'no_go';
    rationale: string | null;
  }): Promise<HackathonEntrySummary> {
    this.#repository().decideEntry({
      id: input.id,
      decision: input.decision,
      rationale: input.rationale,
      decidedAt: this.#now().toISOString(),
    });
    await this.#vault.persist();
    return this.getEntry(input.id);
  }

  async transitionEntry(input: {
    id: string;
    toState: HackathonEntrySummary['state'];
  }): Promise<HackathonEntrySummary> {
    this.#repository().transitionEntry({
      id: input.id,
      toState: input.toState as never,
      transitionedAt: this.#now().toISOString(),
    });
    await this.#vault.persist();
    return this.getEntry(input.id);
  }

  async createLocalHackathonFixture(input: {
    organizerName: string;
    opportunityName: string;
    cycleName: string;
    submissionDeadlineAt: string;
  }): Promise<{ organizationId: string; opportunityId: string; cycleId: string }> {
    const organization = await this.saveOrganization({
      name: input.organizerName,
      kind: 'foundation',
      website: null,
      description: 'Founder-created local hackathon organizer.',
      linkedFirmId: null,
      isPublic: false,
      contributionEligible: false,
    });
    const opportunity = await this.saveOpportunity({
      organizerOrganizationId: organization.id,
      name: input.opportunityName,
      opportunityType: 'hackathon',
      status: 'open',
      publicUrl: null,
      applicationUrl: null,
      openDate: null,
      deadline: input.submissionDeadlineAt.slice(0, 10),
      startDate: null,
      endDate: null,
      format: 'online',
      location: null,
      eligibilitySummary: null,
      termsSummary: null,
      capitalPrizeSummary: null,
      freshnessState: 'current',
      reviewState: 'reviewed',
    });
    const cycle = await this.saveCycle({
      opportunityId: opportunity.id,
      cycleName: input.cycleName,
      registrationOpenAt: null,
      registrationCloseAt: null,
      buildStartAt: null,
      buildEndAt: null,
      submissionDeadlineAt: input.submissionDeadlineAt,
      judgingStartAt: null,
      judgingEndAt: null,
      demoDayAt: null,
      resultAt: null,
      format: 'online',
      location: null,
      state: 'building',
      rulesSourceId: null,
      rulesRetrievedAt: null,
    });
    return { organizationId: organization.id, opportunityId: opportunity.id, cycleId: cycle.id };
  }

  async getEntry(id: string): Promise<HackathonEntryDetail> {
    const detail = this.#repository().getEntry(id);
    if (!detail) throw new Error('Hackathon entry does not exist');
    return this.#mapEntry(detail);
  }

  #readiness(
    detail: CoreHackathonEntryDetail,
    authority: AuthorityIndex,
    cycle: HackathonCycle,
    pendingBlockingRules: number,
  ): HackathonReadinessSummary {
    const currentEligibility = detail.eligibilityEvaluations.find(
      (value) => value.rulesSnapshotSha256 === cycle.rulesSha256,
    );
    const narrative = authority.narratives.get(detail.narrativeProfileId);
    const demo = authority.demoVersions.get(detail.canonicalDemoVersionId)?.value;
    const readiness = calculateHackathonReadiness({
      founderDecision: detail.founderDecision,
      hasLeadVenture: detail.ventures.some((value) => value.role === 'lead'),
      narrativeApproved: narrative?.approvalState === 'approved',
      demoApproved: demo?.approvalState === 'approved',
      currentRulesSha256: cycle.rulesSha256,
      eligibility: currentEligibility
        ? {
            status: currentEligibility.status,
            rulesSnapshotSha256: currentEligibility.rulesSnapshotSha256,
            founderReviewState: currentEligibility.founderReviewState,
          }
        : null,
      pendingBlockingRules,
      build: detail.build
        ? {
            status: detail.build.status,
            ciState: detail.build.ciState,
            securityReviewState: detail.build.securityReviewState,
            evidenceManifestSha256: detail.build.evidenceManifestSha256,
            currentCommitSha: detail.build.currentCommitSha,
          }
        : null,
      requiredAssets: detail.assets
        .filter((value) => value.required)
        .map((value) => ({
          id: value.id,
          status: value.status,
          founderReviewState: value.founderReviewState,
        })),
      distributionPlanStatus: detail.distributionPlan?.status ?? null,
      distributionItemPhases: detail.distributionItems.map((value) => value.phase),
      receiptRecorded: detail.submission !== null,
    });
    return {
      approvalReady:
        readiness.authorityReady && readiness.decisionReady && readiness.eligibilityReady,
      scopeReady: readiness.authorityReady && readiness.decisionReady,
      buildReady: readiness.readyForBuild,
      verificationReady: readiness.technicalEvidenceReady,
      submissionReady: readiness.readyForSubmission,
      submissionRecorded: readiness.receiptReady,
      blockers: readiness.blockingReasons,
    };
  }

  #mapEntry(
    detail: CoreHackathonEntryDetail | CoreHackathonEntrySummary,
    preloaded?: {
      authority: AuthorityIndex;
      cycles: Map<string, HackathonCycle>;
      opportunities: Map<string, OpportunitySummary>;
      organizations: Map<string, OrganizationSummary>;
      rulesByCycle: Map<string, HackathonRule[]>;
    },
  ): HackathonEntryDetail {
    const repository = this.#repository();
    const full = 'ventures' in detail ? detail : repository.getEntry(detail.id);
    if (!full) throw new Error('Hackathon entry detail could not be read');
    const authority = preloaded?.authority ?? this.#authority();
    const cycle = preloaded?.cycles.get(full.cycleId) ?? repository.listCycles().find((v) => v.id === full.cycleId);
    if (!cycle) throw new Error('Hackathon entry cycle does not exist');
    const opportunitySummaries = preloaded?.opportunities ?? new Map(
      this.#opportunities.summaries().opportunities.map((value) => [value.id, value]),
    );
    const organizationSummaries = preloaded?.organizations ?? new Map(
      this.#opportunities.summaries().organizations.map((value) => [value.id, value]),
    );
    const opportunity = opportunitySummaries.get(cycle.opportunityId);
    if (!opportunity) throw new Error('Hackathon opportunity does not exist');
    const lead = full.ventures.find((value) => value.role === 'lead') ?? null;
    const supporting = full.ventures.filter((value) => value.role === 'supporting');
    const narrative = authority.narratives.get(full.narrativeProfileId);
    const demo = authority.demoVersions.get(full.canonicalDemoVersionId);
    const legalEntity = authority.legalEntities.get(full.legalEntityId);
    if (!narrative || !demo || !legalEntity) {
      throw new Error('Hackathon entry authority records are incomplete');
    }
    const rules = preloaded?.rulesByCycle.get(full.cycleId) ?? repository.listRules(full.cycleId);
    const pendingBlockingRules = rules.filter(
      (value) => value.blocking && value.reviewState === 'pending',
    ).length;
    const readiness = this.#readiness(full, authority, cycle, pendingBlockingRules);
    const currentEligibility = full.eligibilityEvaluations.find(
      (value) => value.rulesSnapshotSha256 === cycle.rulesSha256,
    );
    return {
      id: full.id,
      cycleId: full.cycleId,
      opportunityName: opportunity.name,
      cycleName: cycle.cycleName,
      organizerName: opportunity.organizerName,
      legalEntityId: full.legalEntityId,
      legalEntityName: legalEntity.displayName,
      leadVentureId: lead?.ventureId ?? null,
      leadVentureName: lead ? (authority.ventures.get(lead.ventureId)?.name ?? null) : null,
      supportingVentureIds: supporting.map((value) => value.ventureId),
      supportingVentureNames: supporting.map(
        (value) => authority.ventures.get(value.ventureId)?.name ?? value.ventureId,
      ),
      narrativeProfileId: narrative.id,
      narrativeVersion: narrative.version,
      narrativeDigest: narrative.contentSha256,
      canonicalDemoVersionId: demo.value.id,
      canonicalDemoId: demo.demoId,
      canonicalDemoName: demo.demoName,
      canonicalDemoVersion: demo.value.version,
      baselineRepository: demo.value.baselineRepository,
      baselineCommitSha: demo.value.baselineCommitSha,
      submissionConcept: full.submissionConcept,
      userOutcome: full.userOutcome,
      ecosystemAdapter: full.ecosystemAdapter,
      estimatedHours: full.estimatedHours,
      reusePercentage: full.reusePercentage,
      weightedScore: full.weightedScore,
      founderDecision: full.founderDecision,
      founderRationale: full.founderRationale,
      state: full.state as HackathonEntrySummary['state'],
      eligibilityStatus: currentEligibility?.status ?? null,
      nextDeadlineAt: cycle.submissionDeadlineAt,
      readiness,
      trackIds: full.trackIds,
      bountyIds: full.bountyIds,
      eligibilityEvaluations: full.eligibilityEvaluations.map(eligibilitySummary),
      build: full.build ? buildSummary(full.build) : null,
      assets: full.assets.map(assetSummary),
      distributionPlan: full.distributionPlan
        ? distributionPlanSummary(full.distributionPlan)
        : null,
      distributionItems: full.distributionItems.map(distributionItemSummary),
      submission: full.submission ? submissionSummary(full.submission) : null,
      result: full.result ? resultSummary(full.result) : null,
      conversions: full.conversions.map((value) => conversionSummary(value, organizationSummaries)),
    };
  }

  async bootstrap(): Promise<HackathonBootstrap> {
    const repository = this.#repository();
    const opportunityState = this.#opportunities.summaries();
    const organizations = new Map(opportunityState.organizations.map((value) => [value.id, value]));
    const opportunities = new Map(opportunityState.opportunities.map((value) => [value.id, value]));
    const cycles = repository.listCycles();
    const cycleById = new Map(cycles.map((value) => [value.id, value]));
    const authority = this.#authority();
    const rulesByCycle = new Map(cycles.map((value) => [value.id, repository.listRules(value.id)]));
    const entries = repository
      .listEntries()
      .map((value) =>
        this.#mapEntry(value, {
          authority,
          cycles: cycleById,
          opportunities,
          organizations,
          rulesByCycle,
        }),
      );
    const cycleSummaries: HackathonCycleSummary[] = cycles.map((cycle) => {
      const opportunity = opportunities.get(cycle.opportunityId);
      return {
        id: cycle.id,
        opportunityId: cycle.opportunityId,
        opportunityName: opportunity?.name ?? 'Unknown opportunity',
        organizerName: opportunity?.organizerName ?? null,
        cycleName: cycle.cycleName,
        registrationOpenAt: cycle.registrationOpenAt,
        registrationCloseAt: cycle.registrationCloseAt,
        buildStartAt: cycle.buildStartAt,
        buildEndAt: cycle.buildEndAt,
        submissionDeadlineAt: cycle.submissionDeadlineAt,
        judgingStartAt: cycle.judgingStartAt,
        judgingEndAt: cycle.judgingEndAt,
        demoDayAt: cycle.demoDayAt,
        resultAt: cycle.resultAt,
        format: cycle.format,
        location: cycle.location,
        state: cycle.state,
        rulesSourceId: cycle.rulesSourceId,
        rulesRetrievedAt: cycle.rulesRetrievedAt,
        rulesSha256: cycle.rulesSha256,
        entryCount: entries.filter((value) => value.cycleId === cycle.id).length,
        trackCount: repository.listTracks(cycle.id).length,
        bountyCount: repository.listBounties(cycle.id).length,
      };
    });
    const now = this.#now().toISOString();
    const activeStates = new Set([
      'approved',
      'scoped',
      'building',
      'verification',
      'submission_ready',
    ]);
    const nextDeadlineAt = cycleSummaries
      .map((value) => value.submissionDeadlineAt)
      .filter((value): value is string => Boolean(value) && value! >= now)
      .sort()[0] ?? null;
    const portfolio: HackathonPortfolioMetrics = {
      openUpcomingRollingCycles: cycleSummaries.filter((cycle) => {
        const opportunity = opportunities.get(cycle.opportunityId);
        return opportunity ? ['open', 'upcoming', 'rolling'].includes(opportunity.status) : false;
      }).length,
      candidateEntries: entries.filter((value) => value.state === 'candidate').length,
      activeBuilds: entries.filter((value) =>
        value.build ? ['approved', 'active'].includes(value.build.status) : false,
      ).length,
      submissionReadyEntries: entries.filter((value) => value.state === 'submission_ready').length,
      submittedEntries: entries.filter((value) =>
        ['submitted', 'judging', 'finalist', 'won', 'not_selected', 'converted', 'archived'].includes(
          value.state,
        ),
      ).length,
      finalistOrWinnerEntries: entries.filter((value) =>
        ['finalist', 'won'].includes(value.state),
      ).length,
      nextDeadlineAt,
      blockedEntries: entries.filter(
        (value) =>
          value.founderDecision === 'no_go' ||
          value.eligibilityStatus === 'ineligible' ||
          (activeStates.has(value.state) && value.readiness.blockers.length > 0),
      ).length,
      estimatedActiveHours: entries
        .filter((value) => activeStates.has(value.state))
        .reduce((sum, value) => sum + value.estimatedHours, 0),
    };
    return {
      organizations: opportunityState.organizations,
      opportunities: opportunityState.opportunities,
      cycles: cycleSummaries,
      entries,
      portfolio,
    };
  }
}
