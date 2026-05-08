import { derived, writable, type Readable } from 'svelte/store';
import { Status } from '../enums/status';
import type { User } from '../types/app';
import type { Profile, ProfileSegment, Resource } from '../types/simulation';
import effects from '../utilities/effects';
import gql from '../utilities/gql';
import { dedupNewSegments, pickEffectiveDuration } from '../utilities/profile';
import { sampleProfiles } from '../utilities/resources';
import { getSimulationStatus } from '../utilities/simulation';
import { simulationDataset } from './simulation';
import { gqlSubscribable } from './subscribable';

export type ProfileSubscriptionError = {
  datasetId: number;
  error: string;
  name: string;
};

export type ProfileSubscriptionState = {
  error: string;
  loading: boolean;
  resource: Resource | null;
};

export type ProfileSubscription = {
  store: Readable<ProfileSubscriptionState>;
  unsubscribe: () => void;
};

type ProfileHeader = Pick<Profile, 'dataset_id' | 'duration' | 'id' | 'name' | 'type'>;

/**
 * Lifecycle phases for a profile subscription. Modeled as a discriminated
 * union so transitions go through one chokepoint and impossible states
 * (e.g. "ready without a header") are unrepresentable. Disposal is tracked
 * separately because it can happen asynchronously from any phase.
 *
 *   prefetching  ── one-shot getProfile in flight ─────────────┐
 *        │                                                     │
 *        │ resolves with data                                  │
 *        ▼                                                     │ resolves with null,
 *      ready  ◄──────────────────── awaitingHeader ◄───────────┘ or rejects (non-abort)
 *        ▲                              │
 *        │ live SUB_PROFILE_HEADER fires │
 *        └──────────────────────────────┘
 *
 * In the `ready` phase, `streamOpen` records whether we opened the segment
 * stream. We open it whenever sim is actively streaming OR the accumulator
 * is empty (prefetch missed; stream is needed to backfill, regardless of
 * sim status — SUB_PROFILE_HEADER doesn't carry segment columns).
 */
type Phase =
  | { kind: 'prefetching' }
  | { kind: 'awaitingHeader' }
  | { header: ProfileHeader; kind: 'ready'; streamOpen: boolean };

// Hasura streaming cursor advances strictly past the last seen value, so the
// initial offset must be < the smallest start_offset we want to receive.
// Postgres interval syntax (HH:MM:SS) — Hasura's interval scalar rejects ISO 8601.
const INITIAL_START_OFFSET = '-00:00:01';

// Module-level registry of every live createProfileSubscription. Powers global
// indicators (e.g. timeline-wide loading/error banner) without forcing each
// caller to thread state up to a coordinator.
const activeSubscriptions = writable<Map<string, ProfileSubscriptionState>>(new Map());

export const profilesLoading: Readable<boolean> = derived(activeSubscriptions, $subs => {
  for (const s of $subs.values()) {
    if (s.loading) {
      return true;
    }
  }
  return false;
});

export const profilesErroring: Readable<ProfileSubscriptionError[]> = derived(activeSubscriptions, $subs => {
  const errors: ProfileSubscriptionError[] = [];
  for (const [key, s] of $subs.entries()) {
    if (s.error) {
      const colon = key.indexOf(':');
      errors.push({ datasetId: Number(key.slice(0, colon)), error: s.error, name: key.slice(colon + 1) });
    }
  }
  return errors;
});

function registryKey(datasetId: number, name: string): string {
  return `${datasetId}:${name}`;
}

function lastSegmentOffset(segments: ProfileSegment[]): string {
  if (segments.length === 0) {
    return INITIAL_START_OFFSET;
  }
  return segments[segments.length - 1].start_offset;
}

/**
 * Per-(datasetId, name) live subscription to a simulation resource (profile).
 * See the `Phase` type comment for the lifecycle.
 */
