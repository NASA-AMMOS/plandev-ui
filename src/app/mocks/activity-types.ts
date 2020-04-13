import { ActivityType } from '../types';

export const activityType: ActivityType = {
  name: 'PeelBanana',
  parameters: [
    { default: 'fromStem', name: 'peelDirection', schema: { type: 'string' } },
    { default: 2.1, name: 'peelAmount', schema: { type: 'double' } },
  ],
};

export const activityTypes: ActivityType[] = [activityType];
