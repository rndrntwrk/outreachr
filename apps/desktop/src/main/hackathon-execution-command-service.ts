import { z } from 'zod';

import type {
  FounderOperationsCommandResult,
  HackathonExecutionCommandMap,
} from '../shared/hackathon-execution-contracts';
import type { HackathonStudioService } from './hackathon-studio-service';

const id = z.string().trim().min(1).max(300);
const nullableId = id.nullable();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const gitSha = z.string().regex(/^[a-f0-9]{40}$/u);
const nullableSha256 = sha256.nullable();
const nullableGitSha = gitSha.nullable();
const nullableDateTime = z.string().datetime({ offset: true }).nullable();
const nullableUrl = z.string().trim().url().max(4_096).nullable();
const nullableText = z.string().max(1_000_000).nullable();

const buildSave = z
  .object({
    id: id.optional(),
    entryId: id,
    status: z.enum(['draft', 'approved', 'active', 'completed', 'cancelled']),
    repository: z.string().trim().min(1).max(4_096),
    baseCommitSha: gitSha,
    branchName: z.string().trim().min(1).max(2_000),
    worktreeReference: z.string().trim().min(1).max(4_096).nullable(),
    adapterPath: z.string().trim().min(1).max(4_096).nullable(),
    ownerAgent: z.string().trim().min(1).max(500).nullable(),
    toolPolicy: z.record(z.string(), z.unknown()),
    budgetUsd: z.number().nonnegative().nullable(),
    budgetHours: z.number().int().min(1).max(1_000).nullable(),
    startConditions: z.string().trim().min(1).max(1_000_000),
    stopConditions: z.string().trim().min(1).max(1_000_000),
    currentCommitSha: nullableGitSha,
    ciState: z.enum(['not_run', 'running', 'passed', 'failed', 'blocked']),
    securityReviewState: z.enum(['pending', 'passed', 'failed', 'not_required']),
    evidenceManifestSha256: nullableSha256,
    mergeDecision: z.enum(['pending', 'merge', 'do_not_merge', 'superseded']),
    approved: z.boolean(),
    startedAt: nullableDateTime,
    completedAt: nullableDateTime,
  })
  .strict()
  .superRefine((value, context) => {
    const requiresApproval = ['approved', 'active', 'completed'].includes(value.status);
    if (requiresApproval && !value.approved) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approved'],
        message: 'Approved, active and completed builds require founder approval',
      });
    }
    if (['active', 'completed'].includes(value.status) && value.currentCommitSha === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentCommitSha'],
        message: 'Active and completed builds require a current commit',
      });
    }
  });

const assetSave = z
  .object({
    id: id.optional(),
    entryId: id,
    kind: z.enum([
      'readme',
      'architecture_diagram',
      'demo_video',
      'technical_video',
      'screenshots',
      'live_demo_url',
      'repository',
      'pitch_deck',
      'form_answers',
      'founder_video',
      'budget',
      'evidence_manifest',
      'open_source_notice',
      'receipt',
      'result_announcement',
      'other',
    ]),
    required: z.boolean(),
    status: z.enum(['missing', 'draft', 'ready', 'approved', 'rejected']),
    reference: z.string().trim().min(1).max(4_096).nullable(),
    contentSha256: nullableSha256,
    founderReviewState: z.enum(['pending', 'accepted', 'rejected']),
  })
  .strict();

const distributionPlanSave = z
  .object({
    id: id.optional(),
    entryId: id,
    summary: z.string().trim().min(1).max(1_000_000),
    status: z.enum(['draft', 'approved', 'active', 'completed', 'cancelled']),
    contentSha256: sha256,
    approved: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (['approved', 'active', 'completed'].includes(value.status) && !value.approved) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approved'],
        message: 'Approved distribution plans require founder approval',
      });
    }
  });

const distributionItemSave = z
  .object({
    id: id.optional(),
    planId: id,
    kind: z.enum([
      'pre_build_announcement',
      'build_in_public_update',
      '555stream_session',
      'creator_partner_activation',
      'sponsor_acknowledgement',
      'technical_article',
      'product_article',
      'demo_clip',
      'x_thread',
      'arcade_activation',
      'submission_launch',
      'judge_follow_up',
      'sponsor_follow_up',
      'investor_update',
      'post_result_announcement',
      'grant_follow_up',
      'accelerator_follow_up',
      'pilot_follow_up',
      'open_source_release',
      'other',
    ]),
    phase: z.enum(['pre_event', 'submission_day', 'post_result']),
    status: z.enum(['planned', 'ready', 'published', 'cancelled']),
    title: z.string().trim().min(1).max(2_000),
    scheduledAt: nullableDateTime,
    completedAt: nullableDateTime,
    reference: z.string().trim().min(1).max(4_096).nullable(),
  })
  .strict();

