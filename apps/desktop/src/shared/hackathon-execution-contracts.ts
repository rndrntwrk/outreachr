import type {
  CompleteFounderAppBootstrap,
  CompleteFounderCommandMap,
  CompleteFounderCommandName,
  CompleteFounderCommandResult,
  DistributionItemStatus,
  DistributionPhase,
  DistributionPlanStatus,
  EvidenceReviewState,
  HackathonAssetStatus,
  HackathonAssetSummary,
  HackathonBuildStatus,
  HackathonBuildSummary,
  HackathonCiState,
  HackathonConversionKind,
  HackathonConversionStatus,
  HackathonConversionSummary,
  HackathonResultOutcome,
  HackathonResultSummary,
  HackathonSubmissionStatus,
  HackathonSubmissionSummary,
  MergeDecision,
  SecurityReviewState,
  DistributionItemSummary,
  DistributionPlanSummary,
} from './hackathon-contracts';

export interface HackathonBuildSaveInput {
  id?: string;
  entryId: string;
  status: HackathonBuildStatus;
  repository: string;
  baseCommitSha: string;
  branchName: string;
  worktreeReference: string | null;
  adapterPath: string | null;
  ownerAgent: string | null;
  toolPolicy: Record<string, unknown>;
  budgetUsd: number | null;
  budgetHours: number | null;
  startConditions: string;
  stopConditions: string;
  currentCommitSha: string | null;
  ciState: HackathonCiState;
  securityReviewState: SecurityReviewState;
  evidenceManifestSha256: string | null;
  mergeDecision: MergeDecision;
  approved: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface HackathonAssetSaveInput {
  id?: string;
  entryId: string;
  kind: string;
  required: boolean;
  status: HackathonAssetStatus;
  reference: string | null;
  contentSha256: string | null;
  founderReviewState: EvidenceReviewState;
}

export interface DistributionPlanSaveInput {
  id?: string;
  entryId: string;
  summary: string;
  status: DistributionPlanStatus;
  contentSha256: string;
  approved: boolean;
}

export interface DistributionItemSaveInput {
  id?: string;
  planId: string;
  kind: string;
  phase: DistributionPhase;
  status: DistributionItemStatus;
  title: string;
  scheduledAt: string | null;
  completedAt: string | null;
  reference: string | null;
}

export interface HackathonSubmissionRecordInput {
  id?: string;
  entryId: string;
  portalUrl: string;
  submittedAt: string;
  narrativeProfileId: string;
  canonicalDemoVersionId: string;
  repositoryCommitSha: string;
  receiptAssetId: string;
  contentSha256: string;
  status: HackathonSubmissionStatus;
}

export interface HackathonResultRecordInput {
  id?: string;
  entryId: string;
  outcome: HackathonResultOutcome;
  placement: string | null;
  prizeValue: number | null;
  prizeAsset: string | null;
  credits: string[];
  invitations: string[];
  recordedAt: string;
}

export interface HackathonConversionRecordInput {
  id?: string;
  entryId: string;
  kind: HackathonConversionKind;
  organizationId: string | null;
  title: string;
  detail: string | null;
  valueUsd: number | null;
  status: HackathonConversionStatus;
  referenceUrl: string | null;
  occurredAt: string | null;
}

export interface HackathonExecutionCommandMap {
  'hackathon.build.save': HackathonBuildSaveInput;
  'hackathon.asset.save': HackathonAssetSaveInput;
  'hackathon.distributionPlan.save': DistributionPlanSaveInput;
  'hackathon.distributionItem.save': DistributionItemSaveInput;
  'hackathon.submission.record': HackathonSubmissionRecordInput;
  'hackathon.result.record': HackathonResultRecordInput;
  'hackathon.conversion.record': HackathonConversionRecordInput;
}

export interface HackathonExecutionCommandResultMap {
  'hackathon.build.save': HackathonBuildSummary;
  'hackathon.asset.save': HackathonAssetSummary;
  'hackathon.distributionPlan.save': DistributionPlanSummary;
  'hackathon.distributionItem.save': DistributionItemSummary;
  'hackathon.submission.record': HackathonSubmissionSummary;
  'hackathon.result.record': HackathonResultSummary;
  'hackathon.conversion.record': HackathonConversionSummary;
}

export type FounderOperationsCommandMap = CompleteFounderCommandMap & HackathonExecutionCommandMap;
export type FounderOperationsCommandName = keyof FounderOperationsCommandMap;
export type FounderOperationsCommandResult<K extends FounderOperationsCommandName> =
  K extends keyof HackathonExecutionCommandResultMap
    ? HackathonExecutionCommandResultMap[K]
    : K extends CompleteFounderCommandName
      ? CompleteFounderCommandResult<K>
      : never;
export type FounderOperationsBootstrap = CompleteFounderAppBootstrap;
