import { ArrowRight, CalendarDays, CheckCircle2, Landmark, Target } from 'lucide-react';
import { useNavigate } from '../lib/router';
import { useWorkspace } from '../state/WorkspaceContext';
import { Badge, Button, EmptyState, PageHeader, Section, formatDate, formatMoney, titleCase } from '../components/ui';

export function RoundOverviewPage(): React.JSX.Element {
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const round = data?.round;
  if (!round) {
    return (
      <div className="page">
        <PageHeader title="Round overview" description="Set up the round to begin." />
        <EmptyState title="No active round" detail="Complete onboarding to define the company and raise." />
      </div>
    );
  }

  const targeted = data.investors.filter((item) => item.target);
  const coverage = round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0;
  const softCoverage = round.targetAmount > 0 ? Math.round((round.softCircleAmount / round.targetAmount) * 100) : 0;
  const activeMandate =
    data.capitalMandates.find((item) => item.id === data.activeCapitalMandateId) ??
    data.capitalMandates.find((item) => item.roundId === round.id) ??
    null;
  const legalEntity = data.legalEntities.find((item) => item.id === activeMandate?.legalEntityId);
  const venture = data.ventures.find((item) => item.id === activeMandate?.ventureId);
  const narrative = data.narrativeProfiles.find(
    (item) => item.id === activeMandate?.narrativeProfileId,
  );

  return (
    <div className="page">
      <PageHeader
        kicker="Active round"
        title={round.companyName}
        description={round.companyOneLiner}
        actions={<Badge tone={round.status === 'active' ? 'success' : 'neutral'}>{round.status}</Badge>}
      />

      <section className="round-hero">
        <div className="round-hero__headline">
          <div>
            <span>Committed</span>
            <strong>{formatMoney(round.committedAmount)}</strong>
          </div>
          <ArrowRight aria-hidden="true" />
          <div>
            <span>Round target</span>
            <strong>{formatMoney(round.targetAmount)}</strong>
          </div>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Committed round progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, coverage)}
        >
          <span style={{ width: `${Math.min(100, coverage)}%` }} />
        </div>
        <div className="round-hero__meta">
          <span>
            <CheckCircle2 aria-hidden="true" /> {coverage}% committed
          </span>
          <span>
            <Target aria-hidden="true" /> {softCoverage}% soft-circled
          </span>
          <span>
            <CalendarDays aria-hidden="true" /> Close {formatDate(round.targetCloseDate)}
          </span>
        </div>
      </section>

      <div className="metrics-strip metrics-strip--four">
        <div className="metric-cell">
          <span>Targeted firms</span>
          <strong>{targeted.length}</strong>
          <small>{data.counts.firms} researched</small>
        </div>
        <div className="metric-cell">
          <span>Meetings</span>
          <strong>{data.counts.meetings}</strong>
          <small>{data.meetings.filter((item) => item.status === 'upcoming').length} upcoming</small>
        </div>
        <div className="metric-cell">
          <span>Soft circle</span>
          <strong>{formatMoney(round.softCircleAmount)}</strong>
          <small>Founder-entered expectations</small>
        </div>
        <div className="metric-cell">
          <span>Stage</span>
          <strong>{titleCase(round.stage)}</strong>
          <small>{round.leadRequired ? 'Lead required' : 'Lead optional'}</small>
        </div>
      </div>

      <Section
        title="Round authority"
        description="This is the exact entity, venture and approved narrative allowed to represent the active raise."
        actions={
          <Button size="small" variant="secondary" onClick={() => navigate('/ventures')}>
            <Landmark aria-hidden="true" /> Review authority
          </Button>
        }
      >
        {activeMandate ? (
          <dl className="authority-facts authority-facts--mandate">
            <div>
              <dt>Legal entity</dt>
              <dd>{legalEntity?.displayName ?? 'Missing legal entity'}</dd>
            </div>
            <div>
              <dt>Venture</dt>
              <dd>{venture?.name ?? 'Missing venture'}</dd>
            </div>
            <div>
              <dt>Approved investor narrative</dt>
              <dd>{narrative ? `Version ${narrative.version}` : 'Missing approved narrative'}</dd>
            </div>
            <div>
              <dt>Instrument</dt>
              <dd>{activeMandate.instrument}</dd>
            </div>
            <div>
              <dt>Mandate target</dt>
              <dd>{formatMoney(activeMandate.targetAmountUsd)}</dd>
            </div>
            <div>
              <dt>Authority status</dt>
              <dd>{titleCase(activeMandate.status)}</dd>
            </div>
          </dl>
        ) : (
          <EmptyState
            title="No capital mandate"
            detail="Bind this round to one legal entity, venture and approved investor narrative before external use."
            action={<Button onClick={() => navigate('/ventures')}>Create capital mandate</Button>}
          />
        )}
      </Section>

      <Section title="Round strategy" description="Private founder context used for planning and fit scoring.">
        <div className="strategy-grid">
          <div>
            <span>Target checks</span>
            <strong>
              {formatMoney(round.targetCheck.minimum)} – {formatMoney(round.targetCheck.maximum)}
            </strong>
          </div>
          <div>
            <span>Sectors</span>
            <div className="chip-row">
              {round.sectors.map((sector) => (
                <span key={sector} className="chip">
                  {sector}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span>Geographies</span>
            <div className="chip-row">
              {round.geographies.map((geography) => (
                <span key={geography} className="chip">
                  {geography}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Fundraising narrative">
        <p className="long-copy">{round.narrative || 'No narrative has been saved yet.'}</p>
      </Section>
    </div>
  );
}
