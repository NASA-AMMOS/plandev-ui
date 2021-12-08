import type { StringTMap } from '.';

export type SchedulingResponse = {
  reason?: string;
  results?: SchedulingResults;
  status: 'complete' | 'failed';
};

export type SchedulingResults = {
  activityCount: number;
  goalScores: StringTMap<number>;
};
