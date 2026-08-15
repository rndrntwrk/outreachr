import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/renderer/src/App';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { WorkspaceProvider } from '../../src/renderer/src/state/WorkspaceContext';
import { installBridge } from './fixtures';
import { hackathonStudioFixture } from './hackathon-fixture';

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
  it('adds the route immediately after Up next and renders the operating queues', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonStudioFixture());
    renderApplication();

    expect(await screen.findByRole('heading', { name: 'Hackathon Studio' })).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const labels = within(navigation)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label'));
    expect(labels.slice(0, 3)).toEqual(['Up next', 'Hackathon Studio', 'Round overview']);

    for (const heading of [
      'Next decisions',
      'Deadlines',
      'Active builds',
      'Submission-ready',
      'Submitted and judging',
      'Results and conversions',
      'Watchlist',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    }

    const urgent = screen.getByRole('button', { name: /Example Agent Hackathon/u });
    expect(urgent).toHaveTextContent('Local Labs');
    expect(urgent).toHaveTextContent('Governed Agent Operator');
    expect(urgent).toHaveTextContent('85');
    expect(urgent).toHaveTextContent('80%');
    expect(urgent).toHaveTextContent('48h');
    expect(urgent).toHaveTextContent('Eligible');
  });

  it('filters entries without hiding unknown watchlist information', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonStudioFixture());
    renderApplication();
    await screen.findByRole('heading', { name: 'Hackathon Studio' });

    fireEvent.change(screen.getByLabelText('Entry state'), { target: { value: 'building' } });
    expect(screen.getByRole('button', { name: /Example Stablecoin Challenge/u })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Example Agent Hackathon/u })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Entry state'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Format'), { target: { value: 'in_person' } });
    expect(screen.getByText('Example Media Lab')).toBeVisible();
    expect(screen.getByText('Eligibility unknown')).toBeVisible();
  });

  it('creates a component-specific candidate without accepting a renderer-owned weighted score', async () => {
    window.location.hash = '#/hackathons';
    const fixture = hackathonStudioFixture();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'hackathon.entry.create') {
        return {
          id: 'entry:new',
          ...payload,
          weightedScore: 82,
          founderDecision: 'pending',
          founderRationale: null,
          state: 'candidate',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          leadVentureId: payload.leadVentureId,
          eligibilityStatus: null,
          nextDeadlineAt: fixture.hackathonCycles[0]?.submissionDeadlineAt ?? null,
        };
      }
      throw new Error(`Unexpected renderer command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    fireEvent.click(screen.getByRole('button', { name: 'Add candidate entry' }));
    const dialog = screen.getByRole('dialog', { name: 'Add hackathon entry' });
    expect(within(dialog).getByLabelText('Hackathon narrative')).toHaveValue(
      'narrative:test:hackathon:2',
    );
    expect(within(dialog).getByLabelText('Canonical demo')).toHaveValue(
      'demo-version:test:2',
    );

    fireEvent.change(within(dialog).getByLabelText('Submission concept'), {
      target: { value: 'A governed settlement operator for the sponsor ecosystem.' },
    });
    fireEvent.change(within(dialog).getByLabelText('User outcome'), {
      target: { value: 'A creator receives a correct settlement and receipt.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ecosystem adapter'), {
      target: { value: 'One sponsor settlement adapter.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Estimated hours'), {
      target: { value: '40' },
    });
    fireEvent.change(within(dialog).getByLabelText('Reuse percentage'), {
      target: { value: '75' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create candidate' }));

    await waitFor(() => expect(command).toHaveBeenCalledTimes(1));
    const [, payload] = command.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload).toMatchObject({
      cycleId: 'cycle:urgent',
      legalEntityId: 'legal-entity:test',
      leadVentureId: 'venture:test',
      supportingVentureIds: [],
      narrativeProfileId: 'narrative:test:hackathon:2',
      canonicalDemoVersionId: 'demo-version:test:2',
      trackIds: [],
      bountyIds: [],
      submissionConcept: 'A governed settlement operator for the sponsor ecosystem.',
      userOutcome: 'A creator receives a correct settlement and receipt.',
      ecosystemAdapter: 'One sponsor settlement adapter.',
      estimatedHours: 40,
      reusePercentage: 75,
      strategicFit: 8,
      acceptanceProbability: 6,
      capitalUpside: 7,
      distributionUpside: 9,
      technicalLeverage: 8,
      credibility: 7,
      urgency: 7,
      effortEfficiency: 8,
      lockInSafety: 8,
    });
    expect(payload).not.toHaveProperty('weightedScore');
    expect(payload).not.toHaveProperty('eligibilityStatus');
  });
});
