import { keyBy, omitBy } from 'lodash-es';
import type { ActivityDirective, ActivityDirectiveDB, ActivityDirectivesMap, ActivityType } from '../types/activity';
import type { ActivityMetadata, ActivityMetadataKey, ActivityMetadataValue } from '../types/activity-metadata';
import type { BaseUser, User } from '../types/app';
import type { Plan } from '../types/plan';
import type { Span, SpanId, SpanUtilityMaps, SpansMap } from '../types/simulation';
import { getClipboardContent, setClipboardContent } from './clipboard';
import effects from './effects';
import { compare, isEmpty } from './generic';
import { reqHasura } from './requests';
import { pluralize } from './text';
import {
  getActivityDirectiveStartTimeMs,
  getDoyTime,
  getIntervalFromDoyRange,
  getIntervalInMs,
  getUnixEpochTime,
} from './time';
import { showFailureToast, showSuccessToast } from './toast';

// import { SimulateResponse } from '../types/simulation';

/**
 * Updates activity metadata with a new key/value and removes any empty values.
 */
export function getActivityMetadata(
  activityMetadata: ActivityMetadata | Record<ActivityMetadataKey, null>,
  key: ActivityMetadataKey,
  value: ActivityMetadataValue,
): ActivityMetadata {
  const newActivityMetadataEntry = { [key]: value };
  return omitBy({ ...activityMetadata, ...newActivityMetadataEntry }, isEmpty) as ActivityMetadata;
}

/**
 * Returns the root span for a given span id.
 */
export function getSpanRootParent(spansMap: SpansMap, spanId: SpanId | null): Span | null {
  if (spanId === null) {
    return null;
  }
  const span = spansMap[spanId];
  if (!span) {
    return null;
  }
  if (span.parent_id === null) {
    return span;
  }
  return getSpanRootParent(spansMap, span.parent_id);
}

export function createSpanUtilityMaps(spans: Span[]): SpanUtilityMaps {
  const spanUtilityMaps: SpanUtilityMaps = {
    directiveIdToSpanIdMap: {},
    spanIdToChildIdsMap: {},
    spanIdToDirectiveIdMap: {},
  };
  return spans.reduce((map, span) => {
    // Span Child mappings.
    if (map.spanIdToChildIdsMap[span.span_id] === undefined) {
      map.spanIdToChildIdsMap[span.span_id] = [];
    }
    if (span.parent_id !== null) {
      if (map.spanIdToChildIdsMap[span.parent_id] === undefined) {
        map.spanIdToChildIdsMap[span.parent_id] = [span.span_id];
      } else {
        map.spanIdToChildIdsMap[span.parent_id].push(span.span_id);
      }
    }

    // Span <-> Directive mappings.
    const directiveId = span.attributes?.directiveId;
    if (directiveId !== null && directiveId !== undefined) {
      map.directiveIdToSpanIdMap[directiveId] = span.span_id;
      map.spanIdToDirectiveIdMap[span.span_id] = directiveId;
    }
    return map;
  }, spanUtilityMaps);
}

/**
 * Returns all spans for a directive
 */
export function getAllSpansForActivityDirective(
  activityDirectiveId: number,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
): Span[] {
  const primarySpanId = spanUtilityMaps.directiveIdToSpanIdMap[activityDirectiveId];
  if (primarySpanId === undefined) {
    return [];
  }
  const childSpanIds = getAllSpanChildrenIds(primarySpanId, spanUtilityMaps);
  const allSpanIds = [primarySpanId, ...childSpanIds];
  return allSpanIds.map(spanId => spansMap[spanId]).sort(sortActivityDirectivesOrSpans);
}

/**
 * Returns the children IDs of a span
 */
export function getAllSpanChildrenIds(spanId: number, spanUtilityMaps: SpanUtilityMaps): number[] {
  const children = spanUtilityMaps.spanIdToChildIdsMap[spanId];
  if (children !== undefined && children.length) {
    return children.concat(...children.map(child => getAllSpanChildrenIds(child, spanUtilityMaps)));
  }
  return [];
}

