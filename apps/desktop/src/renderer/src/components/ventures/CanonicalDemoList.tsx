import { useMemo, useState, type FormEvent } from 'react';
import type {
  CanonicalDemoSummary,
  CanonicalDemoVersionCreateInput,
  CanonicalDemoVersionSummary,
} from '../../../../shared/venture-contracts';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Badge, Button, DataTable, Dialog } from '../ui';

function zeroSha(value: string): boolean {
  return /^0{40}$/u.test(value);
}

function csv(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CanonicalDemoList({ demos }: { demos: CanonicalDemoSummary[] }): React.JSX.Element {
  const { command, notify } = useWorkspace();
  const [selected, setSelected] = useState<CanonicalDemoVersionSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CanonicalDemoVersionCreateInput>({
    demoId: demos[0]?.id ?? '',
    baselineRepository: '',
    baselineCommitSha: '',
    branchConvention: 'hackathon/{event}/{entry}',
    expectedBaselineHours: 24,
    coreAssets: [],
    evidenceRequirements: [],
    approvedClaims: [],
  });
  const rows = useMemo(
    () =>
      demos.flatMap((demo) =>
        demo.versions.map((version) => ({
          demo,
          version,
        })),
      ),
    [demos],
  );

  const openCreate = (): void => {
    setForm({
      demoId: demos[0]?.id ?? '',
      baselineRepository: '',
      baselineCommitSha: '',
      branchConvention: 'hackathon/{event}/{entry}',
      expectedBaselineHours: 24,
      coreAssets: [],
      evidenceRequirements: [],
      approvedClaims: [],
    });
    setCreating(true);
  };

  const create = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (
      saving ||
      !form.demoId ||
      !form.baselineRepository.trim() ||
      !/^[a-f0-9]{40}$/u.test(form.baselineCommitSha) ||
      !form.coreAssets.length ||
      !form.evidenceRequirements.length ||
      !form.approvedClaims.length
    ) {
      return;
    }
    setSaving(true);
    try {
      const created = await command('canonicalDemo.createVersion', form);
      notify({
        tone: 'success',
        title: 'Canonical demo draft created',
        detail: `${created.demoId} v${created.version}`,
      });
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  const approve = async (): Promise<void> => {
    if (!selected || saving || zeroSha(selected.baselineCommitSha)) return;
    setSaving(true);
    try {
      await command('canonicalDemo.approve', {
        id: selected.id,
        expectedContentSha256: selected.contentSha256,
      });
      notify({
        tone: 'success',
        title: 'Canonical demo approved',
        detail: `${selected.demoId} v${selected.version}`,
      });
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  if (!demos.length) {
    return (
      <div className="empty-state authority-empty">
        <strong>No canonical demos imported</strong>
        <span>Import the founder-reviewed public package before binding implementation baselines.</span>
      </div>
    );
  }

  return (
    <>
      <div className="section__toolbar">
        <span className="muted-copy">
          Draft versions remain non-authoritative until a real repository and commit are reviewed.
        </span>
        <Button size="small" onClick={openCreate}>
          Add demo version
        </Button>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Demo</th>
            <th>Version</th>
            <th>Baseline</th>
            <th>Evidence</th>
            <th>State</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ demo, version }) => {
            const blocked = zeroSha(version.baselineCommitSha);
            return (
              <tr key={version.id}>
                <td>
                  <strong>{demo.name}</strong>
                  <span className="table-note">{demo.category}</span>
                </td>
                <td>Version {version.version}</td>
                <td>
                  <strong>{version.baselineRepository}</strong>
                  <code className="authority-sha">{version.baselineCommitSha}</code>
                </td>
                <td>
                  {version.evidenceRequirements.length} required
                  <span className="table-note">{version.expectedBaselineHours} baseline hours</span>
                </td>
                <td>
                  <Badge
                    tone={
                      version.approvalState === 'approved'
                        ? 'success'
                        : version.approvalState === 'superseded'
                          ? 'neutral'
                          : 'warning'
                    }
                  >
                    {version.approvalState}
                  </Badge>
                  {blocked ? (
                    <span className="table-note authority-blocked">
                      Bind a real commit before approval
                    </span>
                  ) : null}
                </td>
                <td className="table-action-cell">
                  <Button
                    size="small"
                    variant="quiet"
                    disabled={version.approvalState !== 'draft' || blocked}
                    onClick={() => setSelected(version)}
                  >
                    Approve demo version {version.version}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Add canonical demo version"
        description="A new draft receives its version number and digest from the local vault."
        footer={
          <>
            <Button variant="quiet" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" form="canonical-demo-version-editor" disabled={saving}>
              {saving ? 'Saving…' : 'Save demo draft'}
            </Button>
          </>
        }
      >
        <form
          id="canonical-demo-version-editor"
          className="authority-form"
          onSubmit={(event) => void create(event)}
        >
          <div className="authority-form-grid">
            <label className="field">
              <span className="field__label">Canonical demo</span>
              <select
                className="select"
                value={form.demoId}
                onChange={(event) => setForm({ ...form, demoId: event.target.value })}
              >
                {demos.map((demo) => (
                  <option key={demo.id} value={demo.id}>
                    {demo.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Baseline repository</span>
              <input
                className="input"
                value={form.baselineRepository}
                onChange={(event) =>
                  setForm({ ...form, baselineRepository: event.target.value.trim() })
                }
                placeholder="owner/repository"
              />
            </label>
            <label className="field">
              <span className="field__label">Baseline commit SHA</span>
              <input
                className="input authority-mono-input"
                value={form.baselineCommitSha}
                onChange={(event) =>
                  setForm({ ...form, baselineCommitSha: event.target.value.trim().toLowerCase() })
                }
                placeholder="40-character commit SHA"
              />
            </label>
            <label className="field">
              <span className="field__label">Expected baseline hours</span>
              <input
                className="input"
                type="number"
                min="1"
                max="1000"
                value={form.expectedBaselineHours}
                onChange={(event) =>
                  setForm({ ...form, expectedBaselineHours: Math.max(1, Number(event.target.value)) })
                }
              />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Branch convention</span>
            <input
              className="input authority-mono-input"
              value={form.branchConvention}
              onChange={(event) => setForm({ ...form, branchConvention: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Core assets</span>
            <textarea
              className="textarea"
              value={form.coreAssets.join('\n')}
              onChange={(event) => setForm({ ...form, coreAssets: csv(event.target.value) })}
              placeholder="One item per line"
            />
          </label>
          <label className="field">
            <span className="field__label">Evidence requirements</span>
            <textarea
              className="textarea"
              value={form.evidenceRequirements.join('\n')}
              onChange={(event) =>
                setForm({ ...form, evidenceRequirements: csv(event.target.value) })
              }
              placeholder="One item per line"
            />
          </label>
          <label className="field">
            <span className="field__label">Approved claims</span>
            <textarea
              className="textarea"
              value={form.approvedClaims.join('\n')}
              onChange={(event) => setForm({ ...form, approvedClaims: csv(event.target.value) })}
              placeholder="One bounded public claim per line"
            />
          </label>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Approve demo version ${selected.version}` : 'Approve demo version'}
        description="Approval freezes this exact implementation baseline, evidence package and public claim set."
        footer={
          <>
            <Button variant="quiet" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={() => void approve()} disabled={!selected || saving}>
              {saving ? 'Approving…' : 'Approve exact demo'}
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="authority-review-grid authority-review-grid--single">
            <div>
              <span>Repository</span>
              <strong>{selected.baselineRepository}</strong>
            </div>
            <div>
              <span>Commit</span>
              <code>{selected.baselineCommitSha}</code>
            </div>
            <div>
              <span>Branch convention</span>
              <code>{selected.branchConvention}</code>
            </div>
            <div>
              <span>Content digest</span>
              <code>{selected.contentSha256}</code>
            </div>
            <div>
              <span>Approved claims</span>
              <ul>
                {selected.approvedClaims.map((claim) => (
                  <li key={claim}>{claim}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
