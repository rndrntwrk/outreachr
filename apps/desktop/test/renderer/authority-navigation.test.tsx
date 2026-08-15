import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { describe, expect, it } from 'vitest';
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

describe('authority navigation', () => {
  it('places Ventures after Round overview and exposes Narratives & demos in the workspace group', async () => {
    window.location.hash = '#/';
    installBridge(bootstrapFixture());
    renderApplication();

    await screen.findByText('Up next');
    const primary = screen.getByRole('navigation', { name: 'Primary navigation' });
    const links = Array.from(primary.querySelectorAll('a')).map((item) => item.textContent?.trim());
    expect(links.indexOf('Ventures')).toBe(links.indexOf('Round overview') + 1);
    expect(links).toContain('Narratives & demos');

    fireEvent.click(screen.getByRole('link', { name: 'Ventures' }));
    expect(await screen.findByRole('heading', { name: 'Ventures' })).toBeVisible();
    await waitFor(() => expect(document.title).toBe('Ventures · Outreachr'));

    fireEvent.click(screen.getByRole('link', { name: 'Narratives & demos' }));
    expect(await screen.findByRole('heading', { name: 'Narratives & demos' })).toBeVisible();
    await waitFor(() => expect(document.title).toBe('Narratives & demos · Outreachr'));
  });
});
