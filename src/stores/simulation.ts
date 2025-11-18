import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type {
  Resource,
  ResourceType,
  Simulation,
  SimulationDataset,
  SimulationDatasetSlim,
  SimulationEvent,
  SimulationTemplate,
  Span,
  SpanId,
  SpanUtilityMaps,
  SpansMap,
} from '../types/simulation';
import type { Axis } from '../types/timeline';
import { createSpanUtilityMaps } from '../utilities/activities';
import gql from '../utilities/gql';
import { getSimulationProgress } from '../utilities/simulation';
import { getDoyTime, getUnixEpochTime, usToOffset } from '../utilities/time';
import { planId, planModelId, planModelRevision, planRevision } from './plan';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const simulationDatasetId: Writable<number> = writable(-1);

export const externalResources: Writable<Resource[]> = writable([]);

export const externalResourceNames: Writable<string[]> = writable([]);

// default to true since we cannot differentiate between "ext resources have been initially fetched" and "fetching ext resources"
export const fetchingResourcesExternal: Writable<boolean> = writable(true);

export const resourceTypes: Writable<ResourceType[]> = writable([]);

export const resourceTypesLoading: Writable<boolean> = writable(true);

// export const spans: Writable<Span[] | null> = writable(null);
export const spansMap: Writable<SpansMap | null> = writable(null);

export const initialSpansLoading: Writable<boolean> = writable(true);

export const yAxesWithScaleDomainsCache: Writable<Record<number, Axis[]>> = writable({});

export const simulationEvents: Writable<SimulationEvent[] | null> = writable(null);

/* Subscriptions. */

export const simulation = gqlSubscribable<Simulation | null>(
  gql.SUB_SIMULATION,
  { planId },
  null,
  null,
  (simulations: Simulation[]): Simulation => simulations[0],
);

export const simulationDataset = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET,
  { simulationDatasetId },
  null,
  null,
);

export const simulationDatasetLatest = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET_LATEST,
  { planId },
  null,
  null,
  (simulations: { simulation_datasets: SimulationDataset[] }[]): SimulationDataset | null => {
    if (simulations.length && simulations[0].simulation_datasets.length) {
      return simulations[0].simulation_datasets[0];
    }
    return null;
  },
);

export const simulationDatasetsPlan = gqlSubscribable<SimulationDataset[] | null>(
  gql.SUB_SIMULATION_DATASETS,
  { planId },
  null,
  null,
  v => v[0]?.simulation_datasets || [],
);

export const simulationDatasetsAll = gqlSubscribable<SimulationDatasetSlim[] | null>(
  gql.SUB_SIMULATION_DATASETS_ALL,
  null,
  null,
  null,
);

export const simulationTemplates = gqlSubscribable<SimulationTemplate[]>(
  gql.SUB_SIMULATION_TEMPLATES,
  { modelId: planModelId },
  [],
  null,
);

export const selectedSpanId: Writable<SpanId | null> = writable(null);

export const selectedSimulationEventId: Writable<number | null> = writable(null);

/* Derived. */

export const allResourceTypes: Readable<ResourceType[]> = derived(
  [resourceTypes, externalResources],
  ([$resourceTypes, $externalResources]) => {
    return $resourceTypes
      .map(({ name, schema }) => ({ name, schema }))
      .concat($externalResources.map(({ name, schema }) => ({ name, schema })));
  },
);

// export const spansMap: Readable<SpansMap | null> = derived(spans, $spans => {
//   console.log("spans", $spans);
//   return (!spans ? null : keyBy($spans, 'span_id'));
// });

export const spans: Readable<Span[] | null> = derived(spansMap, $spansMap => {
  const res = $spansMap !== null ? Object.values($spansMap) : null;
  console.log("spans", res);
  return res;
})

export const spanUtilityMaps: Readable<SpanUtilityMaps> = derived(spans, $spans => {
  return createSpanUtilityMaps($spans || []);
});

export const simulationStatus: Readable<Status | null> = derived(
  [planRevision, simulationDatasetLatest, simulation, planModelRevision],
  ([$planRevision, $simulationDataset, $simulation, $planModelRevision]) => {
    if ($simulationDataset && $simulation && $planModelRevision > -1) {
      const { status } = $simulationDataset;

      if (
        $planRevision !== $simulationDataset.plan_revision ||
        $simulation.revision !== $simulationDataset.simulation_revision ||
        $planModelRevision !== $simulationDataset.model_revision
      ) {
        return Status.Modified;
      }

      if (status === 'success') {
        return Status.Complete;
      } else if (status === 'failed') {
        return Status.Failed;
      } else if ($simulationDataset.canceled) {
        return Status.Canceled;
      } else if (status === 'incomplete') {
        return Status.Incomplete;
      } else if (status === 'pending') {
        return Status.Pending;
      }
    }

    return null;
  },
  null,
);

export const simulationProgress: Readable<number> = derived(
  [simulationDatasetLatest, simulationStatus],
  ([$simulationDataset]) => {
    return getSimulationProgress($simulationDataset);
  },
  0,
);

export const enableSimulation: Readable<boolean> = derived(simulationStatus, $simulationStatus => {
  return $simulationStatus === Status.Modified || $simulationStatus === null;
});

