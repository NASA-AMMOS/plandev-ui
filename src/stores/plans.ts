import type { PlanSlim } from '../types/plan';
import gql from '../utilities/gql';
import { getDoyTime, getDoyTimeFromInterval } from '../utilities/time';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const plans = gqlSubscribable<PlanSlim[] | null>(gql.SUB_PLANS, {}, null, null, plans => {
  return (plans as PlanSlim[]).map(plan => {
    return {
      ...plan,
      end_time_doy: getDoyTimeFromInterval(plan.start_time, plan.duration),
      start_time_doy: getDoyTime(new Date(plan.start_time)),
    };
  });
});
