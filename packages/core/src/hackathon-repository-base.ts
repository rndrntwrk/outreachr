import type { CoreVault } from './database.js';
import {
  hackathonRulesDigest,
  type HackathonCycle,
  type HackathonEntry,
  type HackathonRule,
} from './hackathon-validation-v11.js';
import { appendAuditEntry } from './repository.js';
import { IdSchema, IsoDateTimeSchema } from './validation.js';
import {
  type CycleRow,
  type EntryRow,
  type RuleRow,
  mapCycle,
  mapEntry,
  mapRule,
} from './hackathon-repository-internal.js';

export class HackathonRepositoryBase {
  constructor(readonly vault: CoreVault) {}

  protected audit(
    action: string,
    entityType: string,
    entityId: string,
    detail: unknown,
    occurredAt: string,
    actorType = 'founder',
    actorId: string | null = 'founder',
  ): void {
    appendAuditEntry(this.vault, {
      occurredAt,
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      detail,
    });
  }

  protected requireCycle(idInput: string): HackathonCycle {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<CycleRow>('SELECT * FROM hackathon_cycles WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon cycle ${id} does not exist`);
    return mapCycle(row);
  }

  protected requireEntry(idInput: string): HackathonEntry {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<EntryRow>('SELECT * FROM hackathon_entries WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon entry ${id} does not exist`);
    return mapEntry(row);
  }

  protected requireRule(idInput: string): HackathonRule {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<RuleRow>('SELECT * FROM hackathon_rules WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon rule ${id} does not exist`);
    return mapRule(row);
  }

  protected refreshRulesDigest(cycleIdInput: string, updatedAtInput: string): string {
    const cycleId = IdSchema.parse(cycleIdInput);
    const updatedAt = IsoDateTimeSchema.parse(updatedAtInput);
    const rules = this.vault
      .all<RuleRow>('SELECT * FROM hackathon_rules WHERE cycle_id=? ORDER BY id', [cycleId])
      .map(mapRule);
    const digest = hackathonRulesDigest(rules);
    this.vault.run('UPDATE hackathon_cycles SET rules_sha256=?,updated_at=? WHERE id=?', [
      digest,
      updatedAt,
      cycleId,
    ]);
    return digest;
  }
}