const submissionRecord = z
  .object({
    id: id.optional(),
    entryId: id,
    portalUrl: z.string().trim().url().max(4_096),
    submittedAt: z.string().datetime({ offset: true }),
    narrativeProfileId: id,
    canonicalDemoVersionId: id,
    repositoryCommitSha: gitSha,
    receiptAssetId: id,
    contentSha256: sha256,
    status: z.enum(['submitted', 'accepted', 'rejected', 'withdrawn']),
  })
  .strict();

const resultRecord = z
  .object({
    id: id.optional(),
    entryId: id,
    outcome: z.enum(['finalist', 'won', 'not_selected', 'withdrawn', 'cancelled', 'other']),
    placement: z.string().trim().min(1).max(1_000).nullable(),
    prizeValue: z.number().nonnegative().nullable(),
    prizeAsset: z.string().trim().min(1).max(200).nullable(),
    credits: z.array(z.string().trim().min(1).max(10_000)).max(1_000),
    invitations: z.array(z.string().trim().min(1).max(10_000)).max(1_000),
    recordedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const conversionRecord = z
  .object({
    id: id.optional(),
    entryId: id,
    kind: z.enum([
      'grant',
      'accelerator',
      'pilot',
      'investor_meeting',
      'sponsor_relationship',
      'partner_integration',
      'user_growth',
      'media_coverage',
      'reusable_demo',
      'other',
    ]),
    organizationId: nullableId,
    title: z.string().trim().min(1).max(2_000),
    detail: nullableText,
    valueUsd: z.number().nonnegative().nullable(),
    status: z.enum(['identified', 'active', 'won', 'lost', 'completed']),
    referenceUrl: nullableUrl,
    occurredAt: nullableDateTime,
  })
  .strict();

const schemas = {
  'hackathon.build.save': buildSave,
  'hackathon.asset.save': assetSave,
  'hackathon.distributionPlan.save': distributionPlanSave,
  'hackathon.distributionItem.save': distributionItemSave,
  'hackathon.submission.record': submissionRecord,
  'hackathon.result.record': resultRecord,
  'hackathon.conversion.record': conversionRecord,
} satisfies Record<keyof HackathonExecutionCommandMap, z.ZodTypeAny>;

const commandNames = new Set<string>(Object.keys(schemas));

export function isHackathonExecutionCommand(
  name: string,
): name is keyof HackathonExecutionCommandMap {
  return commandNames.has(name);
}

export class HackathonExecutionCommandService {
  readonly #service: HackathonStudioService;

  constructor(service: HackathonStudioService) {
    this.#service = service;
  }

  async execute<K extends keyof HackathonExecutionCommandMap>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderOperationsCommandResult<K>> {
    const payload = schemas[name].parse(untrustedPayload);
    let result: unknown;
    switch (name) {
      case 'hackathon.build.save':
        result = await this.#service.saveBuild(
          payload as HackathonExecutionCommandMap['hackathon.build.save'],
        );
        break;
      case 'hackathon.asset.save':
        result = await this.#service.saveAsset(
          payload as HackathonExecutionCommandMap['hackathon.asset.save'],
        );
        break;
      case 'hackathon.distributionPlan.save':
        result = await this.#service.saveDistributionPlan(
          payload as HackathonExecutionCommandMap['hackathon.distributionPlan.save'],
        );
        break;
      case 'hackathon.distributionItem.save':
        result = await this.#service.saveDistributionItem(
          payload as HackathonExecutionCommandMap['hackathon.distributionItem.save'],
        );
        break;
      case 'hackathon.submission.record':
        result = await this.#service.recordSubmission(
          payload as HackathonExecutionCommandMap['hackathon.submission.record'],
        );
        break;
      case 'hackathon.result.record':
        result = await this.#service.recordResult(
          payload as HackathonExecutionCommandMap['hackathon.result.record'],
        );
        break;
      case 'hackathon.conversion.record':
        result = await this.#service.recordConversion(
          payload as HackathonExecutionCommandMap['hackathon.conversion.record'],
        );
        break;
      default:
        throw new Error(`Unsupported Hackathon Studio execution command: ${String(name)}`);
    }
    return result as FounderOperationsCommandResult<K>;
  }
}
