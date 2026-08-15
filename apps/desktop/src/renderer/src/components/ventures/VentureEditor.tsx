import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  VentureSaveInput,
  VentureStage,
  VentureSummary,
} from '../../../../shared/venture-contracts';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Button, Dialog } from '../ui';

function initialState(
  venture: VentureSummary | null,
  defaultLegalEntityId: string,
): VentureSaveInput {
  return venture
    ? {
        id: venture.id,
        legalEntityId: venture.legalEntityId,
        name: venture.name,
        category: venture.category,
        utility: venture.utility,
        stage: venture.stage,
        status: venture.status,
        publicUrl: venture.publicUrl,
        defaultNarrativeProfileId: venture.defaultNarrativeProfileId,
        currentDemoVersionId: venture.currentDemoVersionId,
      }
    : {
        legalEntityId: defaultLegalEntityId,
        name: '',
        category: '',
        utility: '',
        stage: 'concept',
        status: 'active',
        publicUrl: null,
        defaultNarrativeProfileId: null,
        currentDemoVersionId: null,
      };
}

export function VentureEditor({
  open,
  venture = null,
  onClose,
}: {
  open: boolean;
  venture?: VentureSummary | null;
  onClose: () => void;
}): React.JSX.Element {
  const { data, command, notify } = useWorkspace();
  const defaultLegalEntityId = data?.legalEntities.find((item) => item.status === 'active')?.id ?? '';
  const [form, setForm] = useState<VentureSaveInput>(() =>
    initialState(venture, defaultLegalEntityId),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initialState(venture, defaultLegalEntityId));
  }, [defaultLegalEntityId, open, venture]);

  const narratives = useMemo(
    () => data?.narrativeProfiles.filter((item) => item.ventureId === form.id) ?? [],
    [data?.narrativeProfiles, form.id],
  );
  const demoVersions = useMemo(
    () => data?.canonicalDemos.flatMap((demo) => demo.versions) ?? [],
    [data?.canonicalDemos],
  );
  const valid = Boolean(
    form.legalEntityId && form.name.trim() && form.category.trim() && form.utility.trim(),
  );

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await command('venture.save', form);
      notify({
        tone: 'success',
        title: venture ? 'Venture updated' : 'Venture added',
        detail: form.name.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={venture ? 'Edit venture' : 'Add venture'}
      description="A venture is a submit-able product and narrative context. It is not automatically a separate legal entity."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="venture-editor" disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Save venture'}
          </Button>
        </>
      }
    >
      <form id="venture-editor" className="authority-form" onSubmit={(event) => void submit(event)}>
        <div className="authority-form-grid">
          <label className="field">
            <span className="field__label">Legal entity</span>
            <select
              className="select"
              value={form.legalEntityId}
              onChange={(event) => setForm({ ...form, legalEntityId: event.target.value })}
              disabled={Boolean(venture)}
            >
              <option value="">Select an entity</option>
              {data?.legalEntities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
            {venture ? (
              <span className="field__hint">
                A venture with narrative or mandate history cannot move between entities.
              </span>
            ) : null}
          </label>
          <label className="field">
            <span className="field__label">Venture name</span>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field__label">Category</span>
            <input
              className="input"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Programmable settlement"
            />
          </label>
          <label className="field">
            <span className="field__label">Stage</span>
            <select
              className="select"
              value={form.stage}
              onChange={(event) =>
                setForm({ ...form, stage: event.target.value as VentureStage })
              }
            >
              <option value="concept">Concept</option>
              <option value="prototype">Prototype</option>
              <option value="pre_production">Pre-production</option>
              <option value="production">Production</option>
              <option value="scaling">Scaling</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Status</span>
            <select
              className="select"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as VentureSaveInput['status'] })
              }
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Public URL</span>
            <input
              className="input"
              type="url"
              value={form.publicUrl ?? ''}
              onChange={(event) =>
                setForm({ ...form, publicUrl: event.target.value.trim() || null })
              }
              placeholder="https://example.com"
            />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Utility</span>
          <textarea
            className="textarea"
            value={form.utility}
            onChange={(event) => setForm({ ...form, utility: event.target.value })}
            placeholder="Describe the user-facing outcome without listing implementation features."
          />
        </label>
        {venture ? (
          <div className="authority-form-grid">
            <label className="field">
              <span className="field__label">Default narrative</span>
              <select
                className="select"
                value={form.defaultNarrativeProfileId ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    defaultNarrativeProfileId: event.target.value || null,
                  })
                }
              >
                <option value="">No default</option>
                {narratives.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.purpose} v{item.version} · {item.approvalState}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Current demo version</span>
              <select
                className="select"
                value={form.currentDemoVersionId ?? ''}
                onChange={(event) =>
                  setForm({ ...form, currentDemoVersionId: event.target.value || null })
                }
              >
                <option value="">No current demo</option>
                {demoVersions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.demoId} v{item.version} · {item.approvalState}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
