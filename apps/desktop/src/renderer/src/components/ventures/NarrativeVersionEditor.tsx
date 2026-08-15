import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  NarrativeProfileSummary,
  NarrativePurpose,
  NarrativeVersionCreateInput,
} from '../../../../shared/venture-contracts';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Button, Dialog } from '../ui';

const PURPOSES: Array<{ value: NarrativePurpose; label: string }> = [
  { value: 'investor', label: 'Investor' },
  { value: 'accelerator', label: 'Accelerator' },
  { value: 'grant', label: 'Grant' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'partner', label: 'Partner' },
  { value: 'media', label: 'Media' },
];

function initialState(
  defaultLegalEntityId: string,
  defaultVentureId: string,
): NarrativeVersionCreateInput {
  return {
    legalEntityId: defaultLegalEntityId,
    ventureId: defaultVentureId,
    purpose: 'investor',
    descriptions: { words50: '', words100: '', words250: '' },
    problem: '',
    productWedge: '',
    whyNow: '',
    technicalDifferentiation: '',
    evidenceFraming: '',
    businessModel: '',
    useOfFunds: '',
    claimsBoundary: '',
    deckReference: null,
    demoReference: null,
  };
}

function NarrativeTextarea({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea
        className="textarea authority-textarea"
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
    </label>
  );
}

