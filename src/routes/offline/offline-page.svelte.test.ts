import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import fooBundle from '../../tests/fixtures/foo-bundle.json';
import { clearOfflineBundle } from '../../stores/offline';
import { simulationDataset } from '../../stores/simulation';
import { OFFLINE_DATASET_ID } from '../../utilities/offline-bundle';
import OfflinePage from './+page.svelte';

// https://github.com/sveltejs/kit/issues/8180 -- TimelinePanel's component
// tree reaches modules (e.g. constants/command-expansion.ts) that import the
// `env` named export specifically, unlike the narrower trees other component
// tests in this repo exercise, so `env` must be nested rather than spread.
vi.mock('$env/dynamic/public', () => ({ env: import.meta.env }));

const fixtureText = JSON.stringify(fooBundle);

/**
 * Mounts the offline route and drives an upload the way a real user would:
 * pick a file, let the FileReader resolve, and wait for the store-hydration
 * pipeline in `+page.svelte`'s `onFileChange` to settle.
 */
async function uploadBundle(container: HTMLElement) {
  const input = container.querySelector('#bundle-file') as HTMLInputElement;
  const file = new File([fixtureText], 'foo-bundle.json', { type: 'application/json' });
  await fireEvent.change(input, { target: { files: [file] } });
}

describe('offline route renders the real TimelinePanel', () => {
  beforeEach(() => {
    // Timeline.svelte listens for device-pixel-ratio changes via matchMedia,
    // which jsdom does not implement.
    window.matchMedia =
      window.matchMedia ??
      ((query: string) =>
        ({
          addEventListener: () => {},
          matches: false,
          media: query,
          removeEventListener: () => {},
        }) as unknown as MediaQueryList);
  });

  afterEach(() => {
    cleanup();
    clearOfflineBundle();
  });

  test('shows the upload form before a bundle is loaded', () => {
    const { getByLabelText } = render(OfflinePage);
    expect(getByLabelText('Offline Bundle JSON File')).toBeTruthy();
  });

  test('renders the real TimelinePanel (not a bespoke widget) once a bundle is uploaded', async () => {
    const { container } = render(OfflinePage);

    await uploadBundle(container);

    // TimelinePanel's own panel-header title
    // (see components/timeline/TimelinePanel.svelte); its presence proves the
    // real component tree mounted rather than the old bespoke bar-list.
    await waitFor(() => expect(container.querySelector('.timeline-title')?.textContent).toBe('Timeline'));

    // The old bespoke widgets must be gone.
    expect(container.querySelector('.offline-timeline')).toBeNull();
    expect(container.querySelector('.resources-table')).toBeNull();
  });

  test('hydrates simulationDataset with OFFLINE_DATASET_ID so getOfflineResource can match it', async () => {
    const { container } = render(OfflinePage);

    await uploadBundle(container);

    await waitFor(() => {
      const dataset = get(simulationDataset);
      expect(dataset).not.toBeNull();
      expect(dataset && dataset.dataset_id).toBe(OFFLINE_DATASET_ID);
    });
  });
});
