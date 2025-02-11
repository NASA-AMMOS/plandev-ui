import type { ActivityDirective, ActivityDirectiveDB } from '../types/activity';
import type { User } from '../types/app';
import type { ArgumentsMap, DefaultEffectiveArgumentsMap } from '../types/parameter';
import type { DeprecatedPlanTransfer, Plan, PlanSlim, PlanTransfer } from '../types/plan';
import type { Simulation } from '../types/simulation';
import effects from './effects';
import { downloadJSON, unique } from './generic';
import { convertDoyToYmd } from './time';

export async function getPlanForTransfer(
  plan: Plan | PlanSlim,
  user: User | null,
  activities?: ActivityDirective[],
): Promise<PlanTransfer | void> {
  const simulation: Simulation | null = await effects.getPlanLatestSimulation(plan.id, user);
  const qualifiedSimulationArguments: ArgumentsMap = simulation
    ? {
        ...simulation.template?.arguments,
        ...simulation.arguments,
      }
    : {};
  let activitiesToQualify: ActivityDirectiveDB[] = activities ?? [];
  if (activities === undefined) {
    activitiesToQualify = (await effects.getActivitiesForPlan(plan.id, user)) ?? [];
  }

  const activityTypes = unique(activitiesToQualify.map(a => a.type));
  const defaultActivityArguments = await effects.getDefaultActivityArguments(plan?.model_id, activityTypes, user);
  const argsMap: DefaultEffectiveArgumentsMap = {};
  const defaultActivityArgumentsMap = (defaultActivityArguments || []).reduce((map, { arguments: args, typeName }) => {
    map[typeName] = args;
    return map;
  }, argsMap);
  const qualifiedActivityDirectives = activitiesToQualify
    .map(activityDirective => {
      return {
        ...activityDirective,
        arguments: {
          ...defaultActivityArgumentsMap[activityDirective.type || ''],
          ...activityDirective.arguments,
        },
      };
    })
    .sort((directiveA, directiveB) => {
      if (directiveA.id < directiveB.id) {
        return -1;
      }
      if (directiveA.id > directiveB.id) {
        return 1;
      }
      return 0;
    });

  return {
    activities: qualifiedActivityDirectives.map(
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
    simulation_arguments: qualifiedSimulationArguments,
    start_time: (convertDoyToYmd(plan.start_time_doy) as string).replace('Z', '+00:00'),
    tags: plan.tags.map(({ tag: { color, name } }) => ({ tag: { color, name } })),
    version: '2',
  };
}

export async function exportPlan(
  plan: Plan | PlanSlim,
  user: User | null,
  activities?: ActivityDirective[],
): Promise<void> {
  const planTransfer = await getPlanForTransfer(plan, user, activities);

  if (planTransfer) {
    downloadJSON(planTransfer, plan.name);
  }
}

export function isDeprecatedPlanTransfer(
  planTransfer: PlanTransfer | DeprecatedPlanTransfer,
): planTransfer is DeprecatedPlanTransfer {
  return (planTransfer as DeprecatedPlanTransfer).end_time != null;
}
