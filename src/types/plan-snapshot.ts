import type { UserId } from './app';
import type { SimulationDataset } from './simulation';
import type { Tag } from './tags';

export type PlanSnapshot = {
  description: string;
  model_id: number;
  plan_id: number;
  revision: number;
  simulation: SimulationDataset | null;
  snapshot_id: number;
  snapshot_name: string;
  tags: { tag: Tag }[];
  taken_at: string;
  taken_by: UserId;
};
