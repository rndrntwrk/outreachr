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
  it('shows deadline windows, operating lanes, watchlist context and component-specific next actions', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonBootstrapFixture());
    renderApplication();

    expect(await screen.findByRole('heading', { name: 'Hackathon Studio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Hackathon Studio' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Within 72 hours' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Within 14 days' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Within 30 days' })).toBeVisible();
    expect(screen.getByText('BNB Hack Online')).toBeVisible();
    expect(screen.getByText('Agentic Cinema')).toBeVisible();
    expect(screen.getAllByText('ETHGlobal Agentic Ethereum').length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: 'Next decisions' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Active builds' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Submission-ready' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Submitted and judging' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Results and conversions' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeVisible();
    expect(screen.getByText('Colosseum Eternal')).toBeVisible();

    expect(screen.getByText('Alice governed MCP operator for a bounded community workflow.')).toBeVisible();
    expect(screen.getByText('Governed Agent Operator · v2')).toBeVisible();
    expect(screen.getByText('Complete implementation and evidence')).toBeVisible();
    expect(screen.getByText('85')).toBeVisible();
    expect(screen.getAllByText('Strategic fit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Distribution').length).toBeGreaterThan(0);
    expect(screen.getByText('72h')).toBeVisible();
  });

  it('exposes all approved portfolio filters and preserves unknown values as selectable states', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonBootstrapFixture());
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    expect(screen.getByLabelText('Opportunity status')).toBeVisible();
    expect(screen.getByLabelText('Component')).toBeVisible();
    expect(screen.getByLabelText('Canonical demo')).toBeVisible();
    expect(screen.getByLabelText('Ecosystem')).toBeVisible();
    expect(screen.getByLabelText('Format')).toBeVisible();
    expect(screen.getByLabelText('Eligibility')).toBeVisible();
    expect(screen.getByLabelText('Priority window')).toBeVisible();
    expect(screen.getByLabelText('Entry state')).toBeVisible();
    expect(within(screen.getByLabelText('Eligibility')).getByRole('option', { name: 'Unknown' })).toBeVisible();

    fireEvent.change(screen.getByLabelText('Entry state'), { target: { value: 'candidate' } });
    expect(screen.getByText('SW4P programmable creator settlement.')).toBeVisible();
    expect(
      screen.queryByText('Alice governed MCP operator for a bounded community workflow.'),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Entry state'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Canonical demo'), {
      target: { value: 'demo-version:test:2' },
    });
    expect(screen.getByText('SW4P programmable creator settlement.')).toBeVisible();
    expect(screen.getByText('Alice governed MCP operator for a bounded community workflow.')).toBeVisible();
  });

  it('creates a component-specific candidate without accepting renderer-owned score or lifecycle fields', async () => {
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          leadVentureId: payload.leadVentureId,
          eligibilityStatus: null,
          nextDeadlineAt: null,
        };
      }
      throw new Error(`Unexpected renderer test command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    fireEvent.click(screen.getByRole('button', { name: 'New candidate entry' }));
    const dialog = screen.getByRole('dialog', { name: 'Create candidate entry' });
    expect(within(dialog).getByLabelText('Legal entity')).toHaveValue('legal-entity:test');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '555stream supporting component' }));
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
        supportingVentureIds: ['venture:media'],
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
    expect(payload).not.toHaveProperty('eligibilityStatus');
  });
});
