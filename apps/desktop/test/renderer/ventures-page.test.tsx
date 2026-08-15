import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/src/App';
import { WorkspaceProvider } from '../../src/renderer/src/state/WorkspaceContext';
import { bootstrapFixture, installBridge } from './fixtures';

function renderApplication(): void {
  render(
    <HashRouter>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </HashRouter>,
  );
}

describe('VenturesPage', () => {
  it('shows the active legal entity, venture, mandate and exact approved versions', async () => {
    window.location.hash = '#/ventures';
    installBridge(bootstrapFixture());
    renderApplication();

    expect(await screen.findByRole('heading', { name: 'Ventures' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Local Labs' })).toBeVisible();
    expect(screen.getByText('Local Labs, Inc.')).toBeVisible();
    expect(screen.getByText('Trusted AI infrastructure')).toBeVisible();
    expect(screen.getByText('Capital mandate')).toBeVisible();
    expect(screen.getByText('SAFE')).toBeVisible();
    expect(screen.getByText('Investor narrative v2')).toBeVisible();
    expect(screen.getByText('Governed Agent Operator v2')).toBeVisible();
    expect(screen.getByText('Round: Local Labs · seed')).toBeVisible();
  });

  it('creates a legal entity through a bounded founder command', async () => {
    window.location.hash = '#/ventures';
    const fixture = bootstrapFixture();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'legalEntity.save') {
        return {
          id: 'legal-entity:new',
          ...payload,
        };
      }
      throw new Error(`Unexpected renderer test command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Ventures' });
    fireEvent.click(screen.getByRole('button', { name: 'Add legal entity' }));
    const dialog = screen.getByRole('dialog', { name: 'Add legal entity' });
    fireEvent.change(within(dialog).getByLabelText('Legal name'), {
      target: { value: 'SW4P Labs, Inc.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Display name'), {
      target: { value: 'SW4P' },
    });
    fireEvent.change(within(dialog).getByLabelText('Founder authority'), {
      target: { value: 'The founder controls external commitments.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save legal entity' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('legalEntity.save', {
        legalName: 'SW4P Labs, Inc.',
        displayName: 'SW4P',
        jurisdiction: null,
        entityType: 'corporation',
        status: 'active',
        incorporationReference: null,
        capTableReference: null,
        founderAuthority: 'The founder controls external commitments.',
        publicWebsite: null,
      }),
    );
  });

  it('requires an explicit consequence confirmation before changing an active mandate legal entity', async () => {
    window.location.hash = '#/ventures';
    const fixture = bootstrapFixture();
    fixture.legalEntities.push({
      id: 'legal-entity:other',
      legalName: 'Other Labs LLC',
      displayName: 'Other Labs',
      jurisdiction: 'Wyoming',
      entityType: 'llc',
      status: 'active',
      incorporationReference: null,
      capTableReference: null,
      founderAuthority: 'The founder controls external commitments.',
      publicWebsite: null,
    });
    const command = vi.fn(async (_name: string, payload: Record<string, unknown>) => ({
      id: 'capital-mandate:test',
      ...payload,
    }));
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Ventures' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit capital mandate' }));
    const editor = screen.getByRole('dialog', { name: 'Edit capital mandate' });
    fireEvent.change(within(editor).getByLabelText('Legal entity'), {
      target: { value: 'legal-entity:other' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save capital mandate' }));

    const confirmation = await screen.findByRole('dialog', {
      name: 'Confirm legal entity change',
    });
    expect(
      within(confirmation).getByText(
        /Changing the mandate from Local Labs to Other Labs changes which entity can raise, sign and receive funds/u,
      ),
    ).toBeVisible();
    expect(command).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm entity change' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'capitalMandate.save',
        expect.objectContaining({
          id: 'capital-mandate:test',
          legalEntityId: 'legal-entity:other',
          ventureId: 'venture:test',
          narrativeProfileId: 'narrative:test:2',
        }),
      ),
    );
  });
});
