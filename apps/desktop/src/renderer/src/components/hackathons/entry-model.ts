import type {
  HackathonBountySummary,
  HackathonEntryDetail,
  HackathonRuleSummary,
  HackathonTrackSummary,
} from '../../../../shared/hackathon-contracts';

export type HackathonEntryWorkspaceDetail = HackathonEntryDetail & {
  rules: HackathonRuleSummary[];
  tracks: HackathonTrackSummary[];
  bounties: HackathonBountySummary[];
};

export function isHackathonEntryWorkspaceDetail(
  value: HackathonEntryDetail,
): value is HackathonEntryWorkspaceDetail {
  const candidate = value as Partial<HackathonEntryWorkspaceDetail>;
  return (
    Array.isArray(candidate.rules) &&
    Array.isArray(candidate.tracks) &&
    Array.isArray(candidate.bounties)
  );
}
