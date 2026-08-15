import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/renderer/src/App';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { WorkspaceProvider } from '../../src/renderer/src/state/WorkspaceContext';
import { hackathonStudioFixture } from './hackathon-fixture';
import { installBridge } from './fixtures';

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
  it('places Hackathon Studio after Up next and shows decisions, deadlines and component entries', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonStudioFixture());
    renderApplication();

    expect(await screen.findByRole('heading', { name: 'Hackathon Studio' })).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const links = within(navigation)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label'));
    expect(links.indexOf('Hackathon Studio')).toBe(links.indexOf('Up next') + 1);

    const deadlines = screen.getByRole('region', { name: 'Hackathon deadline windows' });
    expect(within(deadlines).getByText('Next 72 hours')).toBeVisible();
    expect(within(deadlines).getByText('Next 14 days')).toBeVisible();
    expect(within(deadlines).getByText('Next 30 days')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Next decisions' })).toBeVisible();
    expect(screen.getByText('SW4P settlement sprint')).toBeVisible();
    expect(screen.getByText('Alice governed operator')).toBeVisible();
    expect(screen.getByText('80% reuse')).toBeVisible();
    expect(screen.getByText('48h')).toBeVisible();
    expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
    expect(screen.getByText('Unknown eligibility')).toBeVisible();
  });

  it('filters entries by lead venture while keeping unknown evidence visible', async () => {
    window.location.hash = '#/hackathons';
    installBridge(hackathonStudioFixture());
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    fireEvent.change(screen.getByLabelText('Lead venture'), {
      target: { value: 'venture:sw4p' },
    });
    expect(screen.getByText('SW4P settlement sprint')).toBeVisible();
    expect(screen.queryByText('Alice governed operator')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Lead venture'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Eligibility'), { target: { value: 'unknown' } });
    expect(screen.getByText('Alice governed operator')).toBeVisible();
    expect(screen.queryByText('SW4P settlement sprint')).not.toBeInTheDocument();
  });

  it('creates a bounded component entry without accepting a renderer-supplied score', async () => {
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
          leadVentureId: payload.leadVentureId,
          eligibilityStatus: null,
          nextDeadlineAt: fixture.hackathonCycles[0]?.submissionDeadlineAt ?? null,
          createdAt: '2026-08-15T12:00:00.000Z',
          updatedAt: '2026-08-15T12:00:00.000Z',
        };
      }
      throw new Error(`Unexpected renderer test command: ${name}`);
    });
    installBridge(fixture, command as never);
    renderApplication();

    await screen.findByRole('heading', { name: 'Hackathon Studio' });
    fireEvent.click(screen.getByRole('button', { name: 'Add candidate' }));
    const dialog = screen.getByRole('dialog', { name: 'Add hackathon candidate' });
    fireEvent.change(within(dialog).getByLabelText('Cycle'), {
      target: { value: 'cycle:open' },
    });
    fireEvent.change(within(dialog).getByLabelText('Legal entity'), {
      target: { value: 'legal-entity:test' },
    });
    fireEvent.change(within(dialog).getByLabelText('Lead venture'), {
      target: { value: 'venture:sw4p' },
    });
    fireEvent.change(within(dialog).getByLabelText('Approved hackathon narrative'), {
      target: { value: 'narrative:sw4p:hackathon:1' },
    });
    fireEvent.change(within(dialog).getByLabelText('Approved canonical demo'), {
      target: { value: 'demo-version:sw4p:1' },
    });
    fireEvent.change(within(dialog).getByLabelText('Submission concept'), {
      target: { value: 'Gas-abstracted creator payout for a live program.' },
    });
    fireEvent.change(within(dialog).getByLabelText('User outcome'), {
      target: { value: 'A creator receives the intended amount and a reconciled receipt.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ecosystem adapter'), {
      target: { value: 'Use the sponsor stablecoin SDK as a bounded settlement adapter.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create candidate' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'hackathon.entry.create',
        expect.objectContaining({
          cycleId: 'cycle:open',
          legalEntityId: 'legal-entity:test',
          leadVentureId: 'venture:sw4p',
          narrativeProfileId: 'narrative:sw4p:hackathon:1',
          canonicalDemoVersionId: 'demo-version:sw4p:1',
          estimatedHours: 48,
          reusePercentage: 80,
          distributionUpside: 8,
        }),
      ),
    );
    const submittedPayload = command.mock.calls.find(
      ([name]) => name === 'hackathon.entry.create',
    )?.[1] as Record<string, unknown>;
    expect(submittedPayload).not.toHaveProperty('weightedScore');
  });
});
