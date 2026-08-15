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

const TERMINAL_STATES = new Set(['won', 'not_selected', 'withdrawn', 'converted', 'archived']);

function splitTechnologies(value: string | null): string[] {
  return value
    ? value
        .split(/[,;|]/u)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : [];
}

function defaultEligibilityProfile(
  entry: CoreHackathonEntryDetail,
  repository: HackathonRepository,
  evaluatedAt: string,
): EligibilityProfile {
  const cycle = repository.listCycles().find((item) => item.id === entry.cycleId);
  const technologies = repository
    .listBounties(entry.cycleId)
    .filter((bounty) => entry.bountyIds.includes(bounty.id))
    .flatMap((bounty) => splitTechnologies(bounty.requiredTechnology));
  const attendanceMode =
    cycle?.format === 'online' || cycle?.format === 'in_person' || cycle?.format === 'hybrid'
      ? cycle.format
      : 'unknown';
  return {
    evaluatedAt,
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
    availableArtifacts: entry.assets
      .filter((asset) => asset.status === 'ready' || asset.status === 'approved')
      .map((asset) => asset.kind),
  };
}

export class HackathonService {
  readonly #vault: VaultService;
  readonly #now: () => Date;
  readonly #profileProvider: EligibilityProfileProvider | null;

  constructor(options: HackathonServiceOptions) {
    this.#vault = options.vault;
    this.#now = options.now ?? (() => new Date());
    this.#profileProvider = options.eligibilityProfileProvider ?? null;
  }

  #repository(): HackathonRepository {
    return new HackathonRepository(this.#vault.vault);
  }

