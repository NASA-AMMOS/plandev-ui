import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type {
  ActivityComparisonResult,
  ComparisonActivity,
  ComparisonOptions,
  ComparisonSource,
  PlanComparisonResult,
  PlanComparisonSummary,
} from '../types/plan-comparison';
import type { ResourceType, SimulationDataset, SpansMap, SpanUtilityMaps } from '../types/simulation';
import { compareActivities } from '../utilities/plan-comparison';

/**
 * Store for the left comparison source (plan or snapshot)
 */
export const comparisonLeftSource: Writable<ComparisonSource | null> = writable(null);

/**
 * Store for the right comparison source (plan or snapshot)
 */
export const comparisonRightSource: Writable<ComparisonSource | null> = writable(null);

/**
 * Activities from the left source
 */
export const comparisonLeftActivities: Writable<ComparisonActivity[]> = writable([]);

/**
 * Activities from the right source
 */
export const comparisonRightActivities: Writable<ComparisonActivity[]> = writable([]);

/**
 * Duration of the left source plan (for time proximity calculations)
 */
export const comparisonLeftDuration: Writable<string> = writable('');

/**
 * Duration of the right source plan (for time proximity calculations)
 */
export const comparisonRightDuration: Writable<string> = writable('');

/**
 * Start time of the left source plan (for timeline visualization)
 */
export const comparisonLeftStartTime: Writable<string> = writable('');

/**
 * Start time of the right source plan (for timeline visualization)
 */
export const comparisonRightStartTime: Writable<string> = writable('');

/**
 * Model IDs for compatibility checking
 */
export const comparisonLeftModelId: Writable<number | null> = writable(null);
export const comparisonRightModelId: Writable<number | null> = writable(null);

/**
 * Simulation datasets for resource visualization
 */
export const comparisonLeftSimulationDataset: Writable<SimulationDataset | null> = writable(null);
export const comparisonRightSimulationDataset: Writable<SimulationDataset | null> = writable(null);

/**
 * Spans maps for computing activity start times with anchor chains
 */
export const comparisonLeftSpansMap: Writable<SpansMap> = writable({});
export const comparisonRightSpansMap: Writable<SpansMap> = writable({});

/**
 * Span utility maps for computing activity start times with anchor chains
 */
export const comparisonLeftSpanUtilityMaps: Writable<SpanUtilityMaps> = writable({
  directiveIdToSpanIdMap: {},
  spanIdToChildIdsMap: {},
  spanIdToDirectiveIdMap: {},
});
export const comparisonRightSpanUtilityMaps: Writable<SpanUtilityMaps> = writable({
  directiveIdToSpanIdMap: {},
  spanIdToChildIdsMap: {},
  spanIdToDirectiveIdMap: {},
});

/**
 * Resource types available for the compared plans (from the model)
 */
export const comparisonResourceTypes: Writable<ResourceType[]> = writable([]);

/**
 * Selected resource names to display in the timeline
 */
export const comparisonSelectedResources: Writable<string[]> = writable([]);

/**
 * Whether a comparison is currently loading
 */
export const comparisonLoading: Writable<boolean> = writable(false);

/**
 * Error message if comparison failed
 */
export const comparisonError: Writable<string | null> = writable(null);

/**
 * The currently selected activity ID for detail view
 */
export const selectedComparisonActivityId: Writable<number | null> = writable(null);

/**
 * Comparison options
 */
export const comparisonOptions: Writable<ComparisonOptions> = writable({
  fuzzyHighThreshold: 0.85,
  fuzzyLowThreshold: 0.65,
  includeUnchanged: true,
  strategy: 'content',
});

/**
 * Check if models are compatible for comparison
 */
export const comparisonModelsCompatible: Readable<boolean> = derived(
  [comparisonLeftModelId, comparisonRightModelId],
  ([$leftModelId, $rightModelId]) => {
    // Both must be set
    if ($leftModelId === null || $rightModelId === null) {
      return true; // Not yet loaded, assume compatible
    }
    // Same model ID means compatible
    return $leftModelId === $rightModelId;
  },
);

/**
 * Helper to parse duration string to milliseconds
 */
function parseDurationToMs(duration: string): number {
  if (!duration) {return 0;}
  // Duration format: HH:MM:SS or similar
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  return 0;
}

/**
 * Computed comparison results - recalculates when inputs change
 */
