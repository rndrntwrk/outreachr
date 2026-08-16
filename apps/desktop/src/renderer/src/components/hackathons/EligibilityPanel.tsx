import { Check, RefreshCw, ShieldAlert, X } from 'lucide-react';

import { Badge, Button, Section, titleCase } from '../ui';
import type { HackathonEntryWorkspaceDetail } from './entry-model';

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'eligible' || status === 'accepted') return 'success';
  if (status === 'ineligible' || status === 'rejected') return 'danger';
  if (status === 'uncertain' || status === 'pending') return 'warning';
  return 'neutral';
}

function readableValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function EligibilityPanel({
  entry,
  busy,
  onReviewRule,
  onEvaluate,
  onReviewEvaluation,
}: {
  entry: HackathonEntryWorkspaceDetail;
  busy: boolean;
  onReviewRule: (id: string, decision: 'accept' | 'reject') => Promise<void>;
  onEvaluate: () => Promise<void>;
  onReviewEvaluation: (id: string, decision: 'accept' | 'reject') => Promise<void>;
}): React.JSX.Element {
  const currentEvaluation = entry.eligibilityEvaluations[0] ?? null;
  const evaluationByRule = new Map(
    (currentEvaluation?.detail ?? [])
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
      .map((value) => [String(value.ruleId ?? ''), value]),
  );

  return (
    <Section
      title="Eligibility"
      description="Rules are source-backed inputs. The evaluator calculates eligibility; the founder reviews evidence and the resulting rules snapshot."
      action={
        <Button
          size="small"
          icon={<RefreshCw aria-hidden="true" />}
          loading={busy}
          onClick={() => void onEvaluate()}
        >
          Evaluate current rules
        </Button>
      }
      className="hackathon-entry-section"
    >
      <div className="hackathon-entry-readout" role="region" aria-label="Eligibility">
        <div className="hackathon-entry-readout__summary">
          <span>
            <ShieldAlert aria-hidden="true" />
            <strong>Current evaluation</strong>
          </span>
          <Badge tone={statusTone(currentEvaluation?.status ?? 'unknown')}>
            {currentEvaluation ? titleCase(currentEvaluation.status) : 'Not evaluated'}
          </Badge>
          <code>
            {currentEvaluation?.rulesSnapshotSha256 ?? 'No rules snapshot has been evaluated'}
          </code>
          {currentEvaluation ? (
            <div className="hackathon-entry-inline-actions">
              <Button
                size="small"
                tone="quiet"
                disabled={busy || currentEvaluation.founderReviewState !== 'pending'}
                icon={<Check aria-hidden="true" />}
                onClick={() => void onReviewEvaluation(currentEvaluation.id, 'accept')}
              >
                Accept evaluation
              </Button>
              <Button
                size="small"
                tone="quiet"
                disabled={busy || currentEvaluation.founderReviewState !== 'pending'}
                icon={<X aria-hidden="true" />}
                onClick={() => void onReviewEvaluation(currentEvaluation.id, 'reject')}
              >
                Reject evaluation
              </Button>
            </div>
          ) : null}
        </div>

        <div className="hackathon-rule-list">
          {entry.rules.length ? (
            entry.rules.map((rule) => {
              const evaluation = evaluationByRule.get(rule.id);
              const evaluationStatus = String(evaluation?.status ?? 'not_evaluated');
              return (
                <article className="hackathon-rule" key={rule.id}>
                  <div className="hackathon-rule__heading">
                    <div>
                      <h3>{titleCase(rule.ruleType)}</h3>
                      <p>
                        Source <code>{rule.sourceId ?? 'unattributed'}</code> · confidence{' '}
                        <strong>{titleCase(rule.confidence)}</strong> ·{' '}
                        {rule.blocking ? 'blocking' : 'non-blocking'}
                      </p>
                    </div>
                    <div className="hackathon-rule__badges">
                      <Badge tone={statusTone(rule.reviewState)}>{titleCase(rule.reviewState)}</Badge>
                      <Badge tone={statusTone(evaluationStatus)}>
                        {titleCase(evaluationStatus)}
                      </Badge>
                    </div>
                  </div>
                  <pre aria-label={`${titleCase(rule.ruleType)} rule value`}>
                    <code>{readableValue(rule.value)}</code>
                  </pre>
                  {evaluation?.reason ? <p>{String(evaluation.reason)}</p> : null}
                  {rule.reviewState === 'pending' ? (
                    <div className="hackathon-entry-inline-actions">
                      <Button
                        size="small"
                        loading={busy}
                        icon={<Check aria-hidden="true" />}
                        onClick={() => void onReviewRule(rule.id, 'accept')}
                      >
                        Accept {titleCase(rule.ruleType).toLowerCase()}
                      </Button>
                      <Button
                        size="small"
                        tone="danger"
                        loading={busy}
                        icon={<X aria-hidden="true" />}
                        onClick={() => void onReviewRule(rule.id, 'reject')}
                      >
                        Reject {titleCase(rule.ruleType).toLowerCase()}
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="hackathon-entry-empty">No structured rules are attached to this cycle.</p>
          )}
        </div>
      </div>
    </Section>
  );
}
