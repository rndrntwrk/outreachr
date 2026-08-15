import { useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Scale, WalletCards } from 'lucide-react';
import type {
  CapitalMandateSummary,
  LegalEntitySummary,
  VentureSummary,
} from '../../../shared/venture-contracts';
import { CapitalMandateEditor } from '../components/ventures/CapitalMandateEditor';
import { LegalEntityEditor } from '../components/ventures/LegalEntityEditor';
import { VentureEditor } from '../components/ventures/VentureEditor';
import { Badge, Button, EmptyState, PageHeader, Section, formatMoney, titleCase } from '../components/ui';
import { useWorkspace } from '../state/WorkspaceContext';

export function VenturesPage(): React.JSX.Element {
  const { data } = useWorkspace();
  const [legalEntityEditor, setLegalEntityEditor] = useState<LegalEntitySummary | 'new' | null>(null);
  const [ventureEditor, setVentureEditor] = useState<VentureSummary | 'new' | null>(null);
  const [mandateEditor, setMandateEditor] = useState<CapitalMandateSummary | 'new' | null>(null);

  const activeMandate = useMemo(
    () =>
      data?.capitalMandates.find((item) => item.id === data.activeCapitalMandateId) ??
      data?.capitalMandates.find((item) => item.status === 'active') ??
      null,
    [data?.activeCapitalMandateId, data?.capitalMandates],
  );
  const grouped = useMemo(
    () =>
      (data?.legalEntities ?? []).map((entity) => ({
        entity,
        ventures: data?.ventures.filter((venture) => venture.legalEntityId === entity.id) ?? [],
      })),
    [data?.legalEntities, data?.ventures],
  );
  const mandateEntity = data?.legalEntities.find((item) => item.id === activeMandate?.legalEntityId);
  const mandateVenture = data?.ventures.find((item) => item.id === activeMandate?.ventureId);
  const mandateNarrative = data?.narrativeProfiles.find(
    (item) => item.id === activeMandate?.narrativeProfileId,
  );
  const currentDemo = data?.canonicalDemos.find((demo) =>
    demo.versions.some((version) => version.id === mandateVenture?.currentDemoVersionId),
  );
  const currentDemoVersion = currentDemo?.versions.find(
    (version) => version.id === mandateVenture?.currentDemoVersionId,
  );

  return (
    <div className="page">
      <PageHeader
        kicker="Authority"
        title="Ventures"
        description="Keep legal entities, submit-able products, investment narratives, demos and capital mandates distinct."
        actions={
          <>
            <Button variant="secondary" onClick={() => setLegalEntityEditor('new')}>
              <Plus aria-hidden="true" /> Add legal entity
            </Button>
            <Button onClick={() => setVentureEditor('new')} disabled={!data?.legalEntities.length}>
              <Plus aria-hidden="true" /> Add venture
            </Button>
          </>
        }
      />

      <Section
        title="Legal entities and ventures"
        description="A venture can lead an application without becoming a separate company."
      >
        {grouped.length ? (
          <div className="authority-entity-stack">
            {grouped.map(({ entity, ventures }) => (
              <article key={entity.id} className="authority-entity">
                <header className="authority-entity__header">
                  <div className="authority-entity__identity">
                    <span className="authority-entity__icon" aria-hidden="true">
                      <Building2 />
                    </span>
                    <div>
                      <strong>{entity.legalName}</strong>
                      <span>
                        {entity.displayName} · {titleCase(entity.entityType)}
                        {entity.jurisdiction ? ` · ${entity.jurisdiction}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="authority-entity__actions">
                    <Badge tone={entity.status === 'active' ? 'success' : 'neutral'}>
                      {entity.status}
                    </Badge>
                    <Button size="small" variant="quiet" onClick={() => setLegalEntityEditor(entity)}>
                      <Pencil aria-hidden="true" /> Edit entity
                    </Button>
                  </div>
                </header>
                <p className="authority-entity__authority">{entity.founderAuthority}</p>

                {ventures.length ? (
                  <div className="authority-venture-list">
                    {ventures.map((venture) => {
                      const narrative = data?.narrativeProfiles.find(
                        (item) => item.id === venture.defaultNarrativeProfileId,
                      );
                      const demo = data?.canonicalDemos.find((item) =>
                        item.versions.some(
                          (version) => version.id === venture.currentDemoVersionId,
                        ),
                      );
                      const demoVersion = demo?.versions.find(
                        (version) => version.id === venture.currentDemoVersionId,
                      );
                      return (
                        <article key={venture.id} className="authority-venture-card">
                          <div className="authority-venture-card__topline">
                            <div>
                              <h3>{venture.name}</h3>
                              <p>{venture.category}</p>
                            </div>
                            <div className="authority-venture-card__actions">
                              <Badge tone={venture.status === 'active' ? 'success' : 'neutral'}>
                                {venture.status}
                              </Badge>
                              <Button
                                size="small"
                                variant="quiet"
                                onClick={() => setVentureEditor(venture)}
                              >
                                <Pencil aria-hidden="true" /> Edit venture
                              </Button>
                            </div>
                          </div>
                          <p className="authority-venture-card__utility">{venture.utility}</p>
                          <dl className="authority-facts">
                            <div>
                              <dt>Stage</dt>
                              <dd>{titleCase(venture.stage)}</dd>
                            </div>
                            <div>
                              <dt>Default narrative</dt>
                              <dd>
                                {narrative
                                  ? `${titleCase(narrative.purpose)} narrative v${narrative.version}`
                                  : 'Not selected'}
                              </dd>
                            </div>
                            <div>
                              <dt>Current demo</dt>
                              <dd>
                                {demo && demoVersion
                                  ? `${demo.name} v${demoVersion.version}`
                                  : 'Not selected'}
                              </dd>
                            </div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="authority-empty-inline">
                    <span>No ventures belong to this entity yet.</span>
                    <Button size="small" variant="quiet" onClick={() => setVentureEditor('new')}>
                      Add venture
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No legal entity authority"
            detail="Add the entity that can apply, raise, sign, receive funds, or accept terms."
            action={<Button onClick={() => setLegalEntityEditor('new')}>Add legal entity</Button>}
          />
        )}
      </Section>

      <Section
        title="Capital mandate"
        description="The active round can use only one legal entity, venture and approved investor narrative."
        actions={
          <Button
            size="small"
            variant={activeMandate ? 'secondary' : 'primary'}
            onClick={() => setMandateEditor(activeMandate ?? 'new')}
            disabled={!data?.round || !data?.legalEntities.length || !data?.ventures.length}
          >
            {activeMandate ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {activeMandate ? 'Edit capital mandate' : 'Add capital mandate'}
          </Button>
        }
      >
        {activeMandate && data?.round ? (
          <div className="authority-mandate">
            <div className="authority-mandate__hero">
              <span className="authority-mandate__icon" aria-hidden="true">
                <WalletCards />
              </span>
              <div>
                <span>Round: {data.round.companyName} · {data.round.stage.replace('_', '-')}</span>
                <strong>{formatMoney(activeMandate.targetAmountUsd)}</strong>
                <p>{activeMandate.instrument}</p>
              </div>
              <Badge tone={activeMandate.status === 'active' ? 'success' : 'neutral'}>
                {activeMandate.status}
              </Badge>
            </div>
            <dl className="authority-facts authority-facts--mandate">
              <div>
                <dt>Legal entity</dt>
                <dd>{mandateEntity?.displayName ?? 'Missing authority record'}</dd>
              </div>
              <div>
                <dt>Venture</dt>
                <dd>{mandateVenture?.name ?? 'Missing authority record'}</dd>
              </div>
              <div>
                <dt>Approved narrative</dt>
                <dd>
                  {mandateNarrative
                    ? `Investor narrative v${mandateNarrative.version}`
                    : 'Missing approved narrative'}
                </dd>
              </div>
              <div>
                <dt>Current demo</dt>
                <dd>
                  {currentDemo && currentDemoVersion
                    ? `${currentDemo.name} v${currentDemoVersion.version}`
                    : 'No current demo'}
                </dd>
              </div>
              <div>
                <dt>Check range</dt>
                <dd>
                  {activeMandate.minimumCheckUsd !== null
                    ? formatMoney(activeMandate.minimumCheckUsd)
                    : 'Open'}{' '}
                  –{' '}
                  {activeMandate.maximumCheckUsd !== null
                    ? formatMoney(activeMandate.maximumCheckUsd)
                    : 'Open'}
                </dd>
              </div>
              <div>
                <dt>Token side letter</dt>
                <dd>{activeMandate.tokenSideLetterPolicy}</dd>
              </div>
            </dl>
            <div className="authority-use-of-funds">
              <Scale aria-hidden="true" />
              <div>
                <strong>Approved use of funds</strong>
                <p>{activeMandate.approvedUseOfFunds}</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No capital mandate"
            detail="Bind the active round to one entity, venture and approved investor narrative."
          />
        )}
      </Section>

      <LegalEntityEditor
        open={legalEntityEditor !== null}
        entity={legalEntityEditor === 'new' ? null : legalEntityEditor}
        onClose={() => setLegalEntityEditor(null)}
      />
      <VentureEditor
        open={ventureEditor !== null}
        venture={ventureEditor === 'new' ? null : ventureEditor}
        onClose={() => setVentureEditor(null)}
      />
      <CapitalMandateEditor
        open={mandateEditor !== null}
        mandate={mandateEditor === 'new' ? null : mandateEditor}
        onClose={() => setMandateEditor(null)}
      />
    </div>
  );
}