export const selectedSpan = derived([spansMap, selectedSpanId], ([$spansMap, $selectedSpanId]) => {
  if ($selectedSpanId !== null && $spansMap !== null) {
    return $spansMap[$selectedSpanId] || null;
  }

  return null;
});

export const simulationDatasetLatestId = derived(
  [simulationDatasetLatest],
  ([$simulationDatasetLatest]) => $simulationDatasetLatest?.id ?? -1,
);

export const getResource = async (simulationDatasetId: number, resourceName: string, user, abort: AbortSignal): Record<string, Profile[] | null> => {
  const simulationData = await simulationDataReady;

  const profile = simulationData.profiles[resourceName];
  if (profile === undefined) {
    console.log(resourceName, {...simulationData.profiles});
    console.log("profile", profile);
  }

  let profile_type = "discrete";
  if (profile.schema.type === "struct") {
    const keys = [...Object.keys(profile.schema.items).sort()];
    if (keys[0] === "initial" && keys[1] === "rate") {
      profile_type = "real";
    }
  }

  return {
    profile: [
      {
        dataset_id: simulationDatasetId,  // TODO this is kind of wrong
        duration: usToOffset(Number(simulationData.start_offset)),
        id: 0,
        name: resourceName,
        profile_segments: profile.segments.map(entry => ({
          dataset_id: simulationDatasetId,
          dynamics: entry.value,
          is_gap: false,
          profile_id: resourceName,
          start_offset: usToOffset(Number(entry.start_offset)),
        })),
        type: {
          schema: profile.schema,
          type: profile_type,
        }
      }
    ]
  };
}

let simulationDataReady = null;

export const subscribeToSimulation = (simulationDatasetId: number, planStartTimeYmd: string, abort: AbortSignal) => {
  let resolve_simulationDataReady : (result : any) => void;
  let reject_simulationDataReady : (err : Error) => void;
  simulationDataReady = new Promise((res, rej) => { resolve_simulationDataReady = res; reject_simulationDataReady = rej; });
  console.log("subscribeToSimulation", simulationDatasetId);
  const w = new WebSocket(`ws://localhost:27183/simulation-results/${simulationDatasetId}`);

  const planEpoch = getUnixEpochTime(getDoyTime(new Date(planStartTimeYmd), true));

  abort.onabort = _ev => {
    console.log("Aborted", simulationDatasetId);
    return w.close();
  };

  const tmpSpansMap: SpansMap = {};
  let tmpProfiles = {};
  let tmpTime = 0;

  let keepalive: NodeJS.Timeout | null = null;
  if (w !== null) {
    w.onopen = (ev: Event) => {
      console.log("onopen", ev);
      keepalive = setInterval(() => w.send("keepalive"), 20_000 /* 20 seconds */);
      spansMap.set({});
    }

    w.onmessage = (ev: MessageEvent) => {
      const message = JSON.parse(ev.data);
      const { channel, payload } = message;

      console.log({channel, payload});

      if (channel === "finish") {
        // spansMap.update((s) => ({...(s as SpansMap), [payload.span_id]: span}))
        spansMap.set(tmpSpansMap);
        initialSpansLoading.set(false);
        console.log(tmpProfiles);
        resolve_simulationDataReady({planStart: planStartTimeYmd, profiles: tmpProfiles, start_offset: tmpTime});
        tmpProfiles = {};
      }

      if (channel === "advance_time") {
        tmpTime = payload.start_offset;
      }

      if (channel === "span") {
        const durationMs = payload.duration ? Number(BigInt(payload.duration) / 1000n) : 0;
        const startMs = planEpoch + Number(BigInt(payload.start_offset) / 1000n);
        const span: Span = {
          attributes: payload.attributes,
          dataset_id: simulationDatasetId,
          duration: payload.duration,
          durationMs,
          endMs: startMs + durationMs,
          parent_id: payload.parent_id,
          span_id: payload.span_id,
          startMs,
          start_offset: payload.start_offset,
          type: payload.type,
        };

        tmpSpansMap[span.span_id] = span;
      }

      if (channel === "declare_profile") {
        tmpProfiles[payload.profile_name] = {
          schema: payload.schema,
          segments: []
        };
      }

      if (channel === "update_profile") {
        console.log(payload);
        tmpProfiles[payload.profile_name].segments.push(payload);
      }
    }
    w.onclose = (_ev: Event) => {
      if (keepalive) {
        clearInterval(keepalive);
      }
    }
  }
}

/* Helper Functions. */

export function resetSimulationStores() {
  externalResources.set([]);
  externalResourceNames.set([]);
  fetchingResourcesExternal.set(false);
  initialSpansLoading.set(true);
  selectedSpanId.update(() => null);
  simulation.updateValue(() => null);
  simulationDatasetId.set(-1);
  simulationDataset.updateValue(() => null);
  simulationDatasetLatest.updateValue(() => null);
  simulationEvents.set(null);
  simulationTemplates.updateValue(() => []);
  simulationDatasetsPlan.updateValue(() => null);
  simulationDatasetsAll.updateValue(() => null);
  spansMap.set(null);
  resourceTypes.set([]);
}