/**
 * Sort function to sort activities in start time ascending order.
 */
export function sortActivityDirectivesOrSpans(a: ActivityDirective | Span, b: ActivityDirective | Span): number {
  const aStartOffsetMs = getIntervalInMs(a.start_offset);
  const bStartOffsetMs = getIntervalInMs(b.start_offset);
  if (aStartOffsetMs === bStartOffsetMs) {
    if ('span_id' in a && 'span_id' in b) {
      return compare((a as Span).span_id, (b as Span).span_id);
    } else if ('id' in a && 'id' in b) {
      return compare((a as ActivityDirective).id, (b as ActivityDirective).id);
    }
    throw 'You can only sort ActivityDirective or Span';
  }
  return compare(aStartOffsetMs, bStartOffsetMs);
}

export enum ActivityDeletionAction {
  ANCHOR_PLAN = 'anchor-plan',
  ANCHOR_ROOT = 'anchor-root',
  DELETE_CHAIN = 'delete-chain',
  NORMAL = 'regular-directive-delete',
}

export function computeActivityDirectivesMap(
  activityDirectiveDBs: ActivityDirectiveDB[],
  plan: Plan,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
) {
  // Compute initial map
  const directiveDBMap = keyBy(
    activityDirectiveDBs.map(d => ({ ...d, start_time_ms: null })),
    'id',
  );
  const cachedStartTimes = {};
  const activityDirectives = activityDirectiveDBs.map(activityDirectiveDB =>
    preprocessActivityDirectiveDB(
      activityDirectiveDB,
      directiveDBMap,
      plan,
      spansMap,
      spanUtilityMaps,
      cachedStartTimes,
    ),
  );
  return keyBy(activityDirectives, 'id');
}

export function preprocessActivityDirectiveDB(
  activityDirectiveDB: ActivityDirectiveDB,
  activityDirectivesMap: ActivityDirectivesMap,
  plan: Plan,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
  cachedStartTimes = {},
): ActivityDirective {
  let start_time_ms = null;
  if (plan && typeof plan.start_time === 'string') {
    start_time_ms = getActivityDirectiveStartTimeMs(
      activityDirectiveDB.id,
      plan.start_time,
      plan.end_time_doy,
      activityDirectivesMap,
      spansMap,
      spanUtilityMaps,
      cachedStartTimes,
    );
  }
  return { ...activityDirectiveDB, start_time_ms };
}

export function copyActivityDirectivesToClipboard(sourcePlan: Plan, activities: ActivityDirective[]) {
  const copiedActivityIds = new Set(activities.map(a => a.id));
  const clippedActivities = activities.map(activity => {
    const anchorInSelection = activity.anchor_id !== null && copiedActivityIds.has(activity.anchor_id);
    return {
      anchor_id: anchorInSelection ? activity.anchor_id : null,
      anchored_to_start: activity.anchored_to_start,
      arguments: activity.arguments,
      id: activity.id,
      name: activity.name,
      start_offset: activity.anchor_id !== null && !anchorInSelection ? '0' : activity.start_offset,
      start_time_ms: activity.start_time_ms,
      tags: activity.tags,
      type: activity.type,
    };
  });

  const clipboard = {
    activities: clippedActivities,
    sourcePlan: sourcePlan.id,
    type: `aerie_activity_directives`,
  };

  const noun = `Activity Directive${activities.length === 1 ? '' : 's'}`;
  setClipboardContent(
    clipboard,
    () => showSuccessToast(`Copied ${activities.length} ${noun}`),
    () => showFailureToast(`Failed to copy ${activities.length} ${noun}`),
  );
}

export function getPasteActivityDirectivesText(count: number): string {
  if (count <= 0) {
    return `Paste Activity Directives`; //generic text, disabled context menu
  } else {
    return `Paste ${count} Activity Directive${pluralize(count)}`;
  }
}

