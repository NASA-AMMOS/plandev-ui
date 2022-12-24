import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivitiesByView, ActivitiesMap, Activity, ActivityDirective, ActivityUniqueId } from '../types/activity';
import type { ActivityMetadataDefinition } from '../types/activity-metadata';
import gql from '../utilities/gql';
import { planId } from './plan';
import { gqlSubscribable } from './subscribable';
import { view } from './views';

/* Subscriptions. */

export const activityDirectives = gqlSubscribable<ActivityDirective[]>(gql.SUB_ACTIVITY_DIRECTIVES, { planId }, []);

export const activityMetadataDefinitions = gqlSubscribable<ActivityMetadataDefinition[]>(
  gql.SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS,
  {},
  [],
);

/* Writeable. */

export const activitiesMap: Writable<ActivitiesMap> = writable({});

export const selectedActivityId: Writable<ActivityUniqueId | null> = writable(null);

/* Derived. */

export const activities: Readable<Activity[]> = derived(activitiesMap, $activitiesMap => Object.values($activitiesMap));

export const activitiesByView: Readable<ActivitiesByView> = derived([activities, view], ([$activities, $view]) => {
  const { definition } = $view;
  const { plan } = definition;
  const { timelines } = plan;
  const byLayerId: Record<number, Activity[]> = {};
  const byTimelineId: Record<number, Activity[]> = {};

  for (const activity of $activities) {
    for (const timeline of timelines) {
      const { rows } = timeline;

      for (const row of rows) {
        const { layers } = row;

        for (const layer of layers) {
          const { filter } = layer;

          if (filter.activity !== undefined) {
            const { activity: activityFilter } = filter;
            const { type } = activityFilter;
            const regExp = new RegExp(type);
            const includeActivity = regExp.test(activity.type);

            if (includeActivity) {
              if (byLayerId[layer.id] === undefined) {
                byLayerId[layer.id] = [activity];
              } else {
                byLayerId[layer.id].push(activity);
              }

              if (byTimelineId[timeline.id] === undefined) {
                byTimelineId[timeline.id] = [activity];
              } else {
                byTimelineId[timeline.id].push(activity);
              }
            }
          }
        }
      }
    }
  }

  return { byLayerId, byTimelineId };
});

export const allActivityTags: Readable<string[]> = derived(activities, $activities => {
  const tagMap = $activities.reduce((map: Record<string, boolean>, activity: Activity) => {
    activity.tags.forEach(tag => (map[tag] = true));
    return map;
  }, {});
  return Object.keys(tagMap).sort();
});

export const selectedActivity = derived(
  [activitiesMap, selectedActivityId],
  ([$activitiesMap, $selectedActivityId]) => $activitiesMap[$selectedActivityId] || null,
);

/* Helper Functions. */

export function resetActivityStores() {
  activityMetadataDefinitions.updateValue(() => []);
  activitiesMap.set({});
  selectedActivityId.set(null);
}
