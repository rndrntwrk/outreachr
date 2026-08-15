import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  LegalEntitySaveInput,
  LegalEntitySummary,
  LegalEntityType,
} from '../../../../shared/venture-contracts';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Button, Dialog } from '../ui';

const ENTITY_TYPES: Array<{ value: LegalEntityType; label: string }> = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'sole_proprietorship', label: 'Sole proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
];

function initialState(entity: LegalEntitySummary | null): LegalEntitySaveInput {
  return entity
    ? {
        id: entity.id,
        legalName: entity.legalName,
        displayName: entity.displayName,
        jurisdiction: entity.jurisdiction,
        entityType: entity.entityType,
        status: entity.status,
        incorporationReference: entity.incorporationReference,
        capTableReference: entity.capTableReference,
        founderAuthority: entity.founderAuthority,
        publicWebsite: entity.publicWebsite,
      }
    : {
        legalName: '',
        displayName: '',
        jurisdiction: null,
        entityType: 'corporation',
        status: 'active',
        incorporationReference: null,
        capTableReference: null,
        founderAuthority: '',
        publicWebsite: null,
      };
}

export function LegalEntityEditor({
  open,
  entity = null,
  onClose,
}: {
  open: boolean;
  entity?: LegalEntitySummary | null;
  onClose: () => void;
}): React.JSX.Element {
  const { command, notify } = useWorkspace();
  const [form, setForm] = useState<LegalEntitySaveInput>(() => initialState(entity));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initialState(entity));
  }, [entity, open]);

  const valid = useMemo(
    () => Boolean(form.legalName.trim() && form.displayName.trim() && form.founderAuthority.trim()),
    [form.displayName, form.founderAuthority, form.legalName],
  );

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await command('legalEntity.save', form);
      notify({
        tone: 'success',
        title: entity ? 'Legal entity updated' : 'Legal entity added',
        detail: form.displayName.trim(),
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
      title={entity ? 'Edit legal entity' : 'Add legal entity'}
      description="This is the entity that can apply, raise, sign, receive funds, or accept terms."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="legal-entity-editor" disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Save legal entity'}
          </Button>
        </>
      }
    >
      <form id="legal-entity-editor" className="authority-form" onSubmit={(event) => void submit(event)}>
        <div className="authority-form-grid">
          <label className="field">
            <span className="field__label">Legal name</span>
            <input
              className="input"
              value={form.legalName}
              onChange={(event) => setForm({ ...form, legalName: event.target.value })}
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field__label">Display name</span>
            <input
              className="input"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Jurisdiction</span>
            <input
              className="input"
              value={form.jurisdiction ?? ''}
              onChange={(event) =>
                setForm({ ...form, jurisdiction: event.target.value.trim() || null })
              }
              placeholder="Delaware"
            />
          </label>
          <label className="field">
            <span className="field__label">Entity type</span>
            <select
              className="select"
              value={form.entityType}
              onChange={(event) =>
                setForm({ ...form, entityType: event.target.value as LegalEntityType })
              }
            >
              {ENTITY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Status</span>
            <select
              className="select"
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as LegalEntitySaveInput['status'],
                })
              }
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="dissolved">Dissolved</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Public website</span>
            <input
              className="input"
              type="url"
              value={form.publicWebsite ?? ''}
              onChange={(event) =>
                setForm({ ...form, publicWebsite: event.target.value.trim() || null })
              }
              placeholder="https://example.com"
            />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Founder authority</span>
          <textarea
            className="textarea"
            value={form.founderAuthority}
            onChange={(event) => setForm({ ...form, founderAuthority: event.target.value })}
            placeholder="Describe who can make external commitments for this entity."
          />
          <span className="field__hint">
            This statement is an internal authority record, not a substitute for legal documents.
          </span>
        </label>
        <div className="authority-form-grid">
          <label className="field">
            <span className="field__label">Incorporation reference</span>
            <input
              className="input"
              value={form.incorporationReference ?? ''}
              onChange={(event) =>
                setForm({ ...form, incorporationReference: event.target.value.trim() || null })
              }
              placeholder="Private local reference"
            />
          </label>
          <label className="field">
            <span className="field__label">Cap-table reference</span>
            <input
              className="input"
              value={form.capTableReference ?? ''}
              onChange={(event) =>
                setForm({ ...form, capTableReference: event.target.value.trim() || null })
              }
              placeholder="Private local reference"
            />
          </label>
        </div>
      </form>
    </Dialog>
  );
}
