import { derived, writable, type Writable } from 'svelte/store';
import type {
  ActivityDirectiveDB,
  ActivityDirectiveId,
  ActivityDirectiveValidationStatus,
  AnchorValidationStatus,
} from '../types/activity';
import type { ActivityMetadataDefinition } from '../types/activity-metadata';
import type { SpanId } from '../types/simulation';
import { computeActivityDirectivesMap } from '../utilities/activities';
import gql from '../utilities/gql';
import { initialPlan, planId } from './plan';
import { planSnapshotActivityDirectives, planSnapshotId } from './planSnapshots';
import { selectedSpanId, spansMap, spanUtilityMaps } from './simulation';
import { gqlSubscribable } from './subscribable';
import { viewUpdateGrid } from './views';

/* Subscriptions. */

export const activityDirectivesDB = gqlSubscribable<ActivityDirectiveDB[]>(
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

export const activityDirectiveValidationStatuses = gqlSubscribable<ActivityDirectiveValidationStatus[]>(
  gql.SUB_ACTIVITY_DIRECTIVE_VALIDATIONS,
  { planId },
  [],
  null,
);

/* Writeable. */

export const selectedActivityDirectiveId: Writable<ActivityDirectiveId | null> = writable(null);

/* Derived. */

export const activityDirectivesMap = derived(
  [activityDirectivesDB, planSnapshotId, planSnapshotActivityDirectives, initialPlan, spansMap, spanUtilityMaps],
  ([
    $activityDirectivesDB,
    $planSnapshotId,
    $planSnapshotActivityDirectives,
    $initialPlan,
    $spansMap,
    $spanUtilityMaps,
  ]) => {
    if ($initialPlan === null) {
      return {};
    }
    return computeActivityDirectivesMap(
      $planSnapshotId !== null ? $planSnapshotActivityDirectives : $activityDirectivesDB,
      $initialPlan,
      $spansMap,
      $spanUtilityMaps,
    );
  },
);

export const selectedActivityDirective = derived(
  [activityDirectivesMap, selectedActivityDirectiveId],
  ([$activityDirectivesMap, $selectedActivityDirectiveId]) => {
    if ($selectedActivityDirectiveId !== null) {
      return $activityDirectivesMap[$selectedActivityDirectiveId] || null;
    }
    return null;
  },
);

/* Helper Functions. */

export function selectActivity(
  activityDirectiveId: ActivityDirectiveId | null,
  spanId: SpanId | null,
  switchToTable = true,
  switchToPanel = false,
): void {
  if (activityDirectiveId !== null && spanId === null) {
    selectedSpanId.set(null);
    selectedActivityDirectiveId.set(activityDirectiveId);
    if (switchToTable) {
      viewUpdateGrid({ middleComponentBottom: 'ActivityDirectivesTablePanel' });
    }
    if (switchToPanel) {
      viewUpdateGrid({ rightComponentTop: 'ActivityFormPanel' });
    }
  } else if (activityDirectiveId === null && spanId !== null) {
    selectedSpanId.set(spanId);
    selectedActivityDirectiveId.set(null);
    if (switchToTable) {
      viewUpdateGrid({ middleComponentBottom: 'ActivitySpansTablePanel' });
    }
    if (switchToPanel) {
      viewUpdateGrid({ rightComponentTop: 'ActivityFormPanel' });
    }
  } else {
    selectedSpanId.set(null);
    selectedActivityDirectiveId.set(null);
  }
}

export function resetActivityStores() {
  activityMetadataDefinitions.updateValue(() => []);
  selectedActivityDirectiveId.set(null);
  activityDirectivesDB.updateValue(() => []);
  anchorValidationStatuses.updateValue(() => []);
  activityMetadataDefinitions.updateValue(() => []);
  activityDirectiveValidationStatuses.updateValue(() => []);
}
