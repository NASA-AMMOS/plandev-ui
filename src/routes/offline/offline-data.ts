import { keyBy } from 'lodash-es';
import type { ActivityDirective, ActivityDirectivesMap } from '../../types/activity';
import type { LoadedOfflineBundle } from '../../types/offline-bundle';
import type { Plan } from '../../types/plan';
import type {
  Resource,
  ResourceType,
  Simulation,
  SimulationDataset,
  SpansMap,
  SpanUtilityMaps,
} from '../../types/simulation';
import type { View, ViewDefinition } from '../../types/view';
import { computeActivityDirectivesMap, createSpanUtilityMaps } from '../../utilities/activities';
import { sampleProfiles } from '../../utilities/resources';
import { getDoyTime, getDoyTimeFromInterval } from '../../utilities/time';
import { applyViewDefinitionMigrations, generateDefaultView } from '../../utilities/view';

/**
 * Everything the offline route's template needs to render a read-only plan
 * and timeline, derived once from a {@link LoadedOfflineBundle}.
 */
export type OfflinePlanData = {
  activityDirectives: ActivityDirective[];
  activityDirectivesMap: ActivityDirectivesMap;
  plan: Plan;
  resourceTypes: ResourceType[];
  resources: Resource[];
  simulation: Simulation;
  simulationDataset: SimulationDataset;
  spanUtilityMaps: SpanUtilityMaps;
  spans: LoadedOfflineBundle['spans'];
  spansMap: SpansMap;
  view: View;
};

/**
 * A bundle `view` is only usable if it actually carries the timeline tree the
 * timeline components read (`definition.plan.timelines`). Migrations can fill
 * in missing pieces of a real view, but they cannot invent one from `{}`.
 */
function isUsableViewDefinition(view: LoadedOfflineBundle['view']): view is ViewDefinition {
  const plan = (view as ViewDefinition | null)?.plan;
  return plan !== null && typeof plan === 'object' && Array.isArray(plan?.timelines);
}

/**
 * Wraps a bare `ViewDefinition` (migrated if necessary) in the `View` shape
 * the UI's view stores expect. Offline views have no owning user or backing
 * database row, so those fields are filled with inert placeholders.
 */
function toOfflineView(loaded: LoadedOfflineBundle, resourceTypes: ResourceType[]): View {
  // `view` is an optional free-form object in the bundle schema, so a producer
  // can legitimately emit `{}` and still validate. Anything that isn't a usable
  // view definition degrades to the generated default rather than rendering a
  // timeline with no `plan.timelines` to read.
  if (!isUsableViewDefinition(loaded.view)) {
    return generateDefaultView(resourceTypes, []);
  }

  const { error, migratedViewDefinition } = applyViewDefinitionMigrations(loaded.view);
  const now = new Date().toISOString();

  return {
    created_at: now,
    definition: migratedViewDefinition ?? loaded.view,
    id: 0,
    name: error ? 'Offline View (migration failed, using original)' : 'Offline View',
    owner: 'offline',
    updated_at: now,
  };
}

/**
 * Fabricates the `Simulation` record `TimelinePanel`/`Timeline` expect
 * alongside the `SimulationDataset`. Offline bundles have no backing
 * simulation row (or template), so this is a minimal, inert stand-in built
 * from the same bundle fields the loader already used for `simulationDataset`.
 */
function toOfflineSimulation(loaded: LoadedOfflineBundle): Simulation {
  return {
    arguments: {},
    id: loaded.simulationDataset.id,
    revision: loaded.simulationDataset.simulation_revision,
    simulation_end_time: loaded.simulationDataset.simulation_end_time,
    simulation_start_time: loaded.simulationDataset.simulation_start_time,
    template: null,
  };
}

/**
 * Transforms a loaded offline bundle into the plan/timeline data shape the
 * offline route renders, mirroring what `routes/plans/[id]/+page.ts` derives
 * from the live backend. Pure and side-effect free so it is unit-testable
 * without stubbing any store or network call.
 */
export function toOfflinePlanData(loaded: LoadedOfflineBundle): OfflinePlanData {
  const plan: Plan = {
    ...loaded.plan,
    end_time_doy: getDoyTimeFromInterval(loaded.plan.start_time, loaded.plan.duration),
    start_time_doy: getDoyTime(new Date(loaded.plan.start_time)),
  };

  const spansMap: SpansMap = keyBy(loaded.spans, 'span_id');
  const spanUtilityMaps = createSpanUtilityMaps(loaded.spans);
  const activityDirectivesMap = computeActivityDirectivesMap(
    loaded.activityDirectives,
    plan.start_time,
    plan.end_time_doy,
    spansMap,
    spanUtilityMaps,
  );
  const activityDirectives = Object.values(activityDirectivesMap).sort((a, b) => a.start_time_ms - b.start_time_ms);

  const resources = sampleProfiles(loaded.profiles, plan.start_time);

  return {
    activityDirectives,
    activityDirectivesMap,
    plan,
    resourceTypes: loaded.resourceTypes,
    resources,
    simulation: toOfflineSimulation(loaded),
    simulationDataset: loaded.simulationDataset,
    spanUtilityMaps,
    spans: loaded.spans,
    spansMap,
    view: toOfflineView(loaded, loaded.resourceTypes),
  };
}
