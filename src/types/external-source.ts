import type { SchemaObject } from 'ajv';
import type { ExternalEventDB, ExternalEventInsertInput, ExternalEventJson } from '../types/external-event';
import type { UserId } from './app';

// Represents all fields used as a composite primary key for merlin.external_source
export type ExternalSourcePkey = {
  derivation_group_name: string;
  key: string;
};

export type DerivationGroupId = string;
export type ExternalSourceTypeId = string;

// This is the type that conforms with the database schema. We don't really use it, as it is pretty heavyweight - instead we derive lighter types from it.
export type ExternalSourceDB = {
  attributes: object;
  created_at: string;
  derivation_group_name: string;
  end_time: string;
  external_events: ExternalEventDB[];
  key: string;
  owner: UserId;
  source_type_name: string;
  start_time: string;
  valid_at: string;
};

// This is the JSON type that the user can upload.
export type ExternalSourceJson = {
  events: ExternalEventJson[];
  source: {
    attributes: object;
    key: string;
    period: {
      end_time: string;
      start_time: string;
    };
    source_type_name: string;
    valid_at: string;
  };
};

// For use in retrieval of source information sans bulky items like event lists (see stores)
export type ExternalSourceSlim = Omit<ExternalSourceDB, 'external_events'>;

// Similar to ExternalSourceDB, but uses ExternalSourcePkey to represent the primary key (key, derivation_group_name)
export type ExternalSource = Omit<ExternalSourceDB, 'key' | 'derivation_group_name'> & { pkey: ExternalSourcePkey };

export type PlanDerivationGroup = {
  acknowledged: boolean;
  derivation_group_name: string;
  last_acknowledged_at: string;
  plan_id: number;
};

export type ExternalSourceEventTypeSchema = {
  event_types?: SchemaObject;
  source_types?: SchemaObject;
};

export type ExternalSourceType = {
  attribute_schema: SchemaObject;
  name: string;
};

export type ExternalSourceTypeAssociations = ExternalSourceType & {
  derivation_group_associations: number;
  source_associations: number;
};

export type ExternalSourceWithEventTypes = { key: string; types: string[] };

export type DerivationGroup = {
  derived_event_total: number;
  name: string;
  owner: UserId;
  source_type_name: string;
  sources: Map<string, { event_counts: number }>;
};

export type ExternalSourceInsertInput = {
  external_events: ExternalEventInsertInput[]; // updated after this map is created
  source: Pick<ExternalSourceDB, 'attributes' | 'derivation_group_name' | 'key' | 'source_type_name' | 'valid_at'> & {
    period: Pick<ExternalSourceDB, 'end_time' | 'start_time'>;
  };
};

export type DerivationGroupInsertInput = Pick<DerivationGroup, 'name' | 'source_type_name'>;

// Used to track whether a newly added source has been acknowledged or not for a given plan
export type DerivationGroupUpdateAckEntry = { derivation_group: string; last_acknowledged_at: string };