export function NarrativeVersionEditor({
  open,
  narrative = null,
  onClose,
}: {
  open: boolean;
  narrative?: NarrativeProfileSummary | null;
  onClose: () => void;
}): React.JSX.Element {
  const { data, command, notify } = useWorkspace();
  const firstEntity = data?.legalEntities.find((item) => item.status === 'active') ??
    data?.legalEntities[0] ??
    null;
  const firstVenture = data?.ventures.find(
    (item) => item.legalEntityId === firstEntity?.id && item.status === 'active',
  );
  const [form, setForm] = useState<NarrativeVersionCreateInput>(() =>
    initialState(firstEntity?.id ?? '', firstVenture?.id ?? ''),
  );
  const [saving, setSaving] = useState(false);
  const readOnly = narrative !== null;

  useEffect(() => {
    if (open && !narrative) {
      setForm(initialState(firstEntity?.id ?? '', firstVenture?.id ?? ''));
    }
  }, [firstEntity?.id, firstVenture?.id, narrative, open]);

  const ventures = useMemo(
    () => data?.ventures.filter((item) => item.legalEntityId === form.legalEntityId) ?? [],
    [data?.ventures, form.legalEntityId],
  );
  const valid = Boolean(
    form.legalEntityId &&
      form.ventureId &&
      form.descriptions.words50.trim() &&
      form.descriptions.words100.trim() &&
      form.descriptions.words250.trim() &&
      form.problem.trim() &&
      form.productWedge.trim() &&
      form.whyNow.trim() &&
      form.technicalDifferentiation.trim() &&
      form.evidenceFraming.trim() &&
      form.businessModel.trim() &&
      form.useOfFunds.trim() &&
      form.claimsBoundary.trim(),
  );

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (readOnly || !valid || saving) return;
    setSaving(true);
    try {
      const created = await command('narrative.createVersion', form);
      notify({
        tone: 'success',
        title: 'Narrative draft created',
        detail: `${created.purpose} v${created.version} · ${created.contentSha256.slice(0, 12)}…`,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const view = narrative;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        view
          ? `${view.purpose[0]?.toUpperCase()}${view.purpose.slice(1)} narrative version ${view.version}`
          : 'New narrative version'
      }
      description={
        view
          ? 'Approved and superseded versions are immutable. Create a new version to change the story.'
          : 'The local vault assigns the version number and calculates the immutable content digest.'
      }
      footer={
        readOnly ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="narrative-version-editor" disabled={!valid || saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </Button>
          </>
        )
      }
    >
      {view ? (
        <div className="authority-form">
          <div className="authority-review-grid">
            <div>
              <span>Purpose</span>
              <strong>{view.purpose}</strong>
            </div>
            <div>
              <span>Version</span>
              <strong>{view.version}</strong>
            </div>
            <div>
              <span>State</span>
              <strong>{view.approvalState}</strong>
            </div>
            <div>
              <span>Content digest</span>
              <code>{view.contentSha256}</code>
            </div>
          </div>
          <NarrativeTextarea label="50-word description" value={view.descriptions.words50} readOnly />
          <NarrativeTextarea label="100-word description" value={view.descriptions.words100} readOnly />
          <NarrativeTextarea label="250-word description" value={view.descriptions.words250} readOnly />
          <NarrativeTextarea label="Problem" value={view.problem} readOnly />
          <NarrativeTextarea label="Product wedge" value={view.productWedge} readOnly />
          <NarrativeTextarea label="Why now" value={view.whyNow} readOnly />
          <NarrativeTextarea
            label="Technical differentiation"
            value={view.technicalDifferentiation}
            readOnly
          />
          <NarrativeTextarea label="Evidence framing" value={view.evidenceFraming} readOnly />
          <NarrativeTextarea label="Business model" value={view.businessModel} readOnly />
          <NarrativeTextarea label="Use of funds" value={view.useOfFunds} readOnly />
          <NarrativeTextarea label="Claims boundary" value={view.claimsBoundary} readOnly />
        </div>
      ) : (
        <form
          id="narrative-version-editor"
          className="authority-form"
          onSubmit={(event) => void submit(event)}
        >
          <div className="authority-form-grid">
            <label className="field">
              <span className="field__label">Legal entity</span>
              <select
                className="select"
                value={form.legalEntityId}
                onChange={(event) => {
                  const legalEntityId = event.target.value;
                  const venture = data?.ventures.find(
                    (item) => item.legalEntityId === legalEntityId && item.status === 'active',
                  );
                  setForm({
                    ...form,
                    legalEntityId,
                    ventureId: venture?.id ?? '',
                  });
                }}
              >
                <option value="">Select an entity</option>
                {data?.legalEntities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Venture</span>
              <select
                className="select"
                value={form.ventureId}
                onChange={(event) => setForm({ ...form, ventureId: event.target.value })}
              >
                <option value="">Select a venture</option>
                {ventures.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Purpose</span>
              <select
                className="select"
                value={form.purpose}
                onChange={(event) =>
                  setForm({ ...form, purpose: event.target.value as NarrativePurpose })
                }
              >
                {PURPOSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <NarrativeTextarea
            label="50-word description"
            value={form.descriptions.words50}
            readOnly={false}
            onChange={(words50) =>
              setForm({ ...form, descriptions: { ...form.descriptions, words50 } })
            }
          />
          <NarrativeTextarea
            label="100-word description"
            value={form.descriptions.words100}
            readOnly={false}
            onChange={(words100) =>
              setForm({ ...form, descriptions: { ...form.descriptions, words100 } })
            }
          />
          <NarrativeTextarea
            label="250-word description"
            value={form.descriptions.words250}
            readOnly={false}
            onChange={(words250) =>
              setForm({ ...form, descriptions: { ...form.descriptions, words250 } })
            }
          />
          {[
            ['Problem', 'problem'],
            ['Product wedge', 'productWedge'],
            ['Why now', 'whyNow'],
            ['Technical differentiation', 'technicalDifferentiation'],
            ['Evidence framing', 'evidenceFraming'],
            ['Business model', 'businessModel'],
            ['Use of funds', 'useOfFunds'],
            ['Claims boundary', 'claimsBoundary'],
          ].map(([label, key]) => (
            <NarrativeTextarea
              key={key}
              label={label!}
              value={form[key as keyof NarrativeVersionCreateInput] as string}
              readOnly={false}
              onChange={(value) => setForm({ ...form, [key!]: value })}
            />
          ))}
          <div className="authority-form-grid">
            <label className="field">
              <span className="field__label">Deck reference</span>
              <input
                className="input"
                value={form.deckReference ?? ''}
                onChange={(event) =>
                  setForm({ ...form, deckReference: event.target.value.trim() || null })
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Demo reference</span>
              <input
                className="input"
                value={form.demoReference ?? ''}
                onChange={(event) =>
                  setForm({ ...form, demoReference: event.target.value.trim() || null })
                }
              />
            </label>
          </div>
        </form>
      )}
    </Dialog>
  );
}
