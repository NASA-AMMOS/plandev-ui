import type { Dictionary } from 'lodash';
import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type {
  ExternalEvent,
  ExternalEventDB,
  ExternalEventId,
  ExternalEventType,
  ExternalEventTypeAssociations,
} from '../types/external-event';
import { getExternalEventWholeRowId } from '../utilities/externalEvents';
import gql from '../utilities/gql';
import { convertUTCToMs, getIntervalInMs } from '../utilities/time';
import { selectedPlanDerivationGroupNames, sourcesUsingExternalEventTypes } from './external-source';
import { plan } from './plan';
import { gqlSubscribable } from './subscribable';
import { viewUpdateGrid } from './views';

const planStartDoy = derived(plan, $plan => $plan?.start_time_doy ?? '1970-001T00:00:00Z');
const planEndDoy = derived(plan, $plan => $plan?.end_time_doy ?? '2100-001T00:00:00Z');

/* Subscriptions. */
export const selectedExternalEventsRaw = gqlSubscribable<{ external_event: ExternalEventDB }[] | undefined>(
  gql.SUB_PLAN_EXTERNAL_EVENTS_DERIVATION_GROUP,
  {
    derivation_group_names: selectedPlanDerivationGroupNames,
    plan_end: planEndDoy,
    plan_start: planStartDoy,
  },
  [],
);
export const externalEventTypes = gqlSubscribable<ExternalEventType[]>(gql.SUB_EXTERNAL_EVENT_TYPES, {}, []);

// use to track which event is selected in the plan view, as this information is shared across several sibling panels
export const selectedExternalEventId: Writable<ExternalEventId | null> = writable(null);

/* Derived. */
export const externalEventTypeAssociations: Readable<ExternalEventTypeAssociations[]> = derived(
  [externalEventTypes, sourcesUsingExternalEventTypes],
  ([$externalEventTypes, $sourcesUsingExternalEventTypes]) => {
    return $externalEventTypes.map(eventType => {
      const sourceAssociations: number = $sourcesUsingExternalEventTypes.filter(externalSource =>
        externalSource.types.includes(eventType.name),
      ).length;
      return { ...eventType, source_associations: sourceAssociations };
    });
  },
);

export const externalEventTypeAssociationsLoading: Readable<boolean> = derived(
  [externalEventTypes.loading, sourcesUsingExternalEventTypes.loading],
  ([$externalEventTypesLoading, $sourcesUsingExternalEventTypesLoading]) => {
    return $externalEventTypesLoading || $sourcesUsingExternalEventTypesLoading;
  },
);

export const selectedExternalEvents: Readable<ExternalEvent[]> = derived(
  selectedExternalEventsRaw,
  $externalEventsRaw => {
    const completeExternalEvents: ExternalEvent[] = [];
    if ($externalEventsRaw !== null && $externalEventsRaw !== undefined) {
      $externalEventsRaw.forEach(e => {
        // stored in this fashion as a byproduct of the GQL subscription query.
        const externalEvent = e.external_event;
        completeExternalEvents.push({
          attributes: externalEvent.attributes,
          duration: externalEvent.duration,
          duration_ms: getIntervalInMs(externalEvent.duration),
          end_time: externalEvent.end_time,
          pkey: {
            derivation_group_name: externalEvent.derivation_group_name,
            event_type_name: externalEvent.event_type_name,
            key: externalEvent.key,
            source_key: externalEvent.source_key,
          },
          start_ms: convertUTCToMs(externalEvent.start_time),
          start_time: externalEvent.start_time,
        });
      });
    }
    return completeExternalEvents;
  },
);

export const externalEventsMap: Readable<Dictionary<ExternalEvent>> = derived(
  selectedExternalEvents,
  $externalEvents => {
    return keyBy($externalEvents, getExternalEventWholeRowId);
  },
);

export const selectedExternalEvent: Readable<ExternalEvent | null> = derived(
  [selectedExternalEventId, externalEventsMap],
  ([$selectedExternalEventId, $externalEventsMap]) => {
    if ($selectedExternalEventId !== null) {
      return $externalEventsMap[$selectedExternalEventId] || null;
    }
    return null;
  },
);

export function selectExternalEvent(
  externalEventId: ExternalEventId | null,
  switchToTable = true,
  switchToPanel = false,
): void {
  if (externalEventId !== null) {
    selectedExternalEventId.set(externalEventId);
    if (switchToTable) {
      viewUpdateGrid({ middleComponentBottom: 'ExternalEventsTablePanel' });
    }
    if (switchToPanel) {
      viewUpdateGrid({ rightComponentTop: 'ExternalEventFormPanel' });
    }
  } else {
    selectedExternalEventId.set(null);
  }
}
