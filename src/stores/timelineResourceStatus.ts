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
  /** Segments accumulated so far, when the writer tracks it. Drives the oversized-profile warning. */
  segmentCount?: number;
};

export type TimelineResourceError = {
  datasetId: number;
  error: string;
  kind: TimelineResourceKind;
  name: string;
};

export type TimelineResourceOversized = {
  kind: TimelineResourceKind;
  name: string;
  segmentCount: number;
};

/**
 * Segment count above which a profile measurably degrades timeline interaction.
 * This is a warning about resource modeling, not simulation duration.
 */
export const OVERSIZED_PROFILE_SEGMENT_COUNT = 250_000;

// datasetId/name are carried on the entry (not parsed back out of the key)
// so the key format stays an internal detail and the id space we keyed on
// (dataset_id for sim, simulation_dataset id for external) is preserved
// verbatim for error reporting.
type StoredState = TimelineResourceState & { datasetId: number; kind: TimelineResourceKind; name: string };

/** Deduped by name: the same profile on two rows is one modeling problem, not two. */
function collectOversized(states: Map<string, StoredState>): TimelineResourceOversized[] {
  const byName = new Map<string, TimelineResourceOversized>();
  for (const state of states.values()) {
    const segmentCount = state.segmentCount ?? 0;
    if (segmentCount < OVERSIZED_PROFILE_SEGMENT_COUNT) {
      continue;
    }
    const existing = byName.get(state.name);
    if (existing === undefined || segmentCount > existing.segmentCount) {
      byName.set(state.name, { kind: state.kind, name: state.name, segmentCount });
    }
  }
  return [...byName.values()].sort((a, b) => b.segmentCount - a.segmentCount);
}

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

export const timelineResourcesErroring: Readable<TimelineResourceError[]> = derived(resourceStates, $resourceStates => {
  const errors: TimelineResourceError[] = [];
  for (const s of $resourceStates.values()) {
    if (s.error) {
      errors.push({
        datasetId: s.datasetId,
        error: s.error,
        kind: s.kind,
        name: s.name,
      });
    }
  }
  return errors;
});

export const timelineResourcesOversized: Readable<TimelineResourceOversized[]> = derived(
  resourceStates,
  collectOversized,
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
  resourceStates.update(m => new Map(m).set(key, { ...state, datasetId, kind, name }));
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
