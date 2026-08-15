import { randomUUID } from 'node:crypto';

import {
  HackathonRepository,
  VentureRepository,
  calculateHackathonReadiness,
  calculateHackathonScore,
  evaluateHackathonEligibility,
  type EligibilityProfile,
  type HackathonEntryDetail as CoreHackathonEntryDetail,
  type HackathonRule,
} from '@outreachr/core';
import type {
  HackathonAssetSaveInput,
  HackathonAssetSummary,
  HackathonBootstrap,
  HackathonBountySaveInput,
  HackathonBountySummary,
  HackathonBuildSaveInput,
  HackathonBuildSummary,
  HackathonConversionSaveInput,
  HackathonConversionSummary,
  HackathonCycleSaveInput,
  HackathonCycleSummary,
  HackathonDistributionItemSaveInput,
  HackathonDistributionItemSummary,
  HackathonDistributionSaveInput,
  HackathonDistributionSummary,
  HackathonEligibilitySummary,
  HackathonEntryCreateCommand,
  HackathonEntryDecisionCommand,
  HackathonEntryDetail,
  HackathonEntrySummary,
  HackathonEntryTransitionCommand,
  HackathonPortfolioMetrics,
  HackathonReadinessSummary,
  HackathonResultSaveInput,
  HackathonResultSummary,
  HackathonRuleSaveInput,
  HackathonRuleSummary,
  HackathonSponsorSaveInput,
  HackathonSponsorSummary,
  HackathonSubmissionSaveInput,
  HackathonSubmissionSummary,
  HackathonTrackSaveInput,
  HackathonTrackSummary,
} from '../shared/hackathon-contracts';
import type { VaultService } from './vault-service';

export type EligibilityProfileProvider = (context: {
  entry: CoreHackathonEntryDetail;
  rules: readonly HackathonRule[];
  evaluatedAt: string;
}) => EligibilityProfile | Promise<EligibilityProfile>;

interface HackathonServiceOptions {
  vault: VaultService;
  now?: () => Date;
  eligibilityProfileProvider?: EligibilityProfileProvider;
}

const TERMINAL_ENTRY_STATES = new Set([
  'won',
  'not_selected',
  'withdrawn',
  'converted',
  'archived',
]);

function splitTechnologies(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/u)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function defaultEligibilityProfile(context: {
  entry: CoreHackathonEntryDetail;
  rules: readonly HackathonRule[];
  evaluatedAt: string;
}, repository: HackathonRepository): EligibilityProfile {
  const cycle = repository.listCycles().find((item) => item.id === context.entry.cycleId);
  const technologies = repository
    .listBounties(context.entry.cycleId)
    .filter((bounty) => context.entry.bountyIds.includes(bounty.id))
    .flatMap((bounty) => splitTechnologies(bounty.requiredTechnology));
  const attendanceMode =
    cycle?.format === 'online' || cycle?.format === 'in_person' || cycle?.format === 'hybrid'
      ? cycle.format
      : 'unknown';
  return {
    evaluatedAt: context.evaluatedAt,
    country: null,
    founderAge: null,
    isStudent: null,
    companyFoundedOn: null,
    teamSize: 1,
    usesExistingCode: true,
    willOpenSource: null,
    technologies: [...new Set(technologies)],
    attendanceMode,
    canAttendInPerson: null,
    priorFundingUsd: null,
    participantIds: ['founder'],
    submissionLanguage: 'en',
    availableArtifacts: context.entry.assets
      .filter((asset) => asset.status === 'ready' || asset.status === 'approved')
      .map((asset) => asset.kind),
  };
}

export class HackathonService {
  readonly #vault: VaultService;
  readonly #now: () => Date;
  readonly #eligibilityProfileProvider: EligibilityProfileProvider | null;

  constructor(options: HackathonServiceOptions) {
    this.#vault = options.vault;
    this.#now = options.now ?? (() => new Date());
    this.#eligibilityProfileProvider = options.eligibilityProfileProvider ?? null;
  }

  #repository(): HackathonRepository {
    return new HackathonRepository(this.#vault.vault);
  }

