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

describe('NarrativesPage', () => {
  it('lists versions newest first and keeps approved content read-only', async () => {
    window.location.hash = '#/narratives';
    installBridge(bootstrapFixture());
    renderApplication();

    expect(await screen.findByRole('heading', { name: 'Narratives & demos' })).toBeVisible();
    const investor = screen.getByRole('region', { name: 'Investor narratives' });
    const versions = within(investor).getAllByText(/Version [12]/u);
    expect(versions[0]).toHaveTextContent('Version 2');
    expect(versions[1]).toHaveTextContent('Version 1');
    fireEvent.click(within(investor).getByRole('button', { name: 'Open investor version 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Investor narrative version 2' });
    expect(within(dialog).getByLabelText('50-word description')).toHaveAttribute('readonly');
    expect(within(dialog).getByLabelText('Claims boundary')).toHaveAttribute('readonly');
    expect(within(dialog).queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('shows the exact frozen draft and approves the displayed content digest', async () => {
    window.location.hash = '#/narratives';
    const fixture = bootstrapFixture();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'narrative.approve') {
        return {
          ...fixture.narrativeProfiles.find((item) => item.id === payload.id),
          approvalState: 'approved',
          approvedAt: '2026-08-15T09:00:00.000Z',
        };
      }
      throw new Error(`Unexpected renderer test command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Narratives & demos' });
    fireEvent.click(screen.getByRole('button', { name: 'Review hackathon version 1' }));
    const approval = screen.getByRole('dialog', { name: 'Approve hackathon narrative version 1' });
    expect(within(approval).getByText('Local Labs, Inc.')).toBeVisible();
    expect(within(approval).getByText('Local Labs')).toBeVisible();
    expect(within(approval).getByText('hackathon')).toBeVisible();
    expect(within(approval).getByText('Version 1')).toBeVisible();
    expect(within(approval).getByText('Draft hackathon narrative.')).toBeVisible();
    expect(within(approval).getByText('Do not imply autonomous external authority.')).toBeVisible();
    expect(within(approval).getByText('c'.repeat(64))).toBeVisible();
    fireEvent.click(within(approval).getByRole('button', { name: 'Approve exact narrative' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('narrative.approve', {
        id: 'narrative:test:draft',
        expectedContentSha256: 'c'.repeat(64),
      }),
    );
  });

  it('creates a new draft version without accepting founder-supplied version or approval metadata', async () => {
    window.location.hash = '#/narratives';
    const fixture = bootstrapFixture();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'narrative.createVersion') {
        return {
          id: 'narrative:new',
          ...payload,
          version: 3,
          approvalState: 'draft',
          contentSha256: 'f'.repeat(64),
          approvedAt: null,
        };
      }
      throw new Error(`Unexpected renderer test command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Narratives & demos' });
    fireEvent.click(screen.getByRole('button', { name: 'New narrative version' }));
    const editor = screen.getByRole('dialog', { name: 'New narrative version' });
    fireEvent.change(within(editor).getByLabelText('Purpose'), {
      target: { value: 'partner' },
    });
    fireEvent.change(within(editor).getByLabelText('50-word description'), {
      target: { value: 'A partner narrative.' },
    });
    fireEvent.change(within(editor).getByLabelText('100-word description'), {
      target: { value: 'A longer partner narrative.' },
    });
    fireEvent.change(within(editor).getByLabelText('250-word description'), {
      target: { value: 'A complete partner narrative.' },
    });
    for (const [label, value] of [
      ['Problem', 'Partners need controlled agent operations.'],
      ['Product wedge', 'One governed operating layer.'],
      ['Why now', 'Agent tools are becoming composable.'],
      ['Technical differentiation', 'Selected context, bounded tools and exact approval.'],
      ['Evidence framing', 'Use dated implementation evidence.'],
      ['Business model', 'Infrastructure and partner programs.'],
      ['Use of funds', 'Production and design-partner delivery.'],
      ['Claims boundary', 'Do not present plans as current behavior.'],
    ] as const) {
      fireEvent.change(within(editor).getByLabelText(label), { target: { value } });
    }
    fireEvent.click(within(editor).getByRole('button', { name: 'Save draft' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'narrative.createVersion',
        expect.objectContaining({
          legalEntityId: 'legal-entity:test',
          ventureId: 'venture:test',
          purpose: 'partner',
          descriptions: {
            words50: 'A partner narrative.',
            words100: 'A longer partner narrative.',
            words250: 'A complete partner narrative.',
          },
          claimsBoundary: 'Do not present plans as current behavior.',
        }),
      ),
    );
    const sentPayload = command.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(sentPayload).not.toHaveProperty('version');
    expect(sentPayload).not.toHaveProperty('approvalState');
    expect(sentPayload).not.toHaveProperty('contentSha256');
  });

  it('disables demo approval while the baseline commit is the all-zero sentinel', async () => {
    window.location.hash = '#/narratives';
    installBridge(bootstrapFixture());
    renderApplication();

    await screen.findByRole('heading', { name: 'Narratives & demos' });
    const row = screen.getByRole('row', { name: /Governed Agent Operator Version 3/u });
    expect(within(row).getByRole('button', { name: 'Approve demo version 3' })).toBeDisabled();
    expect(within(row).getByText('Bind a real commit before approval')).toBeVisible();
  });
});
