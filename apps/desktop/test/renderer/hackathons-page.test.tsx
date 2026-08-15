import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/renderer/src/App';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { WorkspaceProvider } from '../../src/renderer/src/state/WorkspaceContext';
import { installBridge } from './fixtures';
import { hackathonBootstrapFixture } from './hackathon-fixtures';

function renderApplication(): void {
  render(
    <HashRouter>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </HashRouter>,
  );
}

describe('Hackathon Studio portfolio', () => {
  it('shows the deadline queue, component entries, distribution-weighted score and operating lanes', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonBootstrapFixture());
    renderApplication();

    expect(await screen.findByRole('heading', { name: 'Hackathon Studio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Hackathons' })).toBeVisible();
    expect(screen.getByText('ETHGlobal Agentic Ethereum')).toBeVisible();
    expect(screen.getByText('Sep 12')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Apply now' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Active builds' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Post-result conversion' })).toBeVisible();
    expect(screen.getByText('Alice governed MCP operator for a bounded community workflow.')).toBeVisible();
    expect(screen.getByText('85')).toBeVisible();
    expect(screen.getByText('Strategic fit')).toBeVisible();
    expect(screen.getByText('Distribution')).toBeVisible();
    expect(screen.getByText('72h')).toBeVisible();
  });

  it('filters entries by state and component without mutating the source portfolio', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonBootstrapFixture());
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    fireEvent.change(screen.getByLabelText('Entry state'), { target: { value: 'candidate' } });
    expect(screen.getByText('SW4P programmable creator settlement.')).toBeVisible();
    expect(
      screen.queryByText('Alice governed MCP operator for a bounded community workflow.'),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Entry state'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Component'), { target: { value: 'venture:test' } });
    expect(screen.getByText('SW4P programmable creator settlement.')).toBeVisible();
    expect(screen.getByText('Alice governed MCP operator for a bounded community workflow.')).toBeVisible();
  });

  it('creates a component-specific candidate without accepting a renderer-owned score', async () => {
    window.location.hash = '#/hackathons';
    const fixture = hackathonBootstrapFixture();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'hackathon.entry.create') {
        return {
          id: 'entry:new',
          ...payload,
          weightedScore: 79,
          founderDecision: 'pending',
          founderRationale: null,
          state: 'candidate',
          createdAt: '2026-08-15T12:00:00.000Z',
          updatedAt: '2026-08-15T12:00:00.000Z',
          leadVentureId: payload.leadVentureId,
          eligibilityStatus: null,
          nextDeadlineAt: '2026-09-12T23:59:00.000Z',
        };
      }
      throw new Error(`Unexpected renderer test command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    fireEvent.click(screen.getByRole('button', { name: 'New candidate entry' }));
    const dialog = screen.getByRole('dialog', { name: 'Create candidate entry' });
    fireEvent.change(within(dialog).getByLabelText('Submission concept'), {
      target: { value: 'Human and agent live studio with a playable sponsor experience.' },
    });
    fireEvent.change(within(dialog).getByLabelText('User outcome'), {
      target: { value: 'A creator turns one sponsor brief into a live and playable program.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ecosystem adapter'), {
      target: { value: 'Ethereum sponsor-attestation adapter.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Estimated hours'), {
      target: { value: '32' },
    });
    fireEvent.change(within(dialog).getByLabelText('Reuse percentage'), {
      target: { value: '78' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create candidate' }));

    await waitFor(() => expect(command).toHaveBeenCalledTimes(1));
    const [name, payload] = command.mock.calls[0]!;
    expect(name).toBe('hackathon.entry.create');
    expect(payload).toEqual(
      expect.objectContaining({
        cycleId: 'cycle:ethglobal-agentic',
        legalEntityId: 'legal-entity:test',
        leadVentureId: 'venture:test',
        supportingVentureIds: [],
        narrativeProfileId: 'narrative:test:hackathon',
        canonicalDemoVersionId: 'demo-version:test:2',
        trackIds: [],
        bountyIds: [],
        submissionConcept: 'Human and agent live studio with a playable sponsor experience.',
        userOutcome: 'A creator turns one sponsor brief into a live and playable program.',
        ecosystemAdapter: 'Ethereum sponsor-attestation adapter.',
        estimatedHours: 32,
        reusePercentage: 78,
      }),
    );
    expect(payload).not.toHaveProperty('weightedScore');
    expect(payload).not.toHaveProperty('founderDecision');
    expect(payload).not.toHaveProperty('state');
  });
});
