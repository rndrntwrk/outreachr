import { z } from 'zod';

import {
  EligibilityStatusSchema,
  HackathonEligibilityEvaluationSchema as BaseHackathonEligibilityEvaluationSchema,
  HackathonRuleTypeSchema,
  type EligibilityEvaluationInput as BaseEligibilityEvaluationInput,
  type HackathonEntryDetail as BaseHackathonEntryDetail,
} from './hackathon-validation-v11.js';

export * from './hackathon-validation-v11.js';

export const EligibilityRuleDetailSchema = z.object({
  ruleId: z.string().trim().min(1).max(300),
  ruleType: HackathonRuleTypeSchema,
  blocking: z.boolean(),
  status: EligibilityStatusSchema,
  reason: z.string().trim().min(1).max(100_000),
});
export type EligibilityRuleDetail = z.output<typeof EligibilityRuleDetailSchema>;

export const HackathonEligibilityEvaluationSchema =
  BaseHackathonEligibilityEvaluationSchema.safeExtend({
    detail: z.array(EligibilityRuleDetailSchema).max(1_000),
  });

export type EligibilityEvaluationInput = Omit<BaseEligibilityEvaluationInput, 'detail'> & {
  detail: EligibilityRuleDetail[];
};
export type EligibilityEvaluation = z.output<typeof HackathonEligibilityEvaluationSchema>;

export type HackathonEntryDetail = Omit<BaseHackathonEntryDetail, 'eligibilityEvaluations'> & {
  eligibilityEvaluations: EligibilityEvaluation[];
};
