import { derived } from 'svelte/store';
import type { PlanImportRequest, PlanSlim } from '../types/plan';
import type { GqlSubscribable } from '../types/subscribable';
import gql from '../utilities/gql';
import { getDoyTime, getDoyTimeFromInterval } from '../utilities/time';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const plans = gqlSubscribable<PlanSlim[]>(gql.SUB_PLANS, {}, [], plans => {
  return (plans as PlanSlim[]).map(plan => {
    return {
      ...plan,
      end_time_doy: getDoyTimeFromInterval(plan.start_time, plan.duration),
      start_time_doy: getDoyTime(new Date(plan.start_time)),
    };
  });
});

export const planImportRequests = gqlSubscribable<PlanImportRequest[]>(gql.SUB_PLAN_IMPORT_REQUESTS, {}, []);

/* Derived. */

export const planImportRequestsMap = derived<[GqlSubscribable<PlanImportRequest[]>], Record<number, PlanImportRequest>>(
  [planImportRequests],
  ([$requests]) => {
    return $requests.reduce(
      (acc, request) => {
        acc[request.plan_id] = request;
        return acc;
      },
      {} as Record<number, PlanImportRequest>,
    );
  },
);
