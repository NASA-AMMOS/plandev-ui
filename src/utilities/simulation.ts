import type { SimulationDataset } from '../types/simulation';
import { compare, getNumberWithOrdinal } from './generic';
import { Status, statusColors } from './status';
import { getDoyTime, getUnixEpochTimeFromInterval } from './time';

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
  if (simulationDataset.status === 'failed') {
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
  if (status === Status.Incomplete || status === Status.Failed) {
    simulationExtentMS = getUnixEpochTimeFromInterval(simulationDataset.simulation_start_time, extent);
  } else if (status === Status.Complete) {
    simulationExtentMS = new Date(simulationDataset.simulation_end_time).getTime();
  }
  return getDoyTime(new Date(simulationExtentMS), false);
}

/**
 * Returns a human readable string representing a Simulation Status
 */
export function getHumanReadableSimulationStatus(status: Status | null): string {
  if (!status) {
    return 'Unknown';
  }
  if (status === Status.Complete) {
    return Status.Complete;
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
export function getSimulationStatus(simulationDataset: SimulationDataset | null): Status | null {
  if (!simulationDataset) {
    return null;
  }
  if (simulationDataset.status === 'success') {
    return Status.Complete;
  } else if (simulationDataset.status === 'failed') {
    return Status.Failed;
  } else if (simulationDataset.status === 'incomplete') {
    return Status.Incomplete;
  } else if (simulationDataset.status === 'pending') {
    if (simulationDataset.canceled) {
      return Status.Canceled;
    }
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
  simDataset: SimulationDataset,
  simulationDatasets: SimulationDataset[],
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
