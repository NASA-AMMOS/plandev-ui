import { simulationResultsToBands } from '../functions';
import { Band, SimulationResults, StringTMap } from '../types';

export function getSimulationRunBands(): StringTMap<Band> {
  const simulationResults: SimulationResults = {
    resources: {
      a: [0, 1, 2, 3, 4],
      b: [1, 1, 2, 2, 2],
      c: [2, 2, 2, 1, 1],
      d: [1, 3, 1, 3, 1],
      e: [4, 2, 3, 1, 0],
    },
    times: [
      '2020-001T00:00:05',
      '2020-001T00:00:15',
      '2020-001T00:00:30',
      '2020-001T00:00:45',
      '2020-001T00:00:55',
    ],
  };
  return simulationResultsToBands(simulationResults);
}
