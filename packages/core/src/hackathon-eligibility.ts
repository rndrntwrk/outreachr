import { createHash } from 'node:crypto';

import { stableJson } from './validation.js';
import type { HackathonRule } from './hackathon-validation-v11.js';

export type EligibilityAttendanceMode = 'online' | 'in_person' | 'hybrid' | 'unknown';
export type EligibilityRuleStatus = 'eligible' | 'ineligible' | 'uncertain';

export interface EligibilityProfile {
  evaluatedAt: string;
  country: string | null;
  founderAge: number | null;
  isStudent: boolean | null;
  companyFoundedOn: string | null;
  teamSize: number | null;
  usesExistingCode: boolean | null;
  willOpenSource: boolean | null;
  technologies: string[];
  attendanceMode: EligibilityAttendanceMode;
  canAttendInPerson: boolean | null;
  priorFundingUsd: number | null;
  participantIds: string[];
  submissionLanguage: string | null;
  availableArtifacts: string[];
}

export interface EligibilityRuleDetail {
  ruleId: string;
  ruleType: HackathonRule['ruleType'];
  blocking: boolean;
  status: EligibilityRuleStatus;
  reason: string;
}

export interface HackathonEligibilityEvaluationResult {
  status: EligibilityRuleStatus;
  evaluatedAt: string;
  rulesSnapshotSha256: string;
  details: EligibilityRuleDetail[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  const normalized = value.map((item) => item.trim()).filter(Boolean);
  return normalized.length ? normalized : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function normalizedSet(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function detail(
  rule: HackathonRule,
  status: EligibilityRuleStatus,
  reason: string,
): EligibilityRuleDetail {
  return { ruleId: rule.id, ruleType: rule.ruleType, blocking: rule.blocking, status, reason };
}

function monthsBetween(foundedOn: string, evaluatedAt: string): number | null {
  const founded = new Date(`${foundedOn}T00:00:00.000Z`);
  const evaluated = new Date(evaluatedAt);
  if (Number.isNaN(founded.valueOf()) || Number.isNaN(evaluated.valueOf())) return null;
  let months =
    (evaluated.getUTCFullYear() - founded.getUTCFullYear()) * 12 +
    evaluated.getUTCMonth() -
    founded.getUTCMonth();
  if (evaluated.getUTCDate() < founded.getUTCDate()) months -= 1;
  return months;
}

function reviewFailure(rule: HackathonRule): EligibilityRuleDetail | null {
  if (!rule.blocking) return null;
  if (rule.reviewState !== 'accepted') {
    return detail(rule, 'uncertain', 'The blocking rule has not been accepted by the founder.');
  }
  if (rule.confidence === 'unknown' || rule.confidence === 'stale') {
    return detail(rule, 'uncertain', 'The blocking rule evidence is unknown or stale.');
  }
  return null;
}

function evaluateRule(profile: EligibilityProfile, rule: HackathonRule): EligibilityRuleDetail {
  const unresolvedReview = reviewFailure(rule);
  if (unresolvedReview) return unresolvedReview;

  const value = asRecord(rule.value);
  if (!value) return detail(rule, 'uncertain', 'The rule value is not a structured object.');

  switch (rule.ruleType) {
    case 'geography': {
      if (!profile.country) return detail(rule, 'uncertain', 'Founder country is unknown.');
      const country = profile.country.trim().toLowerCase();
      const allowed = stringArray(value.allowed);
      const prohibited = stringArray(value.prohibited);
      if (prohibited && normalizedSet(prohibited).has(country)) {
        return detail(rule, 'ineligible', `The founder country ${profile.country} is prohibited.`);
      }
      if (allowed && !normalizedSet(allowed).has(country)) {
        return detail(rule, 'ineligible', `The founder country ${profile.country} is not allowed.`);
      }
      if (!allowed && !prohibited) {
        return detail(rule, 'uncertain', 'The geography rule has no usable list.');
      }
      return detail(rule, 'eligible', 'Founder geography satisfies the reviewed rule.');
    }
    case 'age': {
      if (profile.founderAge === null) return detail(rule, 'uncertain', 'Founder age is unknown.');
      const minimum = finiteNumber(value.minimum);
      const maximum = finiteNumber(value.maximum);
      if (minimum !== null && profile.founderAge < minimum) {
        return detail(rule, 'ineligible', `Founder age is below the minimum of ${minimum}.`);
      }
      if (maximum !== null && profile.founderAge > maximum) {
        return detail(rule, 'ineligible', `Founder age exceeds the maximum of ${maximum}.`);
      }
      if (minimum === null && maximum === null) {
        return detail(rule, 'uncertain', 'The age rule has no usable bounds.');
      }
      return detail(rule, 'eligible', 'Founder age satisfies the reviewed rule.');
    }
    case 'student_status': {
      const required = booleanValue(value.required);
      if (required === null) return detail(rule, 'uncertain', 'Student requirement is unclear.');
      if (!required) return detail(rule, 'eligible', 'Student status is not required.');
      if (profile.isStudent === null) return detail(rule, 'uncertain', 'Student status is unknown.');
      return profile.isStudent
        ? detail(rule, 'eligible', 'Student status satisfies the reviewed rule.')
        : detail(rule, 'ineligible', 'This opportunity requires a current student.');
    }
    case 'company_age': {
      if (!profile.companyFoundedOn) {
        return detail(rule, 'uncertain', 'Company founding date is unknown.');
      }
      const months = monthsBetween(profile.companyFoundedOn, profile.evaluatedAt);
      if (months === null) return detail(rule, 'uncertain', 'Company age could not be calculated.');
      const minimum = finiteNumber(value.minimumMonths);
      const maximum = finiteNumber(value.maximumMonths);
      if (minimum !== null && months < minimum) {
        return detail(rule, 'ineligible', `Company age is below the ${minimum}-month minimum.`);
      }
      if (maximum !== null && months > maximum) {
        return detail(rule, 'ineligible', `Company age exceeds the ${maximum}-month maximum.`);
      }
      if (minimum === null && maximum === null) {
        return detail(rule, 'uncertain', 'The company-age rule has no usable bounds.');
      }
      return detail(rule, 'eligible', 'Company age satisfies the reviewed rule.');
    }
    case 'existing_code': {
      const allowed = booleanValue(value.allowed);
      if (allowed === null) return detail(rule, 'uncertain', 'Existing-code policy is unclear.');
      if (profile.usesExistingCode === null) {
        return detail(rule, 'uncertain', 'Existing-code usage is unknown.');
      }
      if (!allowed && profile.usesExistingCode) {
        return detail(rule, 'ineligible', 'The reviewed rules prohibit existing code.');
      }
      return detail(rule, 'eligible', 'Existing-code usage satisfies the reviewed rule.');
    }
    case 'team_size': {
      if (profile.teamSize === null) return detail(rule, 'uncertain', 'Team size is unknown.');
      const minimum = finiteNumber(value.minimum);
      const maximum = finiteNumber(value.maximum);
      if (minimum !== null && profile.teamSize < minimum) {
        return detail(rule, 'ineligible', `Team size is below the minimum of ${minimum}.`);
      }
      if (maximum !== null && profile.teamSize > maximum) {
        return detail(rule, 'ineligible', `Team size exceeds the maximum of ${maximum}.`);
      }
      if (minimum === null && maximum === null) {
        return detail(rule, 'uncertain', 'The team-size rule has no usable bounds.');
      }
      return detail(rule, 'eligible', 'Team size satisfies the reviewed rule.');
    }
    case 'open_source': {
      const required = booleanValue(value.required);
      if (required === null) return detail(rule, 'uncertain', 'Open-source requirement is unclear.');
      if (!required) return detail(rule, 'eligible', 'Open-source publication is not required.');
      if (profile.willOpenSource === null) {
        return detail(rule, 'uncertain', 'Open-source commitment is unknown.');
      }
      return profile.willOpenSource
        ? detail(rule, 'eligible', 'Open-source commitment satisfies the reviewed rule.')
        : detail(rule, 'ineligible', 'The reviewed rules require an open-source submission.');
    }
    case 'required_technology': {
      const allOf = stringArray(value.allOf);
      const anyOf = stringArray(value.anyOf);
      if (!allOf && !anyOf) {
        return detail(rule, 'uncertain', 'The required-technology rule has no usable list.');
      }
      const technologies = normalizedSet(profile.technologies);
      if (allOf && allOf.some((technology) => !technologies.has(technology.toLowerCase()))) {
        return detail(rule, 'ineligible', 'The build does not include every required technology.');
      }
      if (anyOf && !anyOf.some((technology) => technologies.has(technology.toLowerCase()))) {
        return detail(rule, 'ineligible', 'The build does not include any accepted technology.');
      }
      return detail(rule, 'eligible', 'Technology selection satisfies the reviewed rule.');
    }
    case 'attendance': {
      const required = typeof value.required === 'string' ? value.required : null;
      if (!required) return detail(rule, 'uncertain', 'Attendance requirement is unclear.');
      if (required === 'in_person') {
        if (profile.canAttendInPerson === null) {
          return detail(rule, 'uncertain', 'In-person attendance capability is unknown.');
        }
        return profile.canAttendInPerson
          ? detail(rule, 'eligible', 'In-person attendance is available.')
          : detail(rule, 'ineligible', 'The event requires in-person attendance.');
      }
      if (required === 'online') {
        if (profile.attendanceMode === 'unknown') {
          return detail(rule, 'uncertain', 'Online attendance capability is unknown.');
        }
        return profile.attendanceMode === 'online' || profile.attendanceMode === 'hybrid'
          ? detail(rule, 'eligible', 'Online attendance is available.')
          : detail(rule, 'ineligible', 'The selected attendance mode is not online.');
      }
      if (required === 'hybrid') {
        return profile.attendanceMode === 'unknown'
          ? detail(rule, 'uncertain', 'Hybrid attendance capability is unknown.')
          : detail(rule, 'eligible', 'Attendance capability satisfies the reviewed rule.');
      }
      return detail(rule, 'uncertain', 'Attendance requirement is not supported.');
    }
    case 'prior_funding': {
      if (profile.priorFundingUsd === null) {
        return detail(rule, 'uncertain', 'Prior funding is unknown.');
      }
      const minimum = finiteNumber(value.minimumUsd);
      const maximum = finiteNumber(value.maximumUsd);
      if (minimum !== null && profile.priorFundingUsd < minimum) {
        return detail(rule, 'ineligible', `Prior funding is below the minimum of $${minimum}.`);
      }
      if (maximum !== null && profile.priorFundingUsd > maximum) {
        return detail(rule, 'ineligible', `Prior funding exceeds the maximum of $${maximum}.`);
      }
      if (minimum === null && maximum === null) {
        return detail(rule, 'uncertain', 'The prior-funding rule has no usable bounds.');
      }
      return detail(rule, 'eligible', 'Prior funding satisfies the reviewed rule.');
    }
    case 'prohibited_participant': {
      const ids = stringArray(value.ids);
      if (!ids) return detail(rule, 'uncertain', 'The prohibited-participant list is unclear.');
      const participants = normalizedSet(profile.participantIds);
      const prohibited = ids.find((id) => participants.has(id.toLowerCase()));
      return prohibited
        ? detail(rule, 'ineligible', `Participant ${prohibited} is prohibited.`)
        : detail(rule, 'eligible', 'No selected participant is prohibited.');
    }
    case 'submission_language': {
      if (!profile.submissionLanguage) {
        return detail(rule, 'uncertain', 'Submission language is unknown.');
      }
      const allowed = stringArray(value.allowed);
      if (!allowed) return detail(rule, 'uncertain', 'The language allowlist is unclear.');
      return normalizedSet(allowed).has(profile.submissionLanguage.toLowerCase())
        ? detail(rule, 'eligible', 'Submission language satisfies the reviewed rule.')
        : detail(rule, 'ineligible', 'The selected submission language is not allowed.');
    }
    case 'required_artifact': {
      const required = stringArray(value.kinds) ?? stringArray(value.required);
      if (!required) return detail(rule, 'uncertain', 'The required-artifact list is unclear.');
      const available = normalizedSet(profile.availableArtifacts);
      const missing = required.filter((artifact) => !available.has(artifact.toLowerCase()));
      return missing.length
        ? detail(rule, 'ineligible', `Missing required artifacts: ${missing.join(', ')}.`)
        : detail(rule, 'eligible', 'Required artifacts are available.');
    }
    case 'intellectual_property':
    case 'other':
      return detail(rule, 'uncertain', `Rule type ${rule.ruleType} requires founder review.`);
    default:
      return detail(rule, 'uncertain', 'The rule type is not supported.');
  }
}

export function hackathonRulesDigest(rules: readonly HackathonRule[]): string {
  const canonical = rules
    .map((rule) => ({
      id: rule.id,
      cycleId: rule.cycleId,
      ruleType: rule.ruleType,
      value: rule.value,
      blocking: rule.blocking,
      sourceId: rule.sourceId,
      observedAt: rule.observedAt,
      confidence: rule.confidence,
      reviewState: rule.reviewState,
      reviewedAt: rule.reviewedAt,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return createHash('sha256').update(stableJson(canonical), 'utf8').digest('hex');
}

export function evaluateHackathonEligibility(
  founderProfile: EligibilityProfile,
  rules: readonly HackathonRule[],
): HackathonEligibilityEvaluationResult {
  if (Number.isNaN(Date.parse(founderProfile.evaluatedAt))) {
    throw new TypeError('evaluatedAt must be a valid date-time');
  }
  const details = rules.map((rule) => evaluateRule(founderProfile, rule));
  const blockingDetails = details.filter((item) => item.blocking);
  const status: EligibilityRuleStatus = blockingDetails.some((item) => item.status === 'ineligible')
    ? 'ineligible'
    : blockingDetails.some((item) => item.status === 'uncertain')
      ? 'uncertain'
      : 'eligible';
  return {
    status,
    evaluatedAt: founderProfile.evaluatedAt,
    rulesSnapshotSha256: hackathonRulesDigest(rules),
    details,
  };
}