  #readiness(detail: CoreHackathonEntryDetail): HackathonReadinessSummary {
    const repository = this.#repository();
    const cycle = repository.listCycles().find((item) => item.id === detail.cycleId);
    const currentRulesSha256 = cycle?.rulesSha256 ?? null;
    const eligibility = currentRulesSha256
      ? detail.eligibilityEvaluations.find(
          (item) => item.rulesSnapshotSha256 === currentRulesSha256,
        ) ?? null
      : null;
    const pendingBlockingRules = Number(
      this.#vault.vault.scalar(
        `SELECT COUNT(*) FROM hackathon_rules WHERE cycle_id=? AND blocking=1
         AND (review_state!='accepted' OR confidence IN ('unknown','stale'))`,
        [detail.cycleId],
      ) ?? 0,
    );
    return calculateHackathonReadiness({
      founderDecision: detail.founderDecision,
      hasLeadVenture: detail.leadVentureId !== null,
      narrativeApproved: Boolean(
        this.#vault.vault.scalar(
          "SELECT 1 FROM narrative_profiles WHERE id=? AND purpose='hackathon' AND approval_state='approved'",
          [detail.narrativeProfileId],
        ),
      ),
      demoApproved: Boolean(
        this.#vault.vault.scalar(
          "SELECT 1 FROM canonical_demo_versions WHERE id=? AND approval_state='approved'",
          [detail.canonicalDemoVersionId],
        ),
      ),
      currentRulesSha256,
      eligibility: eligibility
        ? {
            status: eligibility.status,
            rulesSnapshotSha256: eligibility.rulesSnapshotSha256,
            founderReviewState: eligibility.founderReviewState,
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
        .filter((asset) => asset.required)
        .map((asset) => ({
          id: asset.id,
          status: asset.status,
          founderReviewState: asset.founderReviewState,
        })),
      distributionPlanStatus: detail.distributionPlan?.status ?? null,
      distributionItemPhases: detail.distributionItems
        .filter((item) => item.status !== 'cancelled')
        .map((item) => item.phase),
      receiptRecorded: detail.submission !== null,
    });
  }

  #detail(id: string): HackathonEntryDetail {
    const detail = this.#repository().getEntry(id);
    if (!detail) throw new Error(`Hackathon entry ${id} does not exist`);
    return { ...detail, readiness: this.#readiness(detail) };
  }

  async bootstrap(): Promise<Pick<HackathonBootstrap, 'hackathonCycles' | 'hackathonEntries' | 'hackathonPortfolio'>> {
    const repository = this.#repository();
    const cycles = repository.listCycles();
    const entries = repository.listEntries();
    const details = entries.map((entry) => this.#detail(entry.id));
    const now = this.#now().valueOf();
    const nextDeadlineAt = cycles
      .map((cycle) => cycle.submissionDeadlineAt)
      .filter((value): value is string => Boolean(value) && Date.parse(value) >= now)
      .sort()[0] ?? null;
    const metrics: HackathonPortfolioMetrics = {
      openUpcomingRollingCycles: cycles.filter((cycle) =>
        ['announced', 'registration', 'building', 'submission'].includes(cycle.state),
      ).length,
      candidateEntries: entries.filter((entry) => entry.state === 'candidate').length,
      approvedActiveBuilds: details.filter((entry) =>
        entry.build ? ['approved', 'active'].includes(entry.build.status) : false,
      ).length,
      submissionReadyEntries: entries.filter((entry) => entry.state === 'submission_ready').length,
      submittedEntries: entries.filter((entry) =>
        ['submitted', 'judging', 'finalist', 'won', 'not_selected', 'converted'].includes(entry.state),
      ).length,
      finalistsWins: entries.filter((entry) => entry.state === 'finalist' || entry.state === 'won')
        .length,
      nextDeadlineAt,
      blockedEntries: details.filter(
        (entry) =>
          !TERMINAL_ENTRY_STATES.has(entry.state) && entry.readiness.blockingReasons.length > 0,
      ).length,
      estimatedActiveHours: entries
        .filter((entry) =>
          ['approved', 'scoped', 'building', 'verification', 'submission_ready'].includes(entry.state),
        )
        .reduce((sum, entry) => sum + entry.estimatedHours, 0),
    };
    return {
      hackathonCycles: cycles,
      hackathonEntries: entries,
      hackathonPortfolio: metrics,
    };
  }

  async saveCycle(input: HackathonCycleSaveInput): Promise<HackathonCycleSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-cycle:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_cycles WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertCycle({
      ...input,
      id,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveTrack(input: HackathonTrackSaveInput): Promise<HackathonTrackSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-track:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_tracks WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertTrack({
      ...input,
      id,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveSponsor(input: HackathonSponsorSaveInput): Promise<HackathonSponsorSummary> {
    const now = this.#now().toISOString();
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_sponsors WHERE cycle_id=? AND organization_id=?',
      [input.cycleId, input.organizationId],
    );
    const saved = this.#repository().upsertSponsor({
      ...input,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveBounty(input: HackathonBountySaveInput): Promise<HackathonBountySummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-bounty:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_bounties WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertBounty({
      ...input,
      id,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveRule(input: HackathonRuleSaveInput): Promise<HackathonRuleSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-rule:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_rules WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertRule({
      ...input,
      id,
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async reviewRule(id: string, decision: 'accept' | 'reject'): Promise<HackathonRuleSummary> {
    const saved = this.#repository().reviewRule(
      id,
      decision === 'accept' ? 'accepted' : 'rejected',
      this.#now().toISOString(),
    );
    await this.#vault.persist();
    return saved;
  }

  async createEntry(input: HackathonEntryCreateCommand): Promise<HackathonEntrySummary> {
    const authority = new VentureRepository(this.#vault.vault);
    const legalEntity = authority.listLegalEntities().find((item) => item.id === input.legalEntityId);
    if (!legalEntity) throw new Error('Selected hackathon legal entity does not exist');
    const leadVenture = authority.listVentures().find((item) => item.id === input.leadVentureId);
    if (!leadVenture || leadVenture.legalEntityId !== input.legalEntityId) {
      throw new Error('Lead venture must belong to the selected legal entity');
    }
    const supporting = authority
      .listVentures()
      .filter((item) => input.supportingVentureIds.includes(item.id));
    if (supporting.length !== new Set(input.supportingVentureIds).size) {
      throw new Error('Every supporting venture must exist');
    }
    const narrative = authority
      .listNarrativeProfiles(input.leadVentureId)
      .find((item) => item.id === input.narrativeProfileId);
    if (
      !narrative ||
      narrative.legalEntityId !== input.legalEntityId ||
      narrative.purpose !== 'hackathon' ||
      narrative.approvalState !== 'approved'
    ) {
      throw new Error('Entry requires an approved hackathon narrative for its authority');
    }
    const demoVersion = authority
      .listCanonicalDemos()
      .flatMap((demo) => demo.versions)
      .find((version) => version.id === input.canonicalDemoVersionId);
    if (!demoVersion || demoVersion.approvalState !== 'approved') {
      throw new Error('Entry requires an approved canonical demo version');
    }

    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-entry:${randomUUID()}`;
    const repository = this.#repository();
    const created = this.#vault.vault.transaction(() => {
      const entry = repository.createEntry({
        id,
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
      repository.replaceEntryVentures(id, [
        { entryId: id, ventureId: input.leadVentureId, role: 'lead', createdAt: now },
        ...input.supportingVentureIds.map((ventureId) => ({
          entryId: id,
          ventureId,
          role: 'supporting' as const,
          createdAt: now,
        })),
      ]);
      repository.replaceEntryTracks(id, input.trackIds, now);
      repository.replaceEntryBounties(id, input.bountyIds, now);
      return repository.getEntry(entry.id)!;
    });
    await this.#vault.persist();
    const { readiness: _readiness, ...summary } = this.#detail(created.id);
    return summary;
  }

  async scoreEntry(id: string): Promise<{ id: string; weightedScore: number }> {
    const entry = this.#detail(id);
    const cycle = this.#repository().listCycles().find((item) => item.id === entry.cycleId);
    return {
      id,
      weightedScore: calculateHackathonScore({
        strategicFit: entry.strategicFit,
        acceptanceProbability: entry.acceptanceProbability,
        capitalUpside: entry.capitalUpside,
        distributionUpside: entry.distributionUpside,
        technicalLeverage: entry.technicalLeverage,
        credibility: entry.credibility,
        urgency: entry.urgency,
        effortEfficiency: entry.effortEfficiency,
        lockInSafety: entry.lockInSafety,
        reusePercentage: entry.reusePercentage,
        estimatedHours: entry.estimatedHours,
        deadline: cycle?.submissionDeadlineAt ?? null,
        evaluatedAt: this.#now().toISOString(),
      }),
    };
  }

  async evaluateEligibility(id: string): Promise<HackathonEligibilitySummary> {
    const repository = this.#repository();
    const detail = repository.getEntry(id);
    if (!detail) throw new Error(`Hackathon entry ${id} does not exist`);
    const rules = repository.listRules(detail.cycleId);
    const evaluatedAt = this.#now().toISOString();
    const context = { entry: detail, rules, evaluatedAt };
    const profile = this.#eligibilityProfileProvider
      ? await this.#eligibilityProfileProvider(context)
      : defaultEligibilityProfile(context, repository);
    const result = evaluateHackathonEligibility({ ...profile, evaluatedAt }, rules);
    const saved = repository.saveEligibilityEvaluation({
      id: `hackathon-eligibility:${randomUUID()}`,
      entryId: id,
      status: result.status,
      evaluatedAt,
      rulesSnapshotSha256: result.rulesSnapshotSha256,
      detail: result.details.map((item) => ({ ...item })),
      founderReviewState: 'pending',
      reviewedAt: null,
    });
    await this.#vault.persist();
    return saved;
  }

  async reviewEligibility(
    id: string,
    decision: 'accept' | 'reject',
  ): Promise<HackathonEligibilitySummary> {
    const repository = this.#repository();
    const entry = repository
      .listEntries()
      .map((item) => repository.getEntry(item.id)!)
      .find((item) => item.eligibilityEvaluations.some((evaluation) => evaluation.id === id));
    const current = entry?.eligibilityEvaluations.find((evaluation) => evaluation.id === id);
    if (!current) throw new Error('Hackathon eligibility evaluation does not exist');
    const reviewedAt = this.#now().toISOString();
    const saved = repository.saveEligibilityEvaluation({
      ...current,
      founderReviewState: decision === 'accept' ? 'accepted' : 'rejected',
      reviewedAt,
    });
    await this.#vault.persist();
    return saved;
  }

  async decideEntry(input: HackathonEntryDecisionCommand): Promise<HackathonEntrySummary> {
    const saved = this.#repository().decideEntry({
      id: input.id,
      decision: input.decision,
      rationale: input.rationale,
      decidedAt: this.#now().toISOString(),
    });
    await this.#vault.persist();
    return saved;
  }

  async transitionEntry(input: HackathonEntryTransitionCommand): Promise<HackathonEntrySummary> {
    const saved = this.#repository().transitionEntry({
      id: input.id,
      toState: input.toState,
      transitionedAt: this.#now().toISOString(),
    });
    await this.#vault.persist();
    return saved;
  }

  async saveBuild(input: HackathonBuildSaveInput): Promise<HackathonBuildSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-build:${randomUUID()}`;
    const detail = this.#repository().getEntry(input.entryId);
    const existing = detail?.build?.id === id ? detail.build : null;
    const requiresApproval = ['approved', 'active', 'completed'].includes(input.status);
    const saved = this.#repository().saveBuild({
      ...input,
      id,
      approvedBy: requiresApproval ? (existing?.approvedBy ?? 'founder') : (existing?.approvedBy ?? null),
      approvedAt: requiresApproval ? (existing?.approvedAt ?? now) : (existing?.approvedAt ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveAsset(input: HackathonAssetSaveInput): Promise<HackathonAssetSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-asset:${randomUUID()}`;
    const existing = this.#repository().getEntry(input.entryId)?.assets.find((item) => item.id === id);
    if (input.status === 'approved' && input.reviewDecision !== 'accept') {
      throw new Error('Approved hackathon assets require an explicit founder acceptance');
    }
    const reviewState =
      input.reviewDecision === 'accept'
        ? 'accepted'
        : input.reviewDecision === 'reject'
          ? 'rejected'
          : 'pending';
    const saved = this.#repository().saveAsset({
      id,
      entryId: input.entryId,
      kind: input.kind,
      required: input.required,
      status: input.reviewDecision === 'reject' ? 'rejected' : input.status,
      reference: input.reference,
      contentSha256: input.contentSha256,
      founderReviewState: reviewState,
      reviewedAt: reviewState === 'pending' ? null : now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveDistribution(
    input: HackathonDistributionSaveInput,
  ): Promise<HackathonDistributionSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-distribution:${input.entryId}`;
    const existing = this.#repository().getEntry(input.entryId)?.distributionPlan;
    const requiresApproval = ['approved', 'active', 'completed'].includes(input.status);
    const saved = this.#repository().saveDistributionPlan({
      ...input,
      id,
      approvedBy: requiresApproval ? (existing?.approvedBy ?? 'founder') : (existing?.approvedBy ?? null),
      approvedAt: requiresApproval ? (existing?.approvedAt ?? now) : (existing?.approvedAt ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveDistributionItem(
    input: HackathonDistributionItemSaveInput,
  ): Promise<HackathonDistributionItemSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-distribution-item:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_distribution_items WHERE id=?',
      [id],
    );
    const saved = this.#repository().saveDistributionItem({
      ...input,
      id,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveSubmission(input: HackathonSubmissionSaveInput): Promise<HackathonSubmissionSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-submission:${input.entryId}`;
    const existing = this.#repository().getEntry(input.entryId)?.submission;
    const saved = this.#repository().saveSubmission({
      ...input,
      id,
      submittedAt: input.submittedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveResult(input: HackathonResultSaveInput): Promise<HackathonResultSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-result:${input.entryId}`;
    const existing = this.#repository().getEntry(input.entryId)?.result;
    const saved = this.#repository().saveResult({
      ...input,
      id,
      recordedAt: input.recordedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveConversion(
    input: HackathonConversionSaveInput,
  ): Promise<HackathonConversionSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-conversion:${randomUUID()}`;
    const existing = this.#repository()
      .getEntry(input.entryId)
      ?.conversions.find((item) => item.id === id);
    const saved = this.#repository().saveConversion({
      ...input,
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async getEntry(id: string): Promise<HackathonEntryDetail> {
    return this.#detail(id);
  }
}
