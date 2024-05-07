import { Status } from '../enums/status';
import type { RawSimulationEvent, SimulationDataset, SimulationDatasetSlim } from '../types/simulation';
import { compare, getNumberWithOrdinal } from './generic';
import { statusColors } from './status';
import { getDoyTime, getIntervalInMs, getUnixEpochTimeFromInterval } from './time';

/**
 * Returns the string version of an object of unknown type or returns null if this operation fails.
 */
export function getSimulationProgress(simulationDataset: SimulationDataset | null) {
  if (!simulationDataset || !simulationDataset.simulation_start_time || !simulationDataset.simulation_end_time) {
    return 0;
  }
  const simulationStartTimeMS = new Date(simulationDataset.simulation_start_time).getTime();
  const simulationEndTimeMS = new Date(simulationDataset.simulation_end_time).getTime();
  let simulationExtentMS = 0;
  const simulationExtentInterval = getSimulationExtent(simulationDataset);
  if (
    (simulationDataset.status === 'incomplete' || simulationDataset.status === 'failed') &&
    simulationExtentInterval
  ) {
    simulationExtentMS =
      getUnixEpochTimeFromInterval(simulationDataset.simulation_start_time, simulationExtentInterval) -
      simulationStartTimeMS;
  } else if (simulationDataset.status === 'success') {
    simulationExtentMS = simulationEndTimeMS - simulationStartTimeMS;
  }
  const simulationDuration = simulationEndTimeMS - simulationStartTimeMS;
  return (simulationExtentMS / simulationDuration) * 100 || 0;
}

/**
 * Returns the interval extent from a simulation dataset
 */
export function getSimulationExtent(simulationDataset: SimulationDataset): string | null {
  // Look for the extent in the reason if the sim failed, otherwise grab it from the extent object
  if (simulationDataset.status === 'failed' || simulationDataset.canceled) {
    return simulationDataset.reason?.data.elapsedTime ?? null;
  } else {
    return simulationDataset.extent?.extent ?? null;
  }
}

/**
 * Returns the timestamp representing the simulation extent
 */
export function getSimulationTimestamp(simulationDataset: SimulationDataset): string {
  const extent = getSimulationExtent(simulationDataset);
  const status = getSimulationStatus(simulationDataset);
  if (!extent || !status || !simulationDataset.simulation_start_time || !simulationDataset.simulation_end_time) {
    return 'Unknown Time';
  }
  let simulationExtentMS = 0;
  if (status === Status.Incomplete || status === Status.Failed || status === Status.Canceled) {
    simulationExtentMS = getUnixEpochTimeFromInterval(simulationDataset.simulation_start_time, extent);
  } else if (status === Status.Complete) {
    simulationExtentMS = new Date(simulationDataset.simulation_end_time).getTime();
  }
  return getDoyTime(new Date(simulationExtentMS), false);
}

/**
 * Returns a human readable string representing a Status
 */
export function getHumanReadableStatus(status: Status | null): string {
  if (!status) {
    return 'Unknown';
  }
  if (status === Status.Complete) {
    return Status.Complete;
  } else if (status === Status.PartialSuccess) {
    return 'Partially Succeeded';
  } else if (status === Status.Failed) {
    return Status.Failed;
  } else if (status === Status.Incomplete) {
    return 'In Progress';
  } else if (status === Status.Pending) {
    return 'Queued';
  } else if (status === Status.Canceled) {
    return 'Canceled';
  }
  return 'Unknown';
}

/**
 * Returns a Status for a simulation dataset
 */
export function getSimulationStatus(simulationDataset: SimulationDatasetSlim | null): Status | null {
  if (!simulationDataset) {
    return null;
  }
  if (simulationDataset.status === 'success') {
    return Status.Complete;
  } else if (simulationDataset.status === 'failed') {
    return Status.Failed;
  } else if (simulationDataset.canceled) {
    return Status.Canceled;
  } else if (simulationDataset.status === 'incomplete') {
    return Status.Incomplete;
  } else if (simulationDataset.status === 'pending') {
    return Status.Pending;
  }
  return null;
}

/**
 * Returns a color for a simulation status
 */
export function getSimulationProgressColor(status: SimulationDataset['status'] | null): string {
  if (!status) {
    return statusColors.gray;
  }
  if (status === 'success') {
    return '#969696';
  } else if (status === 'failed') {
    return statusColors.red;
  } else if (status === 'incomplete') {
    return '#2f80ed'; // var(--st-utility-blue);
  } else if (status === 'pending') {
    return '#545f64';
  } else {
    return '#FF0000';
  }
}

/**
 * Returns simulation position within simulation queue
 */
export function getSimulationQueuePosition(
  simDataset: SimulationDatasetSlim,
  simulationDatasets: SimulationDatasetSlim[],
): number {
  // If simDataset is pending, returns the position the simDataset appears in the set of queued simulation datasets
  // Otherwise returns -1
  if (simDataset.status !== 'pending' || simDataset.canceled) {
    return -1;
  }
  const pendingSimDatasets = simulationDatasets
    .filter(d => d.status === 'pending' && !d.canceled)
    .sort((a, b) => compare(a.id, b.id));
  return pendingSimDatasets.findIndex(d => d.id === simDataset.id) + 1;
}

/**
 * Format simulation queue position as human readable string
 */
export function formatSimulationQueuePosition(position: number): string {
  if (position === 1) {
    return 'Next in Queue';
  }
  return `${getNumberWithOrdinal(position)} in Queue`;
}

/**
 * Sort events using their dense time markings
 */
export function compareEvents(a: RawSimulationEvent, b: RawSimulationEvent) {
  const aMs = getIntervalInMs(a.real_time);
  const bMs = getIntervalInMs(b.real_time);
  if (aMs !== bMs) {
    return aMs - bMs;
  }

  if (a.transaction_index !== b.transaction_index) {
    return a.transaction_index - b.transaction_index;
  }

  const aDenseTime = a.causal_time.slice(1).split('.');
  const bDenseTime = b.causal_time.slice(1).split('.');

  let i = 0;
  let isSequential = true;
  while (i < Math.min(aDenseTime.length, bDenseTime.length)) {
    const aVal = parseInt(aDenseTime[i]);
    const bVal = parseInt(bDenseTime[i]);

    if (aVal === bVal) {
      i = i + 1;
      isSequential = !isSequential;
    } else if (!isSequential) {
      return 0;
    } else if (aVal < bVal) {
      return -1;
    } else {
      return 1;
    }
  }

  return 0;
}
