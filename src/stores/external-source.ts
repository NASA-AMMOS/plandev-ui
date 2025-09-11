import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { UserId } from '../types/app';
import {
  type DerivationGroup,
  type ExternalSourceSlim,
  type ExternalSourceType,
  type ExternalSourceTypeAssociations,
  type ExternalSourceWithEventTypes,
  type PlanDerivationGroup,
} from '../types/external-source';
import gql from '../utilities/gql';
import { planId } from './plan';
import { gqlSubscribable } from './subscribable';

/* Writeable. */
export const creatingExternalSource: Writable<boolean> = writable(false);
export const createExternalSourceError: Writable<string | null> = writable(null);
export const createExternalSourceEventTypeError: Writable<string | null> = writable(null);
export const createDerivationGroupError: Writable<string | null> = writable(null);
export const derivationGroupPlanLinkError: Writable<string | null> = writable(null);
export const derivationGroupVisibilityMap: Writable<Record<DerivationGroup['name'], boolean>> = writable({});

/* Subscriptions. */
export const externalSources = gqlSubscribable<ExternalSourceSlim[]>(gql.SUB_EXTERNAL_SOURCES, {}, [], null);
export const externalSourceTypes = gqlSubscribable<ExternalSourceType[]>(gql.SUB_EXTERNAL_SOURCE_TYPES, {}, [], null);
export const derivationGroups = gqlSubscribable<DerivationGroup[]>(
  gql.SUB_DERIVATION_GROUPS,
  {},
  [],
  null,
  transformDerivationGroups,
);
export const planDerivationGroupLinks = gqlSubscribable<PlanDerivationGroup[]>(
  gql.SUB_PLAN_DERIVATION_GROUP,
  {
    plan_id: planId,
  },
  [],
  null,
);
export const sourcesUsingExternalEventTypes = gqlSubscribable<ExternalSourceWithEventTypes[]>(
  gql.SUB_EVENT_TYPES_IN_USE,
  {},
  [],
  null,
  transformSourcesUsingExternalEventTypes,
);

/* Derived. */
export const externalSourceTypeAssociations: Readable<ExternalSourceTypeAssociations[]> = derived(
  [externalSourceTypes, externalSources, derivationGroups],
  ([$externalSourceTypes, $externalSources, $derivationGroups]) => {
    return $externalSourceTypes.map(sourceType => {
      const sourceAssociations: number = $externalSources.filter(
        externalSource => externalSource.source_type_name === sourceType.name,
      ).length;
      const derivationGroupAssociations: number = $derivationGroups.filter(
        derivationGroup => derivationGroup.source_type_name === sourceType.name,
      ).length;
      return {
        ...sourceType,
        derivation_group_associations: derivationGroupAssociations,
        source_associations: sourceAssociations,
      };
    });
  },
);

// Reorganization of unacknowledged planDerivationGroupLinks so that it is easy to the derivation groups and when their updates were last acknowledged
export const derivationGroupsAcknowledged: Readable<Record<string, { last_acknowledged_at: string }>> = derived(
  planDerivationGroupLinks,
  $planDerivationGroupLinks => {
    const result: Record<string, { last_acknowledged_at: string }> = {};
    for (const entry of $planDerivationGroupLinks) {
      const { derivation_group_name, acknowledged, last_acknowledged_at } = entry;
      if (!acknowledged) {
        result[derivation_group_name] = { last_acknowledged_at };
      }
    }
    return result;
  },
);

export const selectedPlanDerivationGroupNames: Readable<string[]> = derived(
  [planDerivationGroupLinks],
  ([$planDerivationGroupLinks]) => $planDerivationGroupLinks.map(link => link.derivation_group_name),
);

/* Helper Functions. */
export function resetExternalSourceStores(): void {
  createExternalSourceError.set(null);
  createDerivationGroupError.set(null);
  derivationGroupPlanLinkError.set(null);
}

function transformDerivationGroups(
  derivationGroups:
    | {
        derived_events_aggregate: {
          aggregate: {
            count: number;
          };
        };
        external_sources: {
          external_events_aggregate: {
            aggregate: {
              count: number;
            };
          };
          key: string;
        }[];
        name: string;
        owner: UserId;
        source_type_name: string;
      }[]
    | null
    | undefined,
): DerivationGroup[] {
  const completeDerivationGroup: DerivationGroup[] = [];
  if (derivationGroups !== null && derivationGroups !== undefined) {
    derivationGroups.forEach(derivationGroup => {
      completeDerivationGroup.push({
        derived_event_total: derivationGroup.derived_events_aggregate.aggregate.count,
        name: derivationGroup.name,
        owner: derivationGroup.owner,
        source_type_name: derivationGroup.source_type_name,
        sources: new Map(
          derivationGroup.external_sources.reduce(
            (accumulatedSources, currentSource) => {
              const source_key = currentSource.key;
              const event_counts = currentSource.external_events_aggregate.aggregate.count;
              return [...accumulatedSources, [source_key, { event_counts }] as [string, { event_counts: number }]];
            },
            <[string, { event_counts: number }][]>[],
          ),
        ),
      });
    });
  }
  return completeDerivationGroup;
}

function transformSourcesUsingExternalEventTypes(
  external_source:
    | {
        external_events: {
          external_event_type: {
            name: string;
          };
        }[];
        key: string;
      }[]
    | undefined
    | null,
) {
  const results: { key: string; types: string[] }[] = [];

  if (external_source !== undefined && external_source !== null) {
    for (const source of external_source) {
      const key = source.key;
      const types: string[] = [];
      for (const external_event of source.external_events) {
        types.push(external_event.external_event_type.name);
      }
      results.push({ key, types });
    }
  }

  return results;
}
