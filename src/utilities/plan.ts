import type { ActivityDirective } from '../types/activity';
import type { ArgumentsMap } from '../types/parameter';
import type { DeprecatedPlanTransfer, Plan, PlanTransfer } from '../types/plan';
import { convertDoyToYmd } from './time';

export function getPlanForTransfer(
  plan: Plan,
  activities: ActivityDirective[],
  simulationArguments: ArgumentsMap,
): PlanTransfer {
  return {
    activities: activities.map(
      ({
        anchor_id,
        anchored_to_start,
        arguments: activityArguments,
        id,
        metadata,
        name,
        start_offset,
        tags,
        type,
      }) => ({
        anchor_id,
        anchored_to_start,
        arguments: activityArguments,
        id,
        metadata,
        name,
        start_offset,
        tags: tags.map(({ tag: { color, name } }) => ({ tag: { color, name } })),
        type,
      }),
    ),
    duration: plan.duration,
    id: plan.id,
    model_id: plan.model_id,
    name: plan.name,
    simulation_arguments: simulationArguments,
    start_time: (convertDoyToYmd(plan.start_time_doy) as string).replace('Z', '+00:00'),
    tags: plan.tags.map(({ tag: { color, name } }) => ({ tag: { color, name } })),
  };
}

export function isDeprecatedPlanTransfer(
  planTransfer: PlanTransfer | DeprecatedPlanTransfer,
): planTransfer is DeprecatedPlanTransfer {
  return (planTransfer as DeprecatedPlanTransfer).end_time != null;
}
