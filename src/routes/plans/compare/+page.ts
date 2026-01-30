import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { keyBy } from 'lodash-es';
import type { User } from '../../../types/app';
import type { ComparisonActivity, ComparisonSource } from '../../../types/plan-comparison';
import type { ResourceType, SimulationDataset, Span, SpansMap, SpanUtilityMaps } from '../../../types/simulation';
import { createSpanUtilityMaps } from '../../../utilities/activities';
import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

type ComparisonData = {
  activities: ComparisonActivity[];
  duration: string;
  modelId: number;
  name: string;
  planId: number;
  simulationDataset: SimulationDataset | null;
  source: ComparisonSource;
  spans: Span[];
  spansMap: SpansMap;
  spanUtilityMaps: SpanUtilityMaps;
  startTime: string;
};

/**
 * Parse a source parameter (e.g., "plan:123" or "snapshot:456")
 */
function parseSourceParam(param: string | null): { id: number; type: 'plan' | 'snapshot' } | null {
  if (!param) {
    return null;
  }

  const [type, idStr] = param.split(':');
  const id = parseInt(idStr, 10);

  if ((type === 'plan' || type === 'snapshot') && !Number.isNaN(id)) {
    return { id, type };
  }

  return null;
}

/**
 * Load spans and build utility maps for a simulation dataset
 */
async function loadSpansData(
  simulationDataset: SimulationDataset | null,
  startTime: string,
  user: User,
): Promise<{ spans: Span[]; spansMap: SpansMap; spanUtilityMaps: SpanUtilityMaps }> {
  if (!simulationDataset) {
    return {
      spans: [],
      spansMap: {},
      spanUtilityMaps: {
        directiveIdToSpanIdMap: {},
        spanIdToChildIdsMap: {},
        spanIdToDirectiveIdMap: {},
      },
    };
  }

  const spans = await effects.getSpans(simulationDataset.dataset_id, startTime, user);
  const spansMap: SpansMap = keyBy(spans, 'span_id');
  const spanUtilityMaps = createSpanUtilityMaps(spans);

  return { spans, spansMap, spanUtilityMaps };
}

/**
 * Load comparison data for a source
 */
async function loadSourceData(
  sourceParam: { id: number; type: 'plan' | 'snapshot' },
  user: User,
): Promise<ComparisonData | null> {
  if (sourceParam.type === 'plan') {
    // Fetch plan data and simulation dataset in parallel
    const [planData, simulationDataset] = await Promise.all([
      effects.getPlanForComparison(sourceParam.id, user),
      effects.getLatestSimulationDatasetForPlan(sourceParam.id, user),
    ]);
    if (planData) {
      // Load spans from simulation dataset
      const { spans, spansMap, spanUtilityMaps } = await loadSpansData(simulationDataset, planData.startTime, user);
      return {
        activities: planData.activities,
        duration: planData.duration,
        modelId: planData.modelId,
        name: planData.name,
        planId: sourceParam.id,
        simulationDataset,
        source: {
          name: planData.name,
          planId: sourceParam.id,
          type: 'plan',
        },
        spans,
        spansMap,
        spanUtilityMaps,
        startTime: planData.startTime,
      };
    }
  } else {
    const snapshotData = await effects.getSnapshotForComparison(sourceParam.id, user);
    if (snapshotData) {
      // For snapshots, fetch simulation dataset that matches the snapshot's plan revision
      // This ensures we show simulation results from the time the snapshot was taken
      const simulationDataset = await effects.getSimulationDatasetByPlanRevision(
        snapshotData.planId,
        snapshotData.revision,
        user,
      );
      // Load spans from simulation dataset
      const { spans, spansMap, spanUtilityMaps } = await loadSpansData(simulationDataset, snapshotData.startTime, user);
      return {
        activities: snapshotData.activities,
        duration: snapshotData.duration,
        modelId: snapshotData.modelId,
        name: snapshotData.name,
        planId: snapshotData.planId,
        simulationDataset,
        source: {
          name: snapshotData.name,
          planId: snapshotData.planId,
          snapshotId: sourceParam.id,
          type: 'snapshot',
        },
        spans,
        spansMap,
        spanUtilityMaps,
        startTime: snapshotData.startTime,
      };
    }
  }

  return null;
}

export const load: PageLoad = async ({ parent, url }) => {
  const { user } = await parent();

  const leftParam = parseSourceParam(url.searchParams.get('left'));
  const rightParam = parseSourceParam(url.searchParams.get('right'));

  // If no params provided, show the comparison selector
  if (!leftParam || !rightParam) {
    return {
      leftData: null,
      rightData: null,
      user,
    };
  }

  // If no user, redirect to plans list
  if (!user) {
    redirect(302, `${base}/plans`);
  }

  // Load both sources in parallel
  const [leftData, rightData] = await Promise.all([loadSourceData(leftParam, user), loadSourceData(rightParam, user)]);

  // If either source failed to load, redirect to plans list
  if (!leftData || !rightData) {
    redirect(302, `${base}/plans`);
  }

  // Fetch resource types for the model (use left model, since both should be same for meaningful comparison)
  let resourceTypes: ResourceType[] = [];
  if (leftData.modelId) {
    resourceTypes = await effects.getResourceTypes(leftData.modelId, user);
  }

  return {
    leftData,
    resourceTypes,
    rightData,
    user,
  };
};
