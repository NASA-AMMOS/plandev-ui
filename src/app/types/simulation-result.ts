export interface SimulationResult {
  name: string;
  start: string;
  values: SimulationResultValue[];
}

export interface SimulationResultValue {
  x: number;
  y: number;
}
