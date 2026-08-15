import { z } from 'zod';

import type {
  FounderCommandResult,
  VentureCommandMap,
  VentureCommandName,
} from '../shared/venture-contracts';
import type { VentureService } from './venture-service';

const id = z.string().trim().min(1).max(300);
const nullableUrl = z.string().trim().url().max(4_096).nullable();
const nullableText = z.string().max(100_000).nullable();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const gitSha = z.string().regex(/^[a-f0-9]{40}$/u);
const stringList = z.array(z.string().trim().min(1).max(10_000)).min(1).max(1_000);

const legalEntitySaveSchema = z.object({
  id: id.optional(),
  legalName: z.string().trim().min(1).max(500),
  displayName: z.string().trim().min(1).max(500),
  jurisdiction: z.string().trim().min(1).max(500).nullable(),
  entityType: z.enum([
    'corporation',
    'llc',
    'foundation',
    'sole_proprietorship',
    'partnership',
    'other',
  ]),
  status: z.enum(['planned', 'active', 'inactive', 'dissolved']),
  incorporationReference: nullableText,
  capTableReference: nullableText,
  founderAuthority: z.string().trim().min(1).max(100_000),
  publicWebsite: nullableUrl,
});

const ventureSaveSchema = z.object({
  id: id.optional(),
  legalEntityId: id,
  name: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(500),
  utility: z.string().trim().min(1).max(1_000_000),
  stage: z.enum(['concept', 'prototype', 'pre_production', 'production', 'scaling']),
  status: z.enum(['active', 'paused', 'archived']),
  publicUrl: nullableUrl,
  defaultNarrativeProfileId: id.nullable(),
  currentDemoVersionId: id.nullable(),
});

const narrativeCreateSchema = z.object({
  id: id.optional(),
  legalEntityId: id,
  ventureId: id,
  purpose: z.enum([
    'investor',
    'accelerator',
    'grant',
    'hackathon',
    'sponsor',
    'partner',
    'media',
  ]),
  descriptions: z.object({
    words50: z.string().trim().min(1).max(5_000),
    words100: z.string().trim().min(1).max(10_000),
    words250: z.string().trim().min(1).max(25_000),
  }),
  problem: z.string().trim().min(1).max(1_000_000),
  productWedge: z.string().trim().min(1).max(1_000_000),
  whyNow: z.string().trim().min(1).max(1_000_000),
  technicalDifferentiation: z.string().trim().min(1).max(1_000_000),
  evidenceFraming: z.string().trim().min(1).max(1_000_000),
  businessModel: z.string().trim().min(1).max(1_000_000),
  useOfFunds: z.string().trim().min(1).max(1_000_000),
  claimsBoundary: z.string().trim().min(1).max(1_000_000),
  deckReference: nullableText,
  demoReference: nullableText,
});

const canonicalDemoVersionSchema = z.object({
  id: id.optional(),
  demoId: id,
  baselineRepository: z.string().trim().min(1).max(4_096),
  baselineCommitSha: gitSha,
  branchConvention: z.string().trim().min(1).max(1_000),
  expectedBaselineHours: z.number().int().min(1).max(1_000),
  coreAssets: stringList,
  evidenceRequirements: stringList,
  approvedClaims: stringList,
});

const capitalMandateSaveSchema = z
  .object({
    id: id.optional(),
    roundId: id,
    legalEntityId: id,
    ventureId: id,
    narrativeProfileId: id,
    stage: z.enum(['pre_seed', 'seed', 'series_a']),
    targetAmountUsd: z.number().int().nonnegative(),
    minimumCheckUsd: z.number().int().nonnegative().nullable(),
    maximumCheckUsd: z.number().int().nonnegative().nullable(),
    instrument: z.string().trim().min(1).max(10_000),
    tokenSideLetterPolicy: z.string().trim().min(1).max(100_000),
    geographies: z.array(z.string().trim().min(1).max(500)).max(500),
    targetCloseDate: z.string().date().nullable(),
    status: z.enum(['planning', 'active', 'paused', 'closed']),
    approvedUseOfFunds: z.string().trim().min(1).max(1_000_000),
  })
  .superRefine((value, context) => {
    if (
      value.minimumCheckUsd !== null &&
      value.maximumCheckUsd !== null &&
      value.minimumCheckUsd > value.maximumCheckUsd
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minimumCheckUsd'],
        message: 'minimumCheckUsd cannot exceed maximumCheckUsd',
      });
    }
  });

const schemas: { [K in VentureCommandName]: z.ZodType<VentureCommandMap[K]> } = {
  'legalEntity.save': legalEntitySaveSchema,
  'venture.save': ventureSaveSchema,
  'narrative.createVersion': narrativeCreateSchema,
  'narrative.approve': z.object({ id, expectedContentSha256: sha256 }),
  'canonicalDemo.importDefaults': z.object({ packageDigest: sha256 }),
  'canonicalDemo.createVersion': canonicalDemoVersionSchema,
  'canonicalDemo.approve': z.object({ id, expectedContentSha256: sha256 }),
  'capitalMandate.save': capitalMandateSaveSchema,
};

const commandNames = new Set<string>(Object.keys(schemas));

export function isVentureCommand(name: string): name is VentureCommandName {
  return commandNames.has(name);
}

export class VentureCommandService {
  readonly #ventures: VentureService;

  constructor(ventures: VentureService) {
    this.#ventures = ventures;
  }

  async execute<K extends VentureCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderCommandResult<K>> {
    const payload = schemas[name].parse(untrustedPayload);
    let result: unknown;
    switch (name) {
      case 'legalEntity.save':
        result = await this.#ventures.saveLegalEntity(
          payload as VentureCommandMap['legalEntity.save'],
        );
        break;
      case 'venture.save':
        result = await this.#ventures.saveVenture(payload as VentureCommandMap['venture.save']);
        break;
      case 'narrative.createVersion':
        result = await this.#ventures.createNarrativeVersion(
          payload as VentureCommandMap['narrative.createVersion'],
        );
        break;
      case 'narrative.approve': {
        const value = payload as VentureCommandMap['narrative.approve'];
        result = await this.#ventures.approveNarrative(value.id, value.expectedContentSha256);
        break;
      }
      case 'canonicalDemo.importDefaults':
        result = await this.#ventures.importCanonicalDefaults(
          (payload as VentureCommandMap['canonicalDemo.importDefaults']).packageDigest,
        );
        break;
      case 'canonicalDemo.createVersion':
        result = await this.#ventures.createCanonicalDemoVersion(
          payload as VentureCommandMap['canonicalDemo.createVersion'],
        );
        break;
      case 'canonicalDemo.approve': {
        const value = payload as VentureCommandMap['canonicalDemo.approve'];
        result = await this.#ventures.approveCanonicalDemo(
          value.id,
          value.expectedContentSha256,
        );
        break;
      }
      case 'capitalMandate.save':
        result = await this.#ventures.saveCapitalMandate(
          payload as VentureCommandMap['capitalMandate.save'],
        );
        break;
      default:
        throw new Error(`Unsupported venture command: ${String(name)}`);
    }
    return result as FounderCommandResult<K>;
  }
}
