import type { ArgumentsMap } from '.';

export type Simulation = {
  arguments: ArgumentsMap;
  id: number;
};

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