export const comparisonResults: Readable<PlanComparisonResult | null> = derived(
  [
    comparisonLeftSource,
    comparisonRightSource,
    comparisonLeftActivities,
    comparisonRightActivities,
    comparisonLeftDuration,
    comparisonOptions,
  ],
  ([
    $leftSource,
    $rightSource,
    $leftActivities,
    $rightActivities,
    $leftDuration,
    $options,
  ]) => {
    if (!$leftSource || !$rightSource) {
      return null;
    }

    if ($leftActivities.length === 0 && $rightActivities.length === 0) {
      return null;
    }

    // Always use content-based matching.
    // ID-based matching is unreliable because:
    // 1. Scheduling goals can regenerate activities with new IDs
    // 2. Activities could be deleted and recreated
    // 3. Different plans have separate ID sequences
    // 4. Snapshot activity IDs may not match the original plan's IDs
    const effectiveOptions: ComparisonOptions = {
      ...$options,
      strategy: 'content',
    };

    const planDurationMs = parseDurationToMs($leftDuration);
    const { results, summary } = compareActivities($leftActivities, $rightActivities, effectiveOptions, planDurationMs);

    return {
      leftSource: $leftSource,
      results,
      rightSource: $rightSource,
      summary,
    };
  },
);

/**
 * Summary statistics derived from comparison results
 */
export const comparisonSummary: Readable<PlanComparisonSummary | null> = derived(
  comparisonResults,
  $results => $results?.summary ?? null,
);

/**
 * Just the activity comparison results
 */
export const activityComparisonResults: Readable<ActivityComparisonResult[]> = derived(
  comparisonResults,
  $results => $results?.results ?? [],
);

/**
 * Filter to show only changes (exclude unchanged activities)
 */
export const showOnlyChanges: Writable<boolean> = writable(false);

/**
 * Visibility toggles for each change type in the timeline
 */
export const showAddedActivities: Writable<boolean> = writable(true);
export const showDeletedActivities: Writable<boolean> = writable(true);
export const showModifiedActivities: Writable<boolean> = writable(true);
export const showUnchangedActivities: Writable<boolean> = writable(true);

/**
 * Filtered results based on showOnlyChanges toggle
 */
export const filteredComparisonResults: Readable<ActivityComparisonResult[]> = derived(
  [activityComparisonResults, showOnlyChanges],
  ([$results, $showOnlyChanges]) => {
    if (!$showOnlyChanges) {
      return $results;
    }
    return $results.filter(result => {
      if (result.changeType === 'added' || result.changeType === 'deleted') {
        return true;
      }
      // For matched activities, check if there are actual changes
      return result.changedFields.length > 0 || result.matchType !== 'exact';
    });
  },
);

/**
 * Get the currently selected comparison result
 * Uses filteredComparisonResults to match what's shown in the list
 */
export const selectedComparisonResult: Readable<ActivityComparisonResult | null> = derived(
  [filteredComparisonResults, selectedComparisonActivityId],
  ([$results, $selectedId]) => {
    if ($selectedId === null) {
      return null;
    }
    return $results.find(result => {
      if (result.changeType === 'matched') {
        return result.leftActivity.id === $selectedId || result.rightActivity.id === $selectedId;
      }
      return result.activity.id === $selectedId;
    }) ?? null;
  },
);

/**
 * Reset all comparison stores to initial state
 */
export function resetComparisonStores(): void {
  comparisonLeftSource.set(null);
  comparisonRightSource.set(null);
  comparisonLeftActivities.set([]);
  comparisonRightActivities.set([]);
  comparisonLeftDuration.set('');
  comparisonRightDuration.set('');
  comparisonLeftStartTime.set('');
  comparisonRightStartTime.set('');
  comparisonLeftModelId.set(null);
  comparisonRightModelId.set(null);
  comparisonLeftSimulationDataset.set(null);
  comparisonRightSimulationDataset.set(null);
  comparisonLeftSpansMap.set({});
  comparisonRightSpansMap.set({});
  comparisonLeftSpanUtilityMaps.set({
    directiveIdToSpanIdMap: {},
    spanIdToChildIdsMap: {},
    spanIdToDirectiveIdMap: {},
  });
  comparisonRightSpanUtilityMaps.set({
    directiveIdToSpanIdMap: {},
    spanIdToChildIdsMap: {},
    spanIdToDirectiveIdMap: {},
  });
  comparisonResourceTypes.set([]);
  comparisonSelectedResources.set([]);
  comparisonLoading.set(false);
  comparisonError.set(null);
  selectedComparisonActivityId.set(null);
  showOnlyChanges.set(false);
  showAddedActivities.set(true);
  showDeletedActivities.set(true);
  showModifiedActivities.set(true);
  showUnchangedActivities.set(true);
}
