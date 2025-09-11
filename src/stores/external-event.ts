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
import { convertDoyToYmd, convertUTCToMs, getIntervalInMs } from '../utilities/time';
import { selectedPlanDerivationGroupNames, sourcesUsingExternalEventTypes } from './external-source';
import { plan } from './plan';
import { gqlSubscribable } from './subscribable';
import { viewUpdateGrid } from './views';

/* Subscriptions. */
export const selectedExternalEventsRaw = gqlSubscribable<{ external_event: ExternalEventDB }[] | null | undefined>(
  gql.SUB_PLAN_EXTERNAL_EVENTS_DERIVATION_GROUP,
  { derivation_group_names: selectedPlanDerivationGroupNames },
  [],
  null,
);
export const externalEventTypes = gqlSubscribable<ExternalEventType[]>(gql.SUB_EXTERNAL_EVENT_TYPES, {}, [], null);

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

export const selectedExternalEvents: Readable<ExternalEvent[]> = derived(
  [selectedExternalEventsRaw, plan],
  ([$externalEventsRaw, $plan]) => {
    const completeExternalEvents: ExternalEvent[] = [];
    if ($externalEventsRaw !== null && $externalEventsRaw !== undefined) {
      // get plan bounds in an easily comparable format. The explicit strings are extreme bounds in case of a null plan.
      const planStartTime = convertUTCToMs(
        convertDoyToYmd($plan?.start_time_doy ?? '1970-001T00:00:00Z') ?? '1970-01-01T00:00:00Z',
      );
      const planEndTime = convertUTCToMs(
        convertDoyToYmd($plan?.end_time_doy ?? '2100-001T00:00:00Z') ?? '2100-01-01T00:00:00Z',
      );

      $externalEventsRaw.forEach(e => {
        // stored in this fashion as a byproduct of the GQL subscription query.
        const externalEvent = e.external_event;

        // check event is in plan bounds
        const externalEventStartTime = convertUTCToMs(externalEvent.start_time);
        const externalEventEndTime = externalEventStartTime + getIntervalInMs(externalEvent.duration);

        if (
          (externalEventStartTime >= planStartTime && externalEventStartTime <= planEndTime) ||
          (externalEventEndTime <= planEndTime && externalEventEndTime >= planStartTime)
        ) {
          completeExternalEvents.push({
            attributes: externalEvent.attributes,
            duration: externalEvent.duration,
            duration_ms: getIntervalInMs(externalEvent.duration),
            pkey: {
              derivation_group_name: externalEvent.derivation_group_name,
              event_type_name: externalEvent.event_type_name,
              key: externalEvent.key,
              source_key: externalEvent.source_key,
            },
            start_ms: convertUTCToMs(externalEvent.start_time),
            start_time: externalEvent.start_time,
          });
        }
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
