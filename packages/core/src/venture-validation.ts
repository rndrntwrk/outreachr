import { createHash } from 'node:crypto';
import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, UrlSchema, stableJson } from './validation.js';

export const LegalEntityTypeSchema = z.enum([
  'corporation',
  'llc',
  'foundation',
  'sole_proprietorship',
  'partnership',
  'other',
]);

export const LegalEntityStatusSchema = z.enum(['planned', 'active', 'inactive', 'dissolved']);

export const VentureStageSchema = z.enum([
  'concept',
  'prototype',
  'pre_production',
  'production',
  'scaling',
]);

export const VentureStatusSchema = z.enum(['active', 'paused', 'archived']);

export const NarrativePurposeSchema = z.enum([
  'investor',
  'accelerator',
  'grant',
  'hackathon',
  'sponsor',
  'partner',
  'media',
]);

export const ApprovalStateSchema = z.enum(['draft', 'approved', 'superseded']);
export const CapitalMandateStatusSchema = z.enum(['planning', 'active', 'paused', 'closed']);
export const CapitalMandateStageSchema = z.enum(['pre_seed', 'seed', 'series_a']);
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const GitCommitShaSchema = z.string().regex(/^[a-f0-9]{40}$/u);

const NullableUrlSchema = UrlSchema.nullable().default(null);
const NullableTextSchema = z.string().max(100_000).nullable().default(null);
const RequiredTextSchema = z.string().trim().min(1).max(100_000);
const RequiredLongTextSchema = z.string().trim().min(1).max(1_000_000);
const StringListSchema = z.array(z.string().trim().min(1).max(10_000)).max(1_000);

