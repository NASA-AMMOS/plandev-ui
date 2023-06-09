import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type {
  ActivityDirective,
  ActivityDirectiveId,
  ActivityDirectivesByView,
  ActivityDirectivesMap,
  AnchorValidationStatus,
} from '../types/activity';
import type { ActivityMetadataDefinition } from '../types/activity-metadata';
import type { SpanId } from '../types/simulation';
import gql from '../utilities/gql';
import { planId } from './plan';
import { selectedSpanId } from './simulation';
import { gqlSubscribable } from './subscribable';
import { view, viewUpdateGrid } from './views';

/* Subscriptions. */

export const activityDirectives = gqlSubscribable<ActivityDirective[]>(
  gql.SUB_ACTIVITY_DIRECTIVES,
  { planId },
  [],
  null,
);

export const anchorValidationStatuses = gqlSubscribable<AnchorValidationStatus[]>(
  gql.SUB_ANCHOR_VALIDATION_STATUS,
  { planId },
  [],
  null,
);

export const activityMetadataDefinitions = gqlSubscribable<ActivityMetadataDefinition[]>(
  gql.SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS,
  {},
  [],
  null,
);

/* Writeable. */

export const activityDirectivesMap: Writable<ActivityDirectivesMap> = writable({});

export const selectedActivityDirectiveId: Writable<ActivityDirectiveId | null> = writable(null);

/* Derived. */

export const activityDirectivesList: Readable<ActivityDirective[]> = derived(
  activityDirectivesMap,
  $activityDirectivesMap => Object.values($activityDirectivesMap),
);

export const activityDirectivesByView: Readable<ActivityDirectivesByView> = derived(
  [activityDirectivesList, view],
  ([$activityDirectivesList, $view]) => {
    const { definition } = $view;
    const { plan } = definition;
    const { timelines } = plan;
    const byLayerId: Record<number, ActivityDirective[]> = {};
    const byTimelineId: Record<number, ActivityDirective[]> = {};

    for (const activityDirective of $activityDirectivesList) {
      for (const timeline of timelines) {
        const { rows } = timeline;

        for (const row of rows) {
          const { layers } = row;

          for (const layer of layers) {
            const { filter } = layer;

            if (filter.activity !== undefined) {
              const { activity: activityFilter } = filter;
              const { types } = activityFilter;
              const includeActivity = types.indexOf(activityDirective.type) > -1;

              if (includeActivity) {
                if (byLayerId[layer.id] === undefined) {
                  byLayerId[layer.id] = [activityDirective];
                } else {
                  byLayerId[layer.id].push(activityDirective);
                }

                if (byTimelineId[timeline.id] === undefined) {
                  byTimelineId[timeline.id] = [activityDirective];
                } else {
                  byTimelineId[timeline.id].push(activityDirective);
                }
              }
            }
          }
        }
      }
    }

    return { byLayerId, byTimelineId };
  },
);

export const allActivityDirectiveTags: Readable<string[]> = derived(activityDirectivesList, $activityDirectivesList => {
  const tagMap = $activityDirectivesList.reduce(
    (map: Record<string, boolean>, activityDirective: ActivityDirective) => {
      activityDirective.tags.forEach(tag => (map[tag] = true));
      return map;
    },
    {},
  );
  return Object.keys(tagMap).sort();
});

export const selectedActivityDirective = derived(
  [activityDirectivesMap, selectedActivityDirectiveId],
  ([$activityDirectivesMap, $selectedActivityDirectiveId]) =>
    $activityDirectivesMap[$selectedActivityDirectiveId] || null,
);

/* Helper Functions. */

export function selectActivity(
  activityDirectiveId: ActivityDirectiveId | null,
  spanId: SpanId | null,
  switchToTable = true,
): void {
  if (activityDirectiveId !== null && spanId === null) {
    selectedSpanId.set(null);
    selectedActivityDirectiveId.set(activityDirectiveId);
    if (switchToTable) {
      viewUpdateGrid({ middleComponentBottom: 'ActivityDirectivesTablePanel' });
    }
  } else if (activityDirectiveId === null && spanId !== null) {
    selectedSpanId.set(spanId);
    selectedActivityDirectiveId.set(null);
    if (switchToTable) {
      viewUpdateGrid({ middleComponentBottom: 'ActivitySpansTablePanel' });
    }
  } else {
    selectedSpanId.set(null);
    selectedActivityDirectiveId.set(null);
  }
}

export function resetActivityStores() {
  activityMetadataDefinitions.updateValue(() => []);
  activityDirectivesMap.set({});
  selectedActivityDirectiveId.set(null);
}
