import { HackathonRepository as GuardedHackathonRepository } from './hackathon-repository-guarded.js';
import {
  HackathonEligibilityEvaluationSchema,
  type EligibilityEvaluation,
  type HackathonEntryDetail,
} from './hackathon-validation-v12.js';
import type {
  EligibilityEvaluationInput as BaseEligibilityEvaluationInput,
  HackathonEntryDetail as BaseHackathonEntryDetail,
} from './hackathon-validation-v11.js';

function structuredDetail(value: BaseHackathonEntryDetail): HackathonEntryDetail {
  return {
    ...value,
    eligibilityEvaluations: value.eligibilityEvaluations.map((evaluation) =>
      HackathonEligibilityEvaluationSchema.parse(evaluation),
    ),
  };
}

export class HackathonRepository extends GuardedHackathonRepository {
  override saveEligibilityEvaluation(
    input: BaseEligibilityEvaluationInput,
  ): EligibilityEvaluation {
    return HackathonEligibilityEvaluationSchema.parse(super.saveEligibilityEvaluation(input));
  }

  override getEntry(idInput: string): HackathonEntryDetail | null {
    const value = super.getEntry(idInput);
    return value ? structuredDetail(value) : null;
  }
}