export const LegalEntitySchema = z.object({
  id: IdSchema,
  legalName: z.string().trim().min(1).max(500),
  displayName: z.string().trim().min(1).max(500),
  jurisdiction: z.string().trim().min(1).max(500).nullable().default(null),
  entityType: LegalEntityTypeSchema,
  status: LegalEntityStatusSchema,
  incorporationReference: NullableTextSchema,
  capTableReference: NullableTextSchema,
  founderAuthority: RequiredTextSchema,
  publicWebsite: NullableUrlSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type LegalEntityInput = z.input<typeof LegalEntitySchema>;
export type LegalEntity = z.output<typeof LegalEntitySchema>;

export const VentureSchema = z.object({
  id: IdSchema,
  legalEntityId: IdSchema,
  name: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(500),
  utility: RequiredLongTextSchema,
  stage: VentureStageSchema,
  status: VentureStatusSchema,
  publicUrl: NullableUrlSchema,
  defaultNarrativeProfileId: IdSchema.nullable().default(null),
  currentDemoVersionId: IdSchema.nullable().default(null),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type VentureInput = z.input<typeof VentureSchema>;
export type Venture = z.output<typeof VentureSchema>;

export const NarrativeContentSchema = z.object({
  purpose: NarrativePurposeSchema,
  version: z.number().int().min(1),
  description50: z.string().trim().min(1).max(5_000),
  description100: z.string().trim().min(1).max(10_000),
  description250: z.string().trim().min(1).max(25_000),
  problem: RequiredLongTextSchema,
  productWedge: RequiredLongTextSchema,
  whyNow: RequiredLongTextSchema,
  technicalDifferentiation: RequiredLongTextSchema,
  evidenceFraming: RequiredLongTextSchema,
  businessModel: RequiredLongTextSchema,
  useOfFunds: RequiredLongTextSchema,
  claimsBoundary: RequiredLongTextSchema,
  deckReference: NullableTextSchema,
  demoReference: NullableTextSchema,
});
export type NarrativeContent = z.output<typeof NarrativeContentSchema>;

export const NarrativeProfileSchema = z
  .object({
    id: IdSchema,
    legalEntityId: IdSchema,
    ventureId: IdSchema,
    ...NarrativeContentSchema.shape,
    contentSha256: Sha256Schema,
    approvalState: ApprovalStateSchema,
    approvedBy: IdSchema.nullable().default(null),
    approvedAt: IsoDateTimeSchema.nullable().default(null),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((profile, context) => {
    const isDraft = profile.approvalState === 'draft';
    if (isDraft && (profile.approvedAt !== null || profile.approvedBy !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvalState'],
        message: 'Draft narrative versions cannot have approval metadata',
      });
    }
    if (!isDraft && (profile.approvedAt === null || profile.approvedBy === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvalState'],
        message: 'Approved and superseded narrative versions require approval metadata',
      });
    }
  });
export type NarrativeProfileInput = z.input<typeof NarrativeProfileSchema>;
export type NarrativeProfile = z.output<typeof NarrativeProfileSchema>;

export const NarrativeVersionInputSchema = z.object({
  id: IdSchema,
  legalEntityId: IdSchema,
  ventureId: IdSchema,
  purpose: NarrativePurposeSchema,
  description50: NarrativeContentSchema.shape.description50,
  description100: NarrativeContentSchema.shape.description100,
  description250: NarrativeContentSchema.shape.description250,
  problem: NarrativeContentSchema.shape.problem,
  productWedge: NarrativeContentSchema.shape.productWedge,
  whyNow: NarrativeContentSchema.shape.whyNow,
  technicalDifferentiation: NarrativeContentSchema.shape.technicalDifferentiation,
  evidenceFraming: NarrativeContentSchema.shape.evidenceFraming,
  businessModel: NarrativeContentSchema.shape.businessModel,
  useOfFunds: NarrativeContentSchema.shape.useOfFunds,
  claimsBoundary: NarrativeContentSchema.shape.claimsBoundary,
  deckReference: NarrativeContentSchema.shape.deckReference,
  demoReference: NarrativeContentSchema.shape.demoReference,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type NarrativeVersionInput = z.input<typeof NarrativeVersionInputSchema>;

export const CanonicalDemoStatusSchema = z.enum(['active', 'paused', 'archived']);

export const CanonicalDemoSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(500),
  status: CanonicalDemoStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type CanonicalDemoInput = z.input<typeof CanonicalDemoSchema>;
export type CanonicalDemo = z.output<typeof CanonicalDemoSchema>;

export const CanonicalDemoContentSchema = z.object({
  version: z.number().int().min(1),
  baselineRepository: z.string().trim().min(1).max(4_096),
  baselineCommitSha: GitCommitShaSchema,
  branchConvention: z.string().trim().min(1).max(1_000),
  expectedBaselineHours: z.number().int().min(1).max(1_000),
  coreAssets: StringListSchema,
  evidenceRequirements: StringListSchema,
  approvedClaims: StringListSchema,
});
export type CanonicalDemoContent = z.output<typeof CanonicalDemoContentSchema>;

export const CanonicalDemoVersionSchema = z
  .object({
    id: IdSchema,
    demoId: IdSchema,
    ...CanonicalDemoContentSchema.shape,
    contentSha256: Sha256Schema,
    approvalState: ApprovalStateSchema,
    approvedBy: IdSchema.nullable().default(null),
    approvedAt: IsoDateTimeSchema.nullable().default(null),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((version, context) => {
    const isDraft = version.approvalState === 'draft';
    if (isDraft && (version.approvedAt !== null || version.approvedBy !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvalState'],
        message: 'Draft canonical demo versions cannot have approval metadata',
      });
    }
    if (!isDraft && (version.approvedAt === null || version.approvedBy === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvalState'],
        message: 'Approved and superseded canonical demo versions require approval metadata',
      });
    }
    if (version.approvalState === 'approved' && /^0{40}$/u.test(version.baselineCommitSha)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baselineCommitSha'],
        message: 'An approved canonical demo requires a real baseline commit SHA',
      });
    }
  });
export type CanonicalDemoVersionInput = z.input<typeof CanonicalDemoVersionSchema>;
export type CanonicalDemoVersion = z.output<typeof CanonicalDemoVersionSchema>;

export const CanonicalDemoVersionCreateSchema = z.object({
  id: IdSchema,
  demoId: IdSchema,
  baselineRepository: CanonicalDemoContentSchema.shape.baselineRepository,
  baselineCommitSha: CanonicalDemoContentSchema.shape.baselineCommitSha,
  branchConvention: CanonicalDemoContentSchema.shape.branchConvention,
  expectedBaselineHours: CanonicalDemoContentSchema.shape.expectedBaselineHours,
  coreAssets: CanonicalDemoContentSchema.shape.coreAssets,
  evidenceRequirements: CanonicalDemoContentSchema.shape.evidenceRequirements,
  approvedClaims: CanonicalDemoContentSchema.shape.approvedClaims,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type CanonicalDemoVersionCreateInput = z.input<
  typeof CanonicalDemoVersionCreateSchema
>;

export const CapitalMandateSchema = z
  .object({
    id: IdSchema,
    roundId: IdSchema,
    legalEntityId: IdSchema,
    ventureId: IdSchema,
    narrativeProfileId: IdSchema,
    stage: CapitalMandateStageSchema,
    targetAmountUsd: z.number().int().nonnegative(),
    minimumCheckUsd: z.number().int().nonnegative().nullable().default(null),
    maximumCheckUsd: z.number().int().nonnegative().nullable().default(null),
    instrument: z.string().trim().min(1).max(10_000),
    tokenSideLetterPolicy: z.string().trim().min(1).max(100_000),
    geographies: z.array(z.string().trim().min(1).max(500)).max(500),
    targetCloseDate: z.string().date().nullable().default(null),
    status: CapitalMandateStatusSchema,
    approvedUseOfFunds: RequiredLongTextSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((mandate, context) => {
    if (
      mandate.minimumCheckUsd !== null &&
      mandate.maximumCheckUsd !== null &&
      mandate.minimumCheckUsd > mandate.maximumCheckUsd
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minimumCheckUsd'],
        message: 'minimumCheckUsd cannot exceed maximumCheckUsd',
      });
    }
  });
export type CapitalMandateInput = z.input<typeof CapitalMandateSchema>;
export type CapitalMandate = z.output<typeof CapitalMandateSchema>;

export interface CanonicalDemoWithVersions extends CanonicalDemo {
  versions: CanonicalDemoVersion[];
}

export function narrativeDigest(input: NarrativeContent): string {
  return createHash('sha256').update(stableJson(NarrativeContentSchema.parse(input)), 'utf8').digest('hex');
}

export function canonicalDemoDigest(input: CanonicalDemoContent): string {
  return createHash('sha256')
    .update(stableJson(CanonicalDemoContentSchema.parse(input)), 'utf8')
    .digest('hex');
}