  #timestamp(): string {
    return this.#now().toISOString();
  }

  #createdAt(table: string, idColumn: string, id: string, fallback: string): string {
    const allowed = new Map([
      ['hackathon_cycles:id', true],
      ['hackathon_tracks:id', true],
      ['hackathon_bounties:id', true],
      ['hackathon_rules:id', true],
      ['hackathon_distribution_items:id', true],
    ]);
    if (!allowed.has(`${table}:${idColumn}`)) throw new Error('Unsupported timestamp lookup');
    const value = this.#vault.vault.scalar(
      `SELECT created_at FROM ${table} WHERE ${idColumn}=?`,
      [id],
    );
    return typeof value === 'string' ? value : fallback;
  }

  async #persist<T>(value: T): Promise<T> {
    await this.#vault.persist();
    return value;
  }

  #readiness(detail: CoreHackathonEntryDetail): HackathonReadinessSummary {
    const repository = this.#repository();
    const cycle = repository.listCycles().find((item) => item.id === detail.cycleId);
    const currentRulesSha256 = cycle?.rulesSha256 ?? null;
    const evaluation = currentRulesSha256
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
      eligibility: evaluation
        ? {
            status: evaluation.status,
            rulesSnapshotSha256: evaluation.rulesSnapshotSha256,
            founderReviewState: evaluation.founderReviewState,
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

  async bootstrap(): Promise<
    Pick<HackathonBootstrap, 'hackathonCycles' | 'hackathonEntries' | 'hackathonPortfolio'>
  > {
    const repository = this.#repository();
    const cycles = repository.listCycles();
    const entries = repository.listEntries();
    const details = entries.map((entry) => this.#detail(entry.id));
    const now = this.#now().valueOf();
    const nextDeadlineAt =
      cycles
        .map((cycle) => cycle.submissionDeadlineAt)
        .filter((value): value is string => value !== null && Date.parse(value) >= now)
        .sort()[0] ?? null;
    const hackathonPortfolio: HackathonPortfolioMetrics = {
      openUpcomingRollingCycles: cycles.filter((cycle) =>
        ['announced', 'registration', 'building', 'submission'].includes(cycle.state),
      ).length,
      candidateEntries: entries.filter((entry) => entry.state === 'candidate').length,
      approvedActiveBuilds: details.filter(
        (entry) => entry.build && ['approved', 'active'].includes(entry.build.status),
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
          !TERMINAL_STATES.has(entry.state) && entry.readiness.blockingReasons.length > 0,
      ).length,
      estimatedActiveHours: entries
        .filter((entry) =>
          ['approved', 'scoped', 'building', 'verification', 'submission_ready'].includes(entry.state),
        )
        .reduce((sum, entry) => sum + entry.estimatedHours, 0),
    };
    return { hackathonCycles: cycles, hackathonEntries: entries, hackathonPortfolio };
  }

  async saveCycle(input: HackathonCycleSaveInput): Promise<HackathonCycleSummary> {
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-cycle:${randomUUID()}`;
    return this.#persist(
      this.#repository().upsertCycle({
        ...input,
        id,
        createdAt: this.#createdAt('hackathon_cycles', 'id', id, now),
        updatedAt: now,
      }),
    );
  }

  async saveTrack(input: HackathonTrackSaveInput): Promise<HackathonTrackSummary> {
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-track:${randomUUID()}`;
    return this.#persist(
      this.#repository().upsertTrack({
        ...input,
        id,
        createdAt: this.#createdAt('hackathon_tracks', 'id', id, now),
        updatedAt: now,
      }),
    );
  }

  async saveSponsor(input: HackathonSponsorSaveInput): Promise<HackathonSponsorSummary> {
    const now = this.#timestamp();
    const createdAt = this.#vault.vault.scalar(
      'SELECT created_at FROM hackathon_sponsors WHERE cycle_id=? AND organization_id=?',
      [input.cycleId, input.organizationId],
    );
    return this.#persist(
      this.#repository().upsertSponsor({
        ...input,
        createdAt: typeof createdAt === 'string' ? createdAt : now,
        updatedAt: now,
      }),
    );
  }

  async saveBounty(input: HackathonBountySaveInput): Promise<HackathonBountySummary> {
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-bounty:${randomUUID()}`;
    return this.#persist(
      this.#repository().upsertBounty({
        ...input,
        id,
        createdAt: this.#createdAt('hackathon_bounties', 'id', id, now),
        updatedAt: now,
      }),
    );
  }

  async saveRule(input: HackathonRuleSaveInput): Promise<HackathonRuleSummary> {
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-rule:${randomUUID()}`;
    return this.#persist(
      this.#repository().upsertRule({
        ...input,
        id,
        reviewState: 'pending',
        reviewedAt: null,
        createdAt: this.#createdAt('hackathon_rules', 'id', id, now),
        updatedAt: now,
      }),
    );
  }

  async reviewRule(id: string, decision: 'accept' | 'reject'): Promise<HackathonRuleSummary> {
    return this.#persist(
      this.#repository().reviewRule(
        id,
        decision === 'accept' ? 'accepted' : 'rejected',
        this.#timestamp(),
      ),
    );
  }

  async createEntry(input: HackathonEntryCreateCommand): Promise<HackathonEntrySummary> {
    const authority = new VentureRepository(this.#vault.vault);
    const legalEntity = authority.listLegalEntities().find((item) => item.id === input.legalEntityId);
    if (!legalEntity) throw new Error('Selected hackathon legal entity does not exist');
    const ventures = authority.listVentures();
    const lead = ventures.find((item) => item.id === input.leadVentureId);
    if (!lead || lead.legalEntityId !== input.legalEntityId) {
      throw new Error('Lead venture must belong to the selected legal entity');
    }
    const supportingIds = new Set(input.supportingVentureIds);
    if (supportingIds.size !== input.supportingVentureIds.length || supportingIds.has(lead.id)) {
      throw new Error('Supporting ventures must be unique and cannot repeat the lead venture');
    }
    const supporting = ventures.filter((item) => supportingIds.has(item.id));
    if (
      supporting.length !== supportingIds.size ||
      supporting.some((item) => item.legalEntityId !== input.legalEntityId)
    ) {
      throw new Error('Every supporting venture must exist under the selected legal entity');
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
    const demo = authority
      .listCanonicalDemos()
      .flatMap((item) => item.versions)
      .find((item) => item.id === input.canonicalDemoVersionId);
    if (!demo || demo.approvalState !== 'approved') {
      throw new Error('Entry requires an approved canonical demo version');
    }

    const repository = this.#repository();
    const trackIds = new Set(repository.listTracks(input.cycleId).map((item) => item.id));
    if (input.trackIds.some((id) => !trackIds.has(id))) {
      throw new Error('Every selected track must belong to the hackathon cycle');
    }
    const bountyIds = new Set(repository.listBounties(input.cycleId).map((item) => item.id));
    if (input.bountyIds.some((id) => !bountyIds.has(id))) {
      throw new Error('Every selected bounty must belong to the hackathon cycle');
    }

    const now = this.#timestamp();
    const id = input.id ?? `hackathon-entry:${randomUUID()}`;
    const summary = this.#vault.vault.transaction(() => {
      repository.createEntry({
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
        { entryId: id, ventureId: lead.id, role: 'lead', createdAt: now },
        ...supporting.map((item) => ({
          entryId: id,
          ventureId: item.id,
          role: 'supporting' as const,
          createdAt: now,
        })),
      ]);
      repository.replaceEntryTracks(id, input.trackIds, now);
      repository.replaceEntryBounties(id, input.bountyIds, now);
      const entry = repository.listEntries({ cycleId: input.cycleId }).find((item) => item.id === id);
      if (!entry) throw new Error('Hackathon entry was not persisted');
      return entry;
    });
    return this.#persist(summary);
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
        evaluatedAt: this.#timestamp(),
      }),
    };
  }

  async evaluateEligibility(id: string): Promise<HackathonEligibilitySummary> {
    const repository = this.#repository();
    const entry = repository.getEntry(id);
    if (!entry) throw new Error(`Hackathon entry ${id} does not exist`);
    const rules = repository.listRules(entry.cycleId);
    const evaluatedAt = this.#timestamp();
    const profile = this.#profileProvider
      ? await this.#profileProvider({ entry, rules, evaluatedAt })
      : defaultEligibilityProfile(entry, repository, evaluatedAt);
    const result = evaluateHackathonEligibility({ ...profile, evaluatedAt }, rules);
    return this.#persist(
      repository.saveEligibilityEvaluation({
        id: `hackathon-eligibility:${randomUUID()}`,
        entryId: id,
        status: result.status,
        evaluatedAt,
        rulesSnapshotSha256: result.rulesSnapshotSha256,
        detail: result.details.map((item) => ({ ...item })),
        founderReviewState: 'pending',
        reviewedAt: null,
      }),
    );
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
    const reviewedAt = this.#timestamp();
    return this.#persist(
      repository.saveEligibilityEvaluation({
        ...current,
        founderReviewState: decision === 'accept' ? 'accepted' : 'rejected',
        reviewedAt,
      }),
    );
  }

  async decideEntry(input: HackathonEntryDecisionCommand): Promise<HackathonEntrySummary> {
    return this.#persist(
      this.#repository().decideEntry({ ...input, decidedAt: this.#timestamp() }),
    );
  }

  async transitionEntry(input: HackathonEntryTransitionCommand): Promise<HackathonEntrySummary> {
    return this.#persist(
      this.#repository().transitionEntry({ ...input, transitionedAt: this.#timestamp() }),
    );
  }

  async saveBuild(input: HackathonBuildSaveInput): Promise<HackathonBuildSummary> {
    const repository = this.#repository();
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-build:${randomUUID()}`;
    const existing = repository.getEntry(input.entryId)?.build;
    const current = existing?.id === id ? existing : null;
    const requiresApproval = ['approved', 'active', 'completed'].includes(input.status);
    return this.#persist(
      repository.saveBuild({
        ...input,
        id,
        approvedBy: requiresApproval ? (current?.approvedBy ?? 'founder') : (current?.approvedBy ?? null),
        approvedAt: requiresApproval ? (current?.approvedAt ?? now) : (current?.approvedAt ?? null),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  async saveAsset(input: HackathonAssetSaveInput): Promise<HackathonAssetSummary> {
    if (input.status === 'approved' && input.reviewDecision !== 'accept') {
      throw new Error('Approved hackathon assets require an explicit founder acceptance');
    }
    const repository = this.#repository();
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-asset:${randomUUID()}`;
    const existing = repository.getEntry(input.entryId)?.assets.find((item) => item.id === id);
    const founderReviewState =
      input.reviewDecision === 'accept'
        ? 'accepted'
        : input.reviewDecision === 'reject'
          ? 'rejected'
          : 'pending';
    return this.#persist(
      repository.saveAsset({
        id,
        entryId: input.entryId,
        kind: input.kind,
        required: input.required,
        status: input.reviewDecision === 'reject' ? 'rejected' : input.status,
        reference: input.reference,
        contentSha256: input.contentSha256,
        founderReviewState,
        reviewedAt: founderReviewState === 'pending' ? null : now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  async saveDistribution(
    input: HackathonDistributionSaveInput,
  ): Promise<HackathonDistributionSummary> {
    const repository = this.#repository();
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-distribution:${input.entryId}`;
    const existing = repository.getEntry(input.entryId)?.distributionPlan;
    const requiresApproval = ['approved', 'active', 'completed'].includes(input.status);
    return this.#persist(
      repository.saveDistributionPlan({
        ...input,
        id,
        approvedBy: requiresApproval ? (existing?.approvedBy ?? 'founder') : (existing?.approvedBy ?? null),
        approvedAt: requiresApproval ? (existing?.approvedAt ?? now) : (existing?.approvedAt ?? null),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  async saveDistributionItem(
    input: HackathonDistributionItemSaveInput,
  ): Promise<HackathonDistributionItemSummary> {
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-distribution-item:${randomUUID()}`;
    return this.#persist(
      this.#repository().saveDistributionItem({
        ...input,
        id,
        createdAt: this.#createdAt('hackathon_distribution_items', 'id', id, now),
        updatedAt: now,
      }),
    );
  }

  async saveSubmission(input: HackathonSubmissionSaveInput): Promise<HackathonSubmissionSummary> {
    const repository = this.#repository();
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-submission:${input.entryId}`;
    const existing = repository.getEntry(input.entryId)?.submission;
    return this.#persist(
      repository.saveSubmission({
        ...input,
        id,
        submittedAt: input.submittedAt ?? now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  async saveResult(input: HackathonResultSaveInput): Promise<HackathonResultSummary> {
    const repository = this.#repository();
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-result:${input.entryId}`;
    const existing = repository.getEntry(input.entryId)?.result;
    return this.#persist(
      repository.saveResult({
        ...input,
        id,
        recordedAt: input.recordedAt ?? now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  async saveConversion(
    input: HackathonConversionSaveInput,
  ): Promise<HackathonConversionSummary> {
    const repository = this.#repository();
    const now = this.#timestamp();
    const id = input.id ?? `hackathon-conversion:${randomUUID()}`;
    const existing = repository
      .getEntry(input.entryId)
      ?.conversions.find((item) => item.id === id);
    return this.#persist(
      repository.saveConversion({
        ...input,
        id,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  async getEntry(id: string): Promise<HackathonEntryDetail> {
    return this.#detail(id);
  }
}
