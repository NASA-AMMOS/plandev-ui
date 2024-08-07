import type { ActivityDirective, ActivityDirectiveDB } from '../types/activity';
import type { User } from '../types/app';
import type { ArgumentsMap } from '../types/parameter';
import type { DeprecatedPlanTransfer, Plan, PlanSlim, PlanTransfer } from '../types/plan';
import type { Simulation } from '../types/simulation';
import effects from './effects';
import { downloadJSON } from './generic';
import { convertDoyToYmd } from './time';

export async function getPlanForTransfer(
  plan: Plan | PlanSlim,
  user: User | null,
  progressCallback?: (progress: number) => void,
  activities?: ActivityDirective[],
  signal?: AbortSignal,
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

  let totalProgress = 0;
  const numOfDirectives = activitiesToQualify.length;

  const CHUNK_SIZE = 8;
  const chunkedActivities = activitiesToQualify.reduce(
    (prevChunks: ActivityDirectiveDB[][], activityToQualify: ActivityDirectiveDB, index) => {
      const chunkIndex = Math.floor(index / CHUNK_SIZE);
      if (!prevChunks[chunkIndex]) {
        prevChunks[chunkIndex] = [];
      }
      prevChunks[chunkIndex].push(activityToQualify);
      return prevChunks;
    },
    [],
  );

  progressCallback?.(0);
  const qualifiedActivityDirectiveChunks: ActivityDirectiveDB[][] = [];
  for (let i = 0; i < chunkedActivities.length; i++) {
    if (!signal?.aborted) {
      const activitiesToQualifyChunk: ActivityDirectiveDB[] = chunkedActivities[i];
      qualifiedActivityDirectiveChunks[i] = await Promise.all(
        activitiesToQualifyChunk.map(async activityDirective => {
          if (plan) {
            const effectiveArguments = await effects.getEffectiveActivityArguments(
              plan?.model_id,
              activityDirective.type,
              activityDirective.arguments,
              user,
              signal,
            );

            totalProgress++;
            progressCallback?.((totalProgress / numOfDirectives) * 100);

            return {
              ...activityDirective,
              arguments: effectiveArguments?.arguments ?? activityDirective.arguments,
            };
          }

          totalProgress++;
          progressCallback?.((totalProgress / numOfDirectives) * 100);

          return activityDirective;
        }),
      );
    }
  }

  if (!signal?.aborted) {
    progressCallback?.(100);
  }

  const qualifiedActivityDirectives = qualifiedActivityDirectiveChunks.flat().sort((directiveA, directiveB) => {
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
  progressCallback: (progress: number) => void,
  activities?: ActivityDirective[],
  signal?: AbortSignal,
): Promise<void> {
  const planTransfer = await getPlanForTransfer(plan, user, progressCallback, activities, signal);

  if (planTransfer && !signal?.aborted) {
    downloadJSON(planTransfer, plan.name);
  }
}

export function isDeprecatedPlanTransfer(
  planTransfer: PlanTransfer | DeprecatedPlanTransfer,
): planTransfer is DeprecatedPlanTransfer {
  return (planTransfer as DeprecatedPlanTransfer).end_time != null;
}
