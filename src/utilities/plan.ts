import type { ActivityDirective } from '../types/activity';
import type { Plan, PlanTransfer } from '../types/plan';
import { convertDoyToYmd } from './time';

export function getPlanForTransfer(plan: Plan, activities: ActivityDirective[]): PlanTransfer {
  return {
    activities: activities.map(
      ({ anchor_id, anchored_to_start, arguments: activityArguments, id, metadata, name, start_offset, type }) => ({
        anchor_id,
        anchored_to_start,
        arguments: activityArguments,
        id,
        metadata,
        name,
        start_offset,
        type,
      }),
    ),
    end_time: (convertDoyToYmd(plan.end_time_doy) as string).replace('Z', '+00:00'),
    id: plan.id,
    model_id: plan.model_id,
    name: plan.name,
    sim_id: plan.simulations[0].id,
    start_time: (convertDoyToYmd(plan.start_time_doy) as string).replace('Z', '+00:00'),
    tags: plan.tags.map(({ tag: { id, name } }) => ({ tag: { id, name } })),
  };
}
