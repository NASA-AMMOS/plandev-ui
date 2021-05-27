import { Plan, PlanDetail } from '../types';
import { activityInstance } from './activity-instances';
import { activityTypes } from './activity-types';
import { adaptation, adaptationId } from './adaptations';

export const planId = '5dc6062653c09f6736c70725';

export const plan: Plan = {
  adaptationId,
  endTimestamp: '2020-000T00:00:10',
  id: planId,
  name: 'Eat Banana',
  startTimestamp: '2020-000T00:00:00',
};

export const plans: Plan[] = [plan];

export const planDetail: PlanDetail = {
  activityInstances: [activityInstance],
  adaptation: {
    ...adaptation,
    activityTypes,
  },
  adaptationId: plan.adaptationId,
  constraints: [],
  endTimestamp: plan.endTimestamp,
  id: plan.id,
  name: plan.name,
  startTimestamp: plan.startTimestamp,
};
