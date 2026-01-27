import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { ComparisonActivity, ComparisonSource } from '../../../types/plan-comparison';
import type { ResourceType, SimulationDataset } from '../../../types/simulation';
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
 * Load comparison data for a source
 */
async function loadSourceData(
  sourceParam: { id: number; type: 'plan' | 'snapshot' },
  user: App.Locals['user'],
): Promise<ComparisonData | null> {
  if (sourceParam.type === 'plan') {
    // Fetch plan data and simulation dataset in parallel
    const [planData, simulationDataset] = await Promise.all([
      effects.getPlanForComparison(sourceParam.id, user),
      effects.getLatestSimulationDatasetForPlan(sourceParam.id, user),
    ]);
    if (planData) {
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
