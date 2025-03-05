import { writable, type Writable } from 'svelte/store';
import {
  type ExpandedTemplate,
  type SequenceFilter,
  type SequenceTemplate,
} from '../types/sequence-template';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';
import type { Status } from '../enums/status';
import type { ActivityType } from '../types/activity';

/* Writable */

export const planSequenceStatus: Writable<Status | null> = writable(null);

export const sequenceExpansionStatusStore: Writable<Status | null> = writable(null);

export const sequencingError: Writable<string | null> = writable(null);

export const modelId: Writable<number> = writable(-1);

/* Subscriptions. */

export const activityTypes = gqlSubscribable<ActivityType[]>(gql.SUB_ACTIVITY_TYPES, { modelId }, [], null);

export const expandedTemplates = gqlSubscribable<ExpandedTemplate[]>(gql.SUB_EXPANDED_TEMPLATES, {}, [], null);

export const sequenceFilters = gqlSubscribable<SequenceFilter[]>(gql.SUB_SEQUENCE_FILTERS, {}, [], null);

export const sequenceTemplates = gqlSubscribable<SequenceTemplate[]>(gql.SUB_SEQUENCE_TEMPLATES, {}, [], null);
