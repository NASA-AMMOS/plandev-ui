import { derived, writable, type Readable } from 'svelte/store';
import type { Resource } from '../types/simulation';

// Per-(datasetId, name) loading/error registry for any resource on the
// timeline. Two writers — `createProfileSubscription` (sim profiles) and
// `createExternalResourceSubscription` (external datasets) — share the same
// keyspace; the global indicator reads the derived aggregates. `kind`
// travels with each entry so the indicator can label errors with the right
// source ("Profile" vs "External profile") instead of mixing them.

export type TimelineResourceKind = 'sim' | 'external';

export type TimelineResourceState = {
  error: string;
  loading: boolean;
  resource: Resource | null;
};

export type TimelineResourceError = {
  datasetId: number;
  error: string;
  kind: TimelineResourceKind;
  name: string;
};

type StoredState = TimelineResourceState & { kind: TimelineResourceKind };

const resourceStates = writable<Map<string, StoredState>>(new Map());

// Refcount per key. Two Row.svelte instances showing the same
// (datasetId, name) each create their own factory writing to this key.
// Without refcounting, the first to dispose clears the entry while the
// other factory is still live — and for a settled-error state (e.g.
// external "Resource not found"), nothing would trigger a re-emit, so the
// indicator would silently under-report. Acquire/release scopes the entry
// to the union of writers' lifetimes.
const refCounts = new Map<string, number>();

export const timelineResourcesLoading: Readable<boolean> = derived(resourceStates, $resourceStates => {
  for (const s of $resourceStates.values()) {
    if (s.loading) {
      return true;
    }
  }
  return false;
});

export const timelineResourcesErroring: Readable<TimelineResourceError[]> = derived(
  resourceStates,
  $resourceStates => {
    const errors: TimelineResourceError[] = [];
    for (const [key, s] of $resourceStates.entries()) {
      if (s.error) {
        const colon = key.indexOf(':');
        errors.push({
          datasetId: Number(key.slice(0, colon)),
          error: s.error,
          kind: s.kind,
          name: key.slice(colon + 1),
        });
      }
    }
    return errors;
  },
);

function registryKey(datasetId: number, name: string): string {
  return `${datasetId}:${name}`;
}

export function acquireTimelineResource(datasetId: number, name: string): void {
  const key = registryKey(datasetId, name);
  refCounts.set(key, (refCounts.get(key) ?? 0) + 1);
}

export function setTimelineResourceState(
  datasetId: number,
  name: string,
  kind: TimelineResourceKind,
  state: TimelineResourceState,
): void {
  const key = registryKey(datasetId, name);
  resourceStates.update(m => new Map(m).set(key, { ...state, kind }));
}

export function releaseTimelineResource(datasetId: number, name: string): void {
  const key = registryKey(datasetId, name);
  const next = (refCounts.get(key) ?? 1) - 1;
  if (next <= 0) {
    refCounts.delete(key);
    resourceStates.update(m => {
      if (!m.has(key)) {
        return m;
      }
      const after = new Map(m);
      after.delete(key);
      return after;
    });
  } else {
    refCounts.set(key, next);
  }
}
