import { writable, type Readable } from 'svelte/store';
import { Status } from '../enums/status';
import type { User } from '../types/app';
import type { Profile, ProfileSegment, Resource } from '../types/simulation';
import effects from '../utilities/effects';
import { pickEffectiveDuration } from '../utilities/profile';
import { INITIAL_SINCE, sampleProfiles } from '../utilities/resources';
import { getSimulationExtent, getSimulationStatus } from '../utilities/simulation';
import { pluralize } from '../utilities/text';
import { catchError, logMessage } from './console';
import { simulationDataset } from './simulation';
import {
  acquireTimelineResource,
  releaseTimelineResource,
  setTimelineResourceState,
  type TimelineResourceState,
} from './timelineResourceStatus';

export type ProfileSubscriptionState = TimelineResourceState;

export type ProfileSubscription = {
  store: Readable<ProfileSubscriptionState>;
  unsubscribe: () => void;
};

type ProfileHeader = Pick<Profile, 'dataset_id' | 'duration' | 'id' | 'name' | 'type'>;

/**
 * Per-(datasetId, name) live view of a simulation resource. Driven by a
 * windowed pull: each tick of `simulationDataset` (Hasura live query, ~1Hz)
 * fires a refetch via GET_PROFILE_SINCE that returns only segments past the
 * last seen `start_offset`. Same bandwidth profile as a streaming
 * subscription, but without WS connection state, cursor reconnect handling,
 * dedup, or a multi-phase state machine — every refetch is independent and
 * returns the header alongside the segment delta.
 */
export function createProfileSubscription(
  datasetId: number,
  name: string,
  planStartTimeYmd: string,
  user: User | null,
): ProfileSubscription {
  const initialState: ProfileSubscriptionState = { error: '', loading: true, resource: null };
  acquireTimelineResource(datasetId, name);
  setTimelineResourceState(datasetId, name, 'sim', initialState);
  const state = writable<ProfileSubscriptionState>(initialState);
  function setState(next: ProfileSubscriptionState) {
    state.set(next);
    setTimelineResourceState(datasetId, name, 'sim', next);
  }

  const accumulator: ProfileSegment[] = [];
  let header: ProfileHeader | null = null;
  let sinceOffset = INITIAL_SINCE;
  // Settled on a final state. Set when we receive a profile, OR when the sim
  // goes terminal with no profile row — in that case there's no data but no
  // more ticks will fire to retry, so we stop showing loading.
  let resolved = false;
  let lastError = '';
  // Drives whether sampleProfiles closes the last segment at header.duration
  // (terminal sim) or the last-seen offset (streaming, so header.duration
  // would project past actual data).
  let streamingActive = false;
  let inFlight = false;
  // simulationDataset re-pushes on every column change; only extent
  // advancement implies new segments worth refetching.
  let lastExtent: string | null = null;
  // Set when refetch() is called while an earlier one is in flight. The
  // finally block re-fires once, so if the sim's terminal tick lands while
  // a refetch is mid-flight we don't miss the tail.
  let pendingRefetch = false;
  let disposed = false;
  const abortController = new AbortController();
  const unsubscribers: Array<() => void> = [];

  // One log per sub lifetime, on whichever comes first: sim flipping
  // terminal, or sub disposal. Skipped if the sub never received data.
  const createdAt = performance.now();
  let aggregateLogged = false;

  function logFinalAggregate() {
    if (aggregateLogged || header === null) {
      return;
    }
    aggregateLogged = true;
    logMessage(
      'log',
      `Retrieved profile "${name}" (${accumulator.length} segment${pluralize(accumulator.length)}) for dataset ID=${datasetId}.`,
      {duration: performance.now() - createdAt}
    );
  }

  function emit() {
    if (disposed) {
      return;
    }
    let resource: Resource | null = null;
    if (header && resolved) {
      const lastOffset = accumulator.length > 0 ? accumulator[accumulator.length - 1].start_offset : null;
      const duration = pickEffectiveDuration(header.duration, lastOffset, streamingActive);
      resource = sampleProfiles([{ ...header, duration, profile_segments: accumulator }], planStartTimeYmd)[0] ?? null;
    }
    setState({ error: lastError, loading: !resolved && !lastError, resource });
  }

  async function refetch() {
    if (disposed) {
      return;
    }
    if (inFlight) {
      pendingRefetch = true;
      return;
    }
    inFlight = true;
    try {
      const profile = await effects.getProfileSince(datasetId, name, sinceOffset, user, abortController.signal);
      if (disposed) {
        return;
      }
      if (profile) {
        if (profile.profile_segments.length > 0) {
          accumulator.push(...profile.profile_segments);
          sinceOffset = profile.profile_segments[profile.profile_segments.length - 1].start_offset;
        }
        header = profile;
        resolved = true;
        lastError = '';
      } else if (!streamingActive) {
        // No profile row + sim is terminal: no more ticks will fire to retry,
        // so surface a not-found error (parallel to the external path) instead
        // of silently settling into a blank row.
        resolved = true;
        lastError = 'Resource not found in simulation dataset';
        catchError('log', `Unable to load resource "${name}"`, new Error(lastError));
      }
      if (!streamingActive) {
        logFinalAggregate();
      }
      emit();
    } catch (e) {
      if (disposed) {
        return;
      }
      const err = e as Error;
      if (err.name === 'AbortError') {
        return;
      }
      lastError = err.message || 'Profile fetch failed';
      emit();
    } finally {
      inFlight = false;
      if (pendingRefetch && !disposed) {
        pendingRefetch = false;
        refetch();
      }
    }
  }

  unsubscribers.push(
    simulationDataset.subscribe($sd => {
      if (disposed) {
        return;
      }
      const matched = $sd !== null && $sd.dataset_id === datasetId;
      const status = matched ? getSimulationStatus($sd) : null;
      const next =
        matched &&
        status !== null &&
        status !== Status.Complete &&
        status !== Status.Failed &&
        status !== Status.Canceled;
      const streamingChanged = next !== streamingActive;
      streamingActive = next;
      if (matched) {
        const extent = $sd ? getSimulationExtent($sd) : null;
        const extentAdvanced = extent !== lastExtent;
        lastExtent = extent;
        // Extent moved → new segments available. streamingActive flipped →
        // grab the tail (extent doesn't tick again on the terminal status).
        if (extentAdvanced || streamingChanged) {
          refetch();
        }
      } else if (streamingChanged && resolved) {
        // Re-emit so the closing value picks up the new streamingActive.
        emit();
      }
    }),
  );

  // Don't wait for the next simulationDataset tick — it may not come (the
  // dataset may already be settled, null, or pointing at a different sim).
  // Skip if `simulationDataset.subscribe` (above) already fired a refetch
  // synchronously with its current value — otherwise we'd queue a redundant
  // pendingRefetch and round-trip twice on first mount.
  if (!inFlight) {
    refetch();
  }

  return {
    store: { subscribe: state.subscribe },
    unsubscribe: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      logFinalAggregate();
      releaseTimelineResource(datasetId, name);
      abortController.abort();
      unsubscribers.forEach(unsub => unsub());
    },
  };
}
