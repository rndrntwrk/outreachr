import { useMemo, useState } from 'react';
import { FileLock2, Plus, ShieldCheck } from 'lucide-react';
import type {
  NarrativeProfileSummary,
  NarrativePurpose,
} from '../../../shared/venture-contracts';
import { CanonicalDemoList } from '../components/ventures/CanonicalDemoList';
import { NarrativeVersionEditor } from '../components/ventures/NarrativeVersionEditor';
import { Badge, Button, Dialog, EmptyState, PageHeader, Section, formatDate, titleCase } from '../components/ui';
import { useWorkspace } from '../state/WorkspaceContext';

const PURPOSE_ORDER: NarrativePurpose[] = [
  'investor',
  'accelerator',
  'grant',
  'hackathon',
  'sponsor',
  'partner',
  'media',
];

function narrativeTone(state: NarrativeProfileSummary['approvalState']): 'success' | 'warning' | 'neutral' {
  if (state === 'approved') return 'success';
  if (state === 'draft') return 'warning';
  return 'neutral';
}

export function NarrativesPage(): React.JSX.Element {
  const { data, command, notify } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<NarrativeProfileSummary | null>(null);
  const [approving, setApproving] = useState<NarrativeProfileSummary | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(
    () =>
      PURPOSE_ORDER.map((purpose) => ({
        purpose,
        versions: (data?.narrativeProfiles ?? [])
          .filter((item) => item.purpose === purpose)
          .sort((left, right) => right.version - left.version),
      })).filter((group) => group.versions.length),
    [data?.narrativeProfiles],
  );

  const approvingEntity = data?.legalEntities.find(
    (item) => item.id === approving?.legalEntityId,
  );
  const approvingVenture = data?.ventures.find((item) => item.id === approving?.ventureId);

  const approve = async (): Promise<void> => {
    if (!approving || saving) return;
    setSaving(true);
    try {
      await command('narrative.approve', {
        id: approving.id,
        expectedContentSha256: approving.contentSha256,
      });
      notify({
        tone: 'success',
        title: 'Narrative approved',
        detail: `${approving.purpose} v${approving.version}`,
      });
      setApproving(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        kicker="External stories"
        title="Narratives & demos"
        description="Version the exact story and implementation baseline used by each investor, accelerator, grant, hackathon, sponsor, partner, or media application."
        actions={
          <Button onClick={() => setCreating(true)} disabled={!data?.ventures.length}>
            <Plus aria-hidden="true" /> New narrative version
          </Button>
        }
      />

      <Section
        title="Narrative versions"
        description="Approval freezes the selected legal entity, venture, purpose, descriptions, claims boundary, references and digest."
      >
        {groups.length ? (
          <div className="authority-narrative-groups">
            {groups.map((group) => (
              <section
                key={group.purpose}
                className="authority-narrative-group"
                aria-label={`${titleCase(group.purpose)} narratives`}
              >
                <header className="authority-narrative-group__header">
                  <div>
                    <h3>{titleCase(group.purpose)}</h3>
                    <p>{group.versions.length} retained version{group.versions.length === 1 ? '' : 's'}</p>
                  </div>
                  <Badge tone={group.versions.some((item) => item.approvalState === 'approved') ? 'success' : 'warning'}>
                    {group.versions.some((item) => item.approvalState === 'approved')
                      ? 'approved story'
                      : 'draft only'}
                  </Badge>
                </header>
                <div className="authority-version-list">
                  {group.versions.map((version) => (
                    <article key={version.id} className="authority-version-row">
                      <div className="authority-version-row__state">
                        <FileLock2 aria-hidden="true" />
                        <div>
                          <strong>Version {version.version}</strong>
                          <span>{version.descriptions.words50}</span>
                        </div>
                      </div>
                      <div className="authority-version-row__meta">
                        <Badge tone={narrativeTone(version.approvalState)}>
                          {version.approvalState}
                        </Badge>
                        <code title={version.contentSha256}>
                          {version.contentSha256.slice(0, 12)}…
                        </code>
                        {version.approvedAt ? <span>{formatDate(version.approvedAt)}</span> : null}
                      </div>
                      <div className="authority-version-row__actions">
                        {version.approvalState === 'draft' ? (
                          <Button
                            size="small"
                            onClick={() => setApproving(version)}
                            aria-label={`Review ${version.purpose} version ${version.version}`}
                          >
                            <ShieldCheck aria-hidden="true" /> Review exact draft
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="quiet"
                            onClick={() => setViewing(version)}
                            aria-label={`Open ${version.purpose} version ${version.version}`}
                          >
                            Open immutable version
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No narrative versions"
            detail="Create a purpose-specific version before preparing an external application."
            action={<Button onClick={() => setCreating(true)}>New narrative version</Button>}
          />
        )}
      </Section>

      <Section
        title="Canonical demo versions"
        description="One reusable demo family can support many applications, but each approved version is bound to one exact implementation baseline."
      >
        <CanonicalDemoList demos={data?.canonicalDemos ?? []} />
      </Section>

      <NarrativeVersionEditor
        open={creating}
        onClose={() => setCreating(false)}
      />
      <NarrativeVersionEditor
        open={Boolean(viewing)}
        narrative={viewing}
        onClose={() => setViewing(null)}
      />

      <Dialog
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        title={
          approving
            ? `Approve ${approving.purpose} narrative version ${approving.version}`
            : 'Approve narrative version'
        }
        description="This approval is immutable. Later changes require a new version."
        footer={
          <>
            <Button variant="quiet" onClick={() => setApproving(null)}>
              Cancel
            </Button>
            <Button onClick={() => void approve()} disabled={!approving || saving}>
              {saving ? 'Approving…' : 'Approve exact narrative'}
            </Button>
          </>
        }
      >
        {approving ? (
          <div className="authority-approval-review">
            <div className="authority-review-grid">
              <div>
                <span>Legal entity</span>
                <strong>{approvingEntity?.legalName ?? 'Missing legal entity'}</strong>
              </div>
              <div>
                <span>Venture</span>
                <strong>{approvingVenture?.name ?? 'Missing venture'}</strong>
              </div>
              <div>
                <span>Purpose</span>
                <strong>{approving.purpose}</strong>
              </div>
              <div>
                <span>Version</span>
                <strong>Version {approving.version}</strong>
              </div>
              <div>
                <span>Content digest</span>
                <code>{approving.contentSha256}</code>
              </div>
            </div>
            <div className="authority-frozen-copy">
              <section>
                <h4>50-word description</h4>
                <p>{approving.descriptions.words50}</p>
              </section>
              <section>
                <h4>100-word description</h4>
                <p>{approving.descriptions.words100}</p>
              </section>
              <section>
                <h4>250-word description</h4>
                <p>{approving.descriptions.words250}</p>
              </section>
              <section>
                <h4>Problem</h4>
                <p>{approving.problem}</p>
              </section>
              <section>
                <h4>Product wedge</h4>
                <p>{approving.productWedge}</p>
              </section>
              <section>
                <h4>Why now</h4>
                <p>{approving.whyNow}</p>
              </section>
              <section>
                <h4>Technical differentiation</h4>
                <p>{approving.technicalDifferentiation}</p>
              </section>
              <section>
                <h4>Evidence framing</h4>
                <p>{approving.evidenceFraming}</p>
              </section>
              <section>
                <h4>Business model</h4>
                <p>{approving.businessModel}</p>
              </section>
              <section>
                <h4>Use of funds</h4>
                <p>{approving.useOfFunds}</p>
              </section>
              <section>
                <h4>Claims boundary</h4>
                <p>{approving.claimsBoundary}</p>
              </section>
              <section>
                <h4>Deck reference</h4>
                <p>{approving.deckReference ?? 'None'}</p>
              </section>
              <section>
                <h4>Demo reference</h4>
                <p>{approving.demoReference ?? 'None'}</p>
              </section>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
