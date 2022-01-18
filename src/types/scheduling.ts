export type SchedulingResponse = {
  reason?: string;
  results?: SchedulingResults;
  status: 'complete' | 'failed';
};

export type SchedulingResults = {
  activityCount: number;
  goalScores: Record<string, number>;
};
