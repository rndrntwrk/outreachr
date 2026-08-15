import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, UrlSchema } from './validation.js';
import { Sha256Schema } from './venture-validation.js';

export const OrganizationKindSchema = z.enum([
  'company',
  'foundation',
  'protocol',
  'community',
  'university',
  'government',
  'investor',
  'other',
]);

export const OrganizationOriginSchema = z.enum(['local', 'atlas', 'import', 'contribution']);

export const OpportunityTypeSchema = z.enum([
  'investor',
  'accelerator',
  'grant',
  'hackathon',
  'startup_program',
  'cloud_credits',
  'strategic_partner',
  'sponsor',
  'design_partner',
]);

export const OpportunityStatusSchema = z.enum([
  'open',
  'upcoming',
  'rolling',
  'closed_recurring',
  'watchlist',
  'cancelled',
]);

export const OpportunityFormatSchema = z.enum(['online', 'in_person', 'hybrid', 'unknown']);
export const FreshnessStateSchema = z.enum(['current', 'aging', 'stale', 'unknown']);
export const OpportunityReviewStateSchema = z.enum([
  'unreviewed',
  'reviewed',
  'conflicted',
  'rejected',
]);
export const EvidenceConfidenceSchema = z.enum([
  'verified',
  'supported',
  'inferred',
  'unknown',
  'stale',
]);
export const EvidenceReviewStateSchema = z.enum(['pending', 'accepted', 'rejected']);

interface RefinementContext {
  addIssue(issue: {
    code: typeof z.ZodIssueCode.custom;
    path: Array<string | number>;
    message: string;
  }): void;
}

const NullableUrlSchema = UrlSchema.nullable().default(null);
const NullableTextSchema = z.string().max(1_000_000).nullable().default(null);
const NullableDateSchema = z.string().date().nullable().default(null);

function knownDateOrder(
  left: string | null,
  right: string | null,
  context: RefinementContext,
  path: string,
  message: string,
): void {
  if (left === null || right === null) return;
  if (Date.parse(`${left}T00:00:00.000Z`) <= Date.parse(`${right}T00:00:00.000Z`)) return;
  context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
}

export const OrganizationSchema = z
  .object({
    id: IdSchema,
    name: z.string().trim().min(1).max(500),
    normalizedName: z.string().trim().min(1).max(500),
    kind: OrganizationKindSchema,
    website: NullableUrlSchema,
    description: NullableTextSchema,
    linkedFirmId: IdSchema.nullable().default(null),
    isPublic: z.boolean().default(true),
    contributionEligible: z.boolean().default(false),
    origin: OrganizationOriginSchema.default('local'),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((organization, context) => {
    if (organization.contributionEligible && !organization.isPublic) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contributionEligible'],
        message: 'Contribution-eligible organizations must be public',
      });
    }
  });
export type OrganizationInput = z.input<typeof OrganizationSchema>;
export type Organization = z.output<typeof OrganizationSchema>;

export const OpportunitySchema = z
  .object({
    id: IdSchema,
    organizerOrganizationId: IdSchema.nullable().default(null),
    name: z.string().trim().min(1).max(1_000),
    opportunityType: OpportunityTypeSchema,
    status: OpportunityStatusSchema,
    publicUrl: NullableUrlSchema,
    applicationUrl: NullableUrlSchema,
    openDate: NullableDateSchema,
    deadline: NullableDateSchema,
    startDate: NullableDateSchema,
    endDate: NullableDateSchema,
    format: OpportunityFormatSchema.nullable().default(null),
    location: z.string().trim().min(1).max(2_000).nullable().default(null),
    eligibilitySummary: NullableTextSchema,
    termsSummary: NullableTextSchema,
    capitalPrizeSummary: NullableTextSchema,
    freshnessState: FreshnessStateSchema,
    reviewState: OpportunityReviewStateSchema,
    importedPackageId: z.string().trim().min(1).max(500).nullable().default(null),
    importedPackageDigest: Sha256Schema.nullable().default(null),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((opportunity, context) => {
    knownDateOrder(
      opportunity.openDate,
      opportunity.deadline,
      context,
      'openDate',
      'Opportunity open date must not follow its deadline',
    );
    knownDateOrder(
      opportunity.deadline,
      opportunity.endDate,
      context,
      'deadline',
      'Opportunity deadline must not follow its end date',
    );
    knownDateOrder(
      opportunity.startDate,
      opportunity.endDate,
      context,
      'startDate',
      'Opportunity start date must not follow its end date',
    );
  });
export type OpportunityInput = z.input<typeof OpportunitySchema>;
export type Opportunity = z.output<typeof OpportunitySchema>;

export const OpportunitySourceSchema = z
  .object({
    opportunityId: IdSchema,
    sourceId: IdSchema,
    sourceRole: z.string().trim().min(1).max(500),
    observedAt: IsoDateTimeSchema,
    confidence: EvidenceConfidenceSchema,
    reviewState: EvidenceReviewStateSchema,
    reviewedAt: IsoDateTimeSchema.nullable().default(null),
    createdAt: IsoDateTimeSchema,
  })
  .superRefine((source, context) => {
    if (source.reviewState === 'pending' && source.reviewedAt !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reviewedAt'],
        message: 'Pending opportunity evidence cannot have a review timestamp',
      });
    }
    if (source.reviewState !== 'pending' && source.reviewedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reviewedAt'],
        message: 'Reviewed opportunity evidence requires a review timestamp',
      });
    }
  });
export type OpportunitySourceInput = z.input<typeof OpportunitySourceSchema>;
export type OpportunitySource = z.output<typeof OpportunitySourceSchema>;

export interface OpportunityFilter {
  opportunityType?: z.output<typeof OpportunityTypeSchema>;
  status?: z.output<typeof OpportunityStatusSchema>;
  organizerOrganizationId?: string;
  freshnessState?: z.output<typeof FreshnessStateSchema>;
  reviewState?: z.output<typeof OpportunityReviewStateSchema>;
  deadlineBefore?: string;
}