export function createProfileSubscription(
  datasetId: number,
  name: string,
  planStartTimeYmd: string,
  user: User | null,
): ProfileSubscription {
  const key = registryKey(datasetId, name);
  const initialState: ProfileSubscriptionState = { error: '', loading: true, resource: null };
  activeSubscriptions.update(m => new Map(m).set(key, initialState));
  const state = writable<ProfileSubscriptionState>(initialState);
  function setState(next: ProfileSubscriptionState) {
    state.set(next);
    activeSubscriptions.update(m => new Map(m).set(key, next));
  }

  const accumulator: ProfileSegment[] = [];
  let phase: Phase = { kind: 'prefetching' };
  // True once the streaming sub has delivered its first response. Only
  // meaningful when phase.kind === 'ready' && phase.streamOpen.
  let streamFiredFirst = false;
  // Errors from each source are tracked separately. emit() picks which to
  // surface based on whether we already have data — pre-data, fetching errors
  // (prefetch, header sub) matter; post-data, only stream errors do.
  let prefetchError = '';
  let headerError = '';
  let segmentError = '';
  let unsubscribers: Array<() => void> = [];
  let disposed = false;
  // Live "is the sim still streaming?" derived from simulationDataset.status
  // for THIS sub's datasetId. Drives effectiveDuration's closing-value rule
  // and the open-stream-or-not decision in adoptHeader. Captured synchronously
  // on first subscribe so adoptHeader sees the right value when prefetch
  // resolves.
  let streamingActive = false;
  const headerAbort = new AbortController();

  function effectiveDuration(): string {
    if (phase.kind !== 'ready') {
      return '00:00:00';
    }
    const lastOffset = accumulator.length > 0 ? accumulator[accumulator.length - 1].start_offset : null;
    return pickEffectiveDuration(phase.header.duration, lastOffset, streamingActive);
  }

  function emit() {
    if (disposed) {
      return;
    }
    // haveData is "ready to render": we're in `ready` AND either no stream
    // was opened (prefetched data is the answer), the stream has fired its
    // first response (telling us whether segments arrived), or we already
    // have prefetched segments waiting for the stream.
    const haveData =
      phase.kind === 'ready' && (!phase.streamOpen || streamFiredFirst || accumulator.length > 0);
    let resource: Resource | null = null;
    if (haveData && phase.kind === 'ready') {
      resource =
        sampleProfiles(
          [{ ...phase.header, duration: effectiveDuration(), profile_segments: accumulator }],
          planStartTimeYmd,
        )[0] ?? null;
    }
    const error = haveData ? segmentError : headerError || prefetchError;
    setState({ error, loading: !haveData && !error, resource });
  }

  unsubscribers.push(
    simulationDataset.subscribe($sd => {
      // Only react when the live simulationDataset matches THIS sub's dataset.
      // (The store can hold a different sim if the user navigated away.) Treat
      // any unmatched / null state as "not streaming" so closing falls back to
      // header.duration.
      const matched = $sd !== null && $sd.dataset_id === datasetId;
      const status = matched ? getSimulationStatus($sd) : null;
      const next =
        matched &&
        status !== null &&
        status !== Status.Complete &&
        status !== Status.Failed &&
        status !== Status.Canceled;
      if (next === streamingActive) {
        return;
      }
      streamingActive = next;
      emit();
    }),
  );

  function openSegmentStream(profileId: number, startOffset: string) {
    if (disposed) {
      return;
    }
    const segmentSub = gqlSubscribable<ProfileSegment[]>(
      gql.SUB_PROFILE_SEGMENTS_STREAM,
      { datasetId, profileId, startOffset },
      [],
      (delta: ProfileSegment[]) => {
        accumulator.push(...dedupNewSegments(accumulator, delta));
        return accumulator.slice();
      },
    );
    unsubscribers.push(
      segmentSub.subscribe(() => emit()),
      segmentSub.loading.subscribe(loading => {
        if (!loading && !streamFiredFirst) {
          streamFiredFirst = true;
          emit();
        }
      }),
      segmentSub.error.subscribe(error => {
        if (segmentError !== error) {
          segmentError = error;
          emit();
        }
      }),
    );
  }

  function adoptHeader(newHeader: ProfileHeader) {
    if (disposed) {
      return;
    }
    if (phase.kind === 'ready') {
      // Subsequent header delivery (e.g. live SUB_PROFILE_HEADER fires again
      // because the backend updated `duration` post-completion). Refresh the
      // header in place; don't reopen the stream.
      phase = { ...phase, header: newHeader };
      emit();
      return;
    }
    // First adoption. Open the stream when (a) sim is actively streaming
    // (need live deltas) or (b) accumulator is empty (prefetch missed; stream
    // backfills). The stream returns rows past the initial cursor regardless
    // of sim status, so it works as a backfill mechanism for already-completed
    // sims discovered via waitForProfile too.
    const streamOpen = streamingActive || accumulator.length === 0;
    phase = { header: newHeader, kind: 'ready', streamOpen };
    emit();
    if (streamOpen) {
      openSegmentStream(newHeader.id, lastSegmentOffset(accumulator));
    }
  }

  function waitForProfile() {
    if (phase.kind === 'ready' || disposed) {
      return;
    }
    phase = { kind: 'awaitingHeader' };
    const profileSub = gqlSubscribable<ProfileHeader | null>(
      gql.SUB_PROFILE_HEADER,
      { datasetId, name },
      null,
      (rows: ProfileHeader[]) => (rows && rows.length > 0 ? rows[0] : null),
    );
    unsubscribers.push(
      profileSub.subscribe(profile => {
        if (!profile || disposed) {
          return;
        }
        adoptHeader(profile);
      }),
      profileSub.error.subscribe(error => {
        if (headerError !== error) {
          headerError = error;
          emit();
        }
      }),
    );
  }

  effects
    .getProfile(datasetId, name, user, headerAbort.signal)
    .then(initial => {
      if (disposed || phase.kind !== 'prefetching') {
        return;
      }
      if (initial) {
        accumulator.push(...initial.profile_segments);
        adoptHeader(initial);
      } else {
        waitForProfile();
      }
    })
    .catch((e: unknown) => {
      if (disposed || phase.kind !== 'prefetching') {
        return;
      }
      const err = e as Error;
      if (err.name === 'AbortError') {
        return;
      }
      // Prefetch failed — surface the error and fall through to the live
      // header sub. If the sub later succeeds we transition to `ready` and
      // emit() drops prefetchError; if it also fails, headerError surfaces.
      prefetchError = err.message || 'Profile prefetch failed';
      emit();
      waitForProfile();
    });

  return {
    store: { subscribe: state.subscribe },
    unsubscribe: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      activeSubscriptions.update(m => {
        const next = new Map(m);
        next.delete(key);
        return next;
      });
      headerAbort.abort();
      unsubscribers.forEach(unsub => unsub());
      unsubscribers = [];
    },
  };
}
