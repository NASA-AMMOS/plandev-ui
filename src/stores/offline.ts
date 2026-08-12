import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { LoadedOfflineBundle } from '../types/offline-bundle';
import type { Resource } from '../types/simulation';
import { sampleProfiles } from '../utilities/resources';
import { setOfflineActive } from './offlineFlag';

/**
 * The single uploaded offline bundle, or null when offline mode is inactive.
 * WP-3's route sets this once on load; nothing else in the app writes to it.
 */
export const offlineBundle: Writable<LoadedOfflineBundle | null> = writable(null);

/** True whenever an offline bundle is loaded. */
export const offlineMode: Readable<boolean> = derived(offlineBundle, $offlineBundle => $offlineBundle !== null);

// Per-(datasetId, name) memo of sampled resources, so repeated timeline rows
// (or re-renders) don't re-run sampleProfiles against the same profile.
// Cleared whenever the underlying bundle changes.
const resourceMemo = new Map<string, Resource | null>();

function memoKey(datasetId: number, name: string): string {
  return `${datasetId}:${name}`;
}

/** Loads a bundle into the store, entering offline mode and clearing any stale memo. */
export function setOfflineBundle(loaded: LoadedOfflineBundle): void {
  resourceMemo.clear();
  offlineBundle.set(loaded);
  setOfflineActive(true);
}

/** Exits offline mode and clears the resource memo. */
export function clearOfflineBundle(): void {
  resourceMemo.clear();
  offlineBundle.set(null);
  setOfflineActive(false);
}

/**
 * Returns the sampled resource for the named profile in the current offline
 * bundle, or null when offline mode is inactive or no matching profile
 * exists. Memoized per (datasetId, name) so repeated calls (e.g. multiple
 * timeline rows for the same resource) don't resample.
 */
export function getOfflineResource(datasetId: number, name: string): Resource | null {
  let loaded: LoadedOfflineBundle | null = null;
  const unsubscribe = offlineBundle.subscribe(value => (loaded = value));
  unsubscribe();

  if (loaded === null) {
    return null;
  }

  const key = memoKey(datasetId, name);
  if (resourceMemo.has(key)) {
    return resourceMemo.get(key) ?? null;
  }

  const profile = (loaded as LoadedOfflineBundle).profiles.find(p => p.dataset_id === datasetId && p.name === name);
  const resource = profile
    ? (sampleProfiles([profile], (loaded as LoadedOfflineBundle).plan.start_time)[0] ?? null)
    : null;
  resourceMemo.set(key, resource);
  return resource;
}