export async function getActivityDirectivesClipboardCount(): Promise<number> {
  try {
    const clipboardContent = await getClipboardContent();
    if (clipboardContent !== undefined) {
      const clipboard = JSON.parse(clipboardContent);
      if (clipboard.type === 'aerie_activity_directives' && clipboard.activities !== undefined) {
        return clipboard.activities.length;
      }
    }
  } catch (e) {
    //throws error when we have some other generic item in our clipboard (not json). but just need to catch it.
  }
  return -1;
}

export async function getActivityDirectivesToPaste(
  destinationPlan: Plan,
  pasteStartingAtTime?: number,
): Promise<ActivityDirective[]> {
  let activities: ActivityDirective[] = [];
  try {
    const serializedClipboard = await getClipboardContent();
    if (serializedClipboard !== undefined) {
      const clipboard = JSON.parse(serializedClipboard);
      activities = clipboard.activities;

      const starts: number[] = [];
      activities.forEach(a => {
        //unachored activities are the ones we're trying to place relative to each other in time, anchored will be calculated from offset
        if (a.anchor_id === null && a.start_time_ms !== null) {
          starts.push(a.start_time_ms);
        }
      });

      //bounded by plan start and plan end
      const planStart = getUnixEpochTime(destinationPlan.start_time_doy);
      const planEnd = getUnixEpochTime(destinationPlan.end_time_doy);
      const earliestStart = Math.min(...starts);
      if (earliestStart < planStart || earliestStart > planEnd) {
        pasteStartingAtTime = planStart; //if out of bounds, paste starting at the start of the plan.
      }

      //transpose in time if we're given a time or if it was out of bounds
      let diff = 0;
      if (typeof pasteStartingAtTime === 'number') {
        diff = pasteStartingAtTime - earliestStart;
      }

      activities.forEach(activity => {
        if (activity.start_time_ms !== null) {
          //anchored activities don't need offset to be updated
          if (activity.anchor_id === null) {
            activity.start_time_ms += diff;
            const startTimeDoy = getDoyTime(new Date(activity.start_time_ms));
            activity.start_offset = getIntervalFromDoyRange(destinationPlan.start_time_doy, startTimeDoy);
          }
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
  return activities;
}

export async function fetchSimulatedActivityDuration(
  planId: number,
  activityId: number,
  user: BaseUser | User | null,
): Promise<number | null> {
  const query = `
    query MyQuery($_eq: Int!, $_eq1: Int!) {
      activity_directive(where: {plan_id: {_eq: $_eq}, id: {_eq: $_eq1}}) {
        simulated_activities(order_by: {simulation_dataset_id: desc}){
          duration
        }
      }
    }
  `;
  const variables = { _eq: planId, _eq1: activityId };
  const data = await reqHasura(query, variables, user);
  const activities = data?.activity_directive?.[0]?.simulated_activities;
  console.error('Duration Format:', activities[0].duration, 'for activity', activityId);
  return activities && activities.length > 0 ? durationToUs(activities[0].duration) : null;
}

/**
 * Converts a string of the form "HH:mm:ss.SSSSSS" to microseconds.
 * Example: "01:23:45.678901" => 1*3600*1e6 + 23*60*1e6 + 45*1e6 + 678901 = 5025678901
 */
export function offsetToUs(hms: string): number {
  const match = /^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(hms);
  if (!match) {
    throw new Error('Invalid format, expected "HH:mm:ss[.SSSSSS]"' + hms);
  }
  const [, hh, mm, ss, us = '0'] = match;
  return parseInt(hh) * 3600 * 1e6 + parseInt(mm) * 60 * 1e6 + parseInt(ss) * 1e6 + parseInt(us);
}

/**
 * Converts a string of the form "[N days ]HH:mm:ss[.SSSSSS]" to microseconds.
 * Examples:
 *   "2 days 01:23:45.678901" => (2*86400 + 1*3600 + 23*60 + 45) * 1e6 + 678901
 *   "01:23:45.678901"        => (1*3600 + 23*60 + 45) * 1e6 + 678901
 *   "2 days 01:23:45"        => (2*86400 + 1*3600 + 23*60 + 45) * 1e6
 *   "01:23:45"               => (1*3600 + 23*60 + 45) * 1e6
 */
export function durationToUs(duration: string): number {
  const match = /^(?:(\d+)\s+days?)?(?:\s*(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/.exec(duration.trim());
  if (!match) {
    throw new Error('Invalid format, expected "[N days ]HH:mm:ss[.SSSSSS]"' + duration);
  }
  const [, days = '0', hh = '0', mm = '0', ss = '0', us = '0'] = match;

  return (
    parseInt(days) * 86400 * 1e6 +
    parseInt(hh) * 3600 * 1e6 +
    parseInt(mm) * 60 * 1e6 +
    parseInt(ss) * 1e6 +
    parseInt(us)
  );
}

export async function findTypes(
  type: string,
  activityTypesPromise: Promise<ActivityType[]>,
): Promise<ActivityType | undefined> {
  const activityTypes = await activityTypesPromise;
  for (let idx = 0; idx < activityTypes.length; idx++) {
    if (activityTypes[idx].name === type) {
      return activityTypes[idx];
    }
  }
  console.warn(`Activity type ${type} not found in activity types`);
  return undefined;
}

/**
 * Converts microseconds to a string of the form "HH:mm:ss.SSSSSS".
 * Example: 5025678901 => "01:23:45.678901"
 */
export function usToOffset(us: number): string {
  const isNegative = us < 0;
  us = Math.abs(us);

  const hours = Math.floor(us / 3_600_000_000);
  us %= 3_600_000_000;
  const minutes = Math.floor(us / 60_000_000);
  us %= 60_000_000;
  const seconds = Math.floor(us / 1_000_000);
  us %= 1_000_000;
  const micro = us;

  const pad = (n: number, len: number) => n.toString().padStart(len, '0');
  const result = `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${micro.toString()}`;
  return isNegative ? `-${result}` : result;
}

export async function fetchSimulationDatasetIdsForPlan(planId: number, user: BaseUser | User | null): Promise<number> {
  const query = `
    query MyQuery($id: Int!) {
      plan_by_pk(id: $id) {
        simulations {
          simulation_dataset {
            id
          }
        }
      }
    }
  `;
  const variables = { id: planId };
  const data = await reqHasura(query, variables, user);
  const simulations = data?.plan_by_pk?.simulations;
  if (!simulations) {
    showFailureToast('Must simulate before packing activities');
    throw new Error('must simulate before packing activities');
  }
  const datasetIds = simulations
    .map((sim: any) => sim.simulation_dataset?.id)
    .filter((id: number | null | undefined) => typeof id === 'number');
  return datasetIds.length > 0 ? datasetIds[0] : -1;
}

export async function packActivityDirectivesInPlanRevamp(
  sourcePlan: Plan,
  activities: ActivityDirective[],
  user: BaseUser | User | null,
): Promise<ActivityDirective[] | void> {
  const planId = sourcePlan.id;

  const idToActivitiesMap = new Map<number, ActivityDirective>();
  for (const activity of activities) {
    idToActivitiesMap.set(activity.id, activity);
  }

  const anchorIds = new Map<number, number | null>();
  for (const activity of activities) {
    anchorIds.set(activity.id, activity.anchor_id);
  }

  const activitiesDirectivesDB = await effects.getActivitiesForPlan(
    planId,
    user && 'activeRole' in user ? (user as User) : null,
  );

  const datasetId = await fetchSimulationDatasetIdsForPlan(planId, user);

  const spansMap = await effects.getSpans(
    datasetId,
    sourcePlan.start_time_doy,
    user && 'activeRole' in user ? (user as User) : null,
    undefined,
  );

  const spanUtilityMaps = createSpanUtilityMaps(Object.values(spansMap));

  const activityDirectivesMap = computeActivityDirectivesMap(
    activitiesDirectivesDB,
    sourcePlan,
    spansMap,
    spanUtilityMaps,
  );

  console.log('Activity Directives Map:');
  for (const [key, value] of Object.entries(activityDirectivesMap)) {
    console.log(`${key}: ${value}`);
  }

  // Sort activities by their start times
  activities.sort(sortActivityDirectivesOrSpans);

  // Map activity ids to their absolute start times in milliseconds
  // const initialStartTimes = new Map<number, number>();
  const planStartTimeMs = getUnixEpochTime(sourcePlan.start_time_doy);
  const activityStartTimeMs = getActivityDirectiveStartTimeMs(
    activities[0].id,
    sourcePlan.start_time,
    sourcePlan.end_time_doy,
    activityDirectivesMap,
    spansMap,
    spanUtilityMaps,
  );
  const initialStartTime = (activityStartTimeMs - planStartTimeMs) * 1000; // Convert to microseconds

  // Grab all durations for the activities and store in a Map
  const durations = new Map<number, number>();
  try {
    const durationResults = await Promise.all(activities.map(a => fetchSimulatedActivityDuration(planId, a.id, user)));
    for (let i = 0; i < activities.length; i++) {
      if (durationResults[i] == null) {
        showFailureToast('You must simulate activities before packing');
        return;
      }
      durations.set(activities[i].id, durationResults[i] as number);
    }
  } catch (err) {
    showFailureToast('You must simulate before packing activities');
    return;
  }

  // Calculate new start times after packing based on the initial start times and durations
  const newStartTimes = new Map<number, number>();
  let postPackingTime = initialStartTime;
  if (postPackingTime === undefined) {
    throw new Error(`Activity ${activities[0].id} not found in initial start times`);
  }

  for (const activity of activities) {
    newStartTimes.set(activity.id, postPackingTime);
    postPackingTime += durations.get(activity.id)!;
  }

  // Calculate the new start offsets based on the anchor activities
  const cachedStartTimes: { [activityDirectiveId: number]: number } = {};
  function updateAnchorStartOffset(anchorId: number, activityId: number): string {
    let anchorStartTime;
    if (newStartTimes.has(anchorId)) {
      anchorStartTime = newStartTimes.get(anchorId)!;
    } else {
      anchorStartTime =
        (getActivityDirectiveStartTimeMs(
          anchorId,
          sourcePlan.start_time,
          sourcePlan.end_time_doy,
          activityDirectivesMap,
          spansMap,
          spanUtilityMaps,
          cachedStartTimes,
        ) -
          planStartTimeMs) *
        1000; // Convert to microseconds
    }
    const activityStartTime = newStartTimes.get(activityId)!;
    return usToOffset(activityStartTime - anchorStartTime);
  }

  // Update each activity directive with the new start offset
  for (const activity of activities) {
    if (activity.anchor_id !== null) {
      activity.start_offset = updateAnchorStartOffset(activity.anchor_id, activity.id);
    } else {
      activity.start_offset = usToOffset(newStartTimes.get(activity.id)!);
    }

    if (activity.id in anchorIds) {
      // This activity is an anchor, so we need to update its "anchee" (activities connected to it).
      const connectedActivityIds = Array.from(anchorIds.entries())
        .filter(([_, anchorId]) => anchorId === activity.id)
        .map(([id, _]) => id);

      for (const connectedActivityId of connectedActivityIds) {
        const connectedActivity = idToActivitiesMap.get(connectedActivityId);
        if (connectedActivity) {
          connectedActivity.start_offset = updateAnchorStartOffset(activity.id, connectedActivity.id);
        }
      }
    }
  }

  const activityTypes = effects.getActivityTypes(
    sourcePlan.model_id,
    user && 'activeRole' in user ? (user as User) : null,
  );

  for (let idx = 0; idx < activities.length; idx++) {
    const activityType = await findTypes(activities[idx].type, activityTypes);
    await effects.updateActivityDirective(
      sourcePlan,
      activities[idx].id,
      { start_offset: activities[idx].start_offset },
      activityType || null,
      user && 'activeRole' in user ? (user as User) : null,
    );
  }
  return activities;
}

export async function packLeftActivityDirectivesInPlan(
  sourcePlan: Plan,
  activities: ActivityDirective[],
  user: BaseUser | User | null,
): Promise<ActivityDirective[] | void> {
  const planId = sourcePlan.id;
  console.log('Plan start time:', sourcePlan.start_time_doy);
  console.log('Plan end time:', sourcePlan.end_time_doy);

  const anchorIds = new Set(activities.map(a => a.anchor_id));
  if (anchorIds.size > 1) {
    showFailureToast(`Activities must have the same anchor to pack`);
    return;
  }

  if (activities.some(a => a.start_time_ms === null)) {
    showFailureToast('Some selected activities do not have a start time');
    return;
  }

  activities.sort(sortActivityDirectivesOrSpans);
  // const spansMap = effects.getSpans(,sourcePlan.start_time_doy, user && 'activeRole' in user ? (user as User) : undefined);

  let durations: (number | null)[];
  try {
    durations = await Promise.all(activities.map(a => fetchSimulatedActivityDuration(planId, a.id, user)));
  } catch (err) {
    showFailureToast('You must simulate before packing activities');
    return;
  }

  if (durations.some(d => d === null)) {
    showFailureToast('You must simulate activities before packing');
    return;
  }

  const durationNum = durations.map(d => d as number);

  let cumulativeOffsetMs = offsetToUs(activities[0].start_offset);
  for (let idx = 0; idx < activities.length; idx++) {
    activities[idx].start_offset = usToOffset(cumulativeOffsetMs);
    cumulativeOffsetMs += durationNum[idx];
  }

  const activityTypes = effects.getActivityTypes(
    sourcePlan.model_id,
    user && 'activeRole' in user ? (user as User) : null,
  );

  for (let idx = 0; idx < activities.length; idx++) {
    const activityType = await findTypes(activities[idx].type, activityTypes);
    await effects.updateActivityDirective(
      sourcePlan,
      activities[idx].id,
      { start_offset: activities[idx].start_offset },
      activityType || null,
      user && 'activeRole' in user ? (user as User) : null,
    );
  }
  return activities;
}

export async function packRightActivityDirectivesInPlan(
  sourcePlan: Plan,
  activities: ActivityDirective[],
  user: BaseUser | User | null,
): Promise<ActivityDirective[] | void> {
  const planId = sourcePlan.id;

  const anchorIds = new Set(activities.map(a => a.anchor_id));
  if (anchorIds.size > 1) {
    showFailureToast(`Activities must have the same anchor to pack`);
    return;
  }

  if (activities.some(a => a.start_time_ms === null)) {
    showFailureToast('Some selected activities do not have a start time');
    return;
  }

  activities.sort(sortActivityDirectivesOrSpans);
  activities.reverse(); // Reverse to pack from the right

  let durations: (number | null)[];
  try {
    durations = await Promise.all(activities.map(a => fetchSimulatedActivityDuration(planId, a.id, user)));
  } catch (err) {
    showFailureToast('You must simulate before packing activities');
    return;
  }

  if (durations.some(d => d === null)) {
    showFailureToast('You must simulate all activities before packing');
    return;
  }

  const durationNum = durations.map(d => d as number);

  let cumulativeOffsetMs = offsetToUs(activities[0].start_offset);
  for (let idx = 1; idx < activities.length; idx++) {
    cumulativeOffsetMs -= durationNum[idx];
    activities[idx].start_offset = usToOffset(cumulativeOffsetMs);
  }

  const activityTypes = effects.getActivityTypes(
    sourcePlan.model_id,
    user && 'activeRole' in user ? (user as User) : null,
  );

  for (let idx = activities.length - 1; idx >= 0; idx--) {
    const activityType = await findTypes(activities[idx].type, activityTypes);
    await effects.updateActivityDirective(
      sourcePlan,
      activities[idx].id,
      { start_offset: activities[idx].start_offset },
      activityType || null,
      user && 'activeRole' in user ? (user as User) : null,
    );
  }
}
