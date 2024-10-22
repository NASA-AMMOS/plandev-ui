import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { UserId } from '../types/app';
import {
  type DerivationGroup,
  type ExternalSourceSlim,
  type ExternalSourceType,
  type PlanDerivationGroup,
} from '../types/external-source';
import gql from '../utilities/gql';
import { planId } from './plan';
import { gqlSubscribable } from './subscribable';

/* Writeable. */
export const parsingError: Writable<string | null> = writable(null);
export const creatingExternalSource: Writable<boolean> = writable(false);
export const createExternalSourceError: Writable<string | null> = writable(null);
export const createExternalSourceTypeError: Writable<string | null> = writable(null);
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

/* Derived. */
// reorganization of unacknowledged planDerivationGroupLinks so that it is easy to the derivation groups and when their updates were last acknowledged
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
  createExternalSourceTypeError.set(null);
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
