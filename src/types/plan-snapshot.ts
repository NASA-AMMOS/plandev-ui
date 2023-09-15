import type { UserId } from './app';

export type PlanSnapshot = {
  plan_id: number;
  revision: number;
  snapshot_id: number;
  snapshot_name: string;
  taken_at: string;
  taken_by: UserId;
};
