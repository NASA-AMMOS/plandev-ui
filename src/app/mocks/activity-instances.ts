import { ActivityInstance } from '../types';

export const activityInstanceId = '5dc99ef353c09f6736c7072d';

export const activityInstance: ActivityInstance = {
  children: [],
  duration: 0,
  id: activityInstanceId,
  parameters: [
    {
      name: 'peelAmount',
      value: 2.1,
    },
    {
      name: 'peelDirection',
      value: 'down',
    },
  ],
  parent: null,
  startTimestamp: '2020-001T00:00:00',
  type: 'PeelBanana',
};

export const activityInstances = [activityInstance];
