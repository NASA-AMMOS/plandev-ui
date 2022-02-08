type SchedulingResponse = {
  reason?: string;
  results?: SchedulingResults;
  status: 'complete' | 'failed';
};

type SchedulingResults = {
  activityCount: number;
  goalScores: Record<string, number>;
};
