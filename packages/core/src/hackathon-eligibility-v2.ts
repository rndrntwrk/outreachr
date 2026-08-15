import {
  evaluateHackathonEligibility as evaluateBaseEligibility,
  type EligibilityProfile,
  type EligibilityRuleDetail,
  type EligibilityRuleStatus,
  type HackathonEligibilityEvaluationResult,
} from './hackathon-eligibility.js';
import {
  hackathonRulesDigest,
  type HackathonRule,
} from './hackathon-validation-v11.js';

export type {
  EligibilityAttendanceMode,
  EligibilityProfile,
  EligibilityRuleDetail,
  EligibilityRuleStatus,
  HackathonEligibilityEvaluationResult,
} from './hackathon-eligibility.js';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function usableStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  const normalized = value.map((item) => item.trim()).filter(Boolean);
  return normalized.length ? normalized : null;
}

function synthesizedDetail(rule: HackathonRule): EligibilityRuleDetail | null {
  const value = asRecord(rule.value);
  if (!value) return null;

  if (rule.ruleType === 'student_status' && booleanValue(value.required) === false) {
    return {
      ruleId: rule.id,
      ruleType: rule.ruleType,
      blocking: rule.blocking,
      status: 'eligible',
      reason: 'Student status is not required.',
    };
  }

  if (rule.ruleType === 'open_source' && booleanValue(value.required) === false) {
    return {
      ruleId: rule.id,
      ruleType: rule.ruleType,
      blocking: rule.blocking,
      status: 'eligible',
      reason: 'Open-source publication is not required.',
    };
  }

  if (
    rule.ruleType === 'required_technology' &&
    usableStringList(value.allOf) === null &&
    usableStringList(value.anyOf) === null
  ) {
    return {
      ruleId: rule.id,
      ruleType: rule.ruleType,
      blocking: rule.blocking,
      status: 'uncertain',
      reason: 'The required-technology rule has no usable list.',
    };
  }

  return null;
}

export function evaluateHackathonEligibility(
  founderProfile: EligibilityProfile,
  rules: readonly HackathonRule[],
): HackathonEligibilityEvaluationResult {
  const synthesized = new Map<string, EligibilityRuleDetail>();
  const delegated: HackathonRule[] = [];

  for (const rule of rules) {
    const detail = synthesizedDetail(rule);
    if (detail) synthesized.set(rule.id, detail);
    else delegated.push(rule);
  }

  const base = evaluateBaseEligibility(founderProfile, delegated);
  const baseById = new Map(base.details.map((detail) => [detail.ruleId, detail]));
  const details = rules.map((rule) => synthesized.get(rule.id) ?? baseById.get(rule.id)!).filter(Boolean);
  const blockingDetails = details.filter((detail) => detail.blocking);
  const status: EligibilityRuleStatus = blockingDetails.some(
    (detail) => detail.status === 'ineligible',
  )
    ? 'ineligible'
    : blockingDetails.some((detail) => detail.status === 'uncertain')
      ? 'uncertain'
      : 'eligible';

  return {
    status,
    evaluatedAt: founderProfile.evaluatedAt,
    rulesSnapshotSha256: hackathonRulesDigest(rules),
    details,
  };
}
