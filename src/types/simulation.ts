import type { ArgumentsMap } from '.';

export type Simulation = {
  arguments: ArgumentsMap;
  id: number;
};

export enum SimulationStatus {
  Clean = 'Clean',
  Complete = 'Complete',
  Dirty = 'Dirty',
  Executing = 'Executing',
  Failed = 'Failed',
  Incomplete = 'Incomplete',
  Unknown = 'Unknown',
}

export type Resource = {
  name: string;
  schema: any;
  startTime: string;
  values: ResourceValue[];
};

export type ResourceType = {
  name: string;
  schema: { type: string } & any;
};

export type ResourceValue = {
  x: number;
  y: number | string;
};
