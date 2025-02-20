// import type {
//   ChannelDictionary as AmpcsChannelDictionary,
//   CommandDictionary as AmpcsCommandDictionary,
//   ParameterDictionary as AmpcsParameterDictionary,
// } from '@nasa-jpl/aerie-ampcs';
// import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
// import type { User } from '../types/app';
// import {
//   type ChannelDictionary,
//   type CommandDictionary,
//   type ParameterDictionary,
//   type Parcel,
//   type ParcelBundle,
//   type ParcelToParameterDictionary,
//   type UserSequence,
//   type Workspace,
// } from '../types/sequencing';
// import effects from '../utilities/effects';
// import gql from '../utilities/gql';
// import { gqlSubscribable } from './subscribable';

import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { Action, ActionRun } from '../types/actions';

// /* Writable */

// // export const parsedChannelDictionaries: Writable<Record<string, AmpcsChannelDictionary>> = writable({});

// // export const parsedCommandDictionaries: Writable<Record<string, AmpcsCommandDictionary>> = writable({});

// // export const parsedParameterDictionaries: Writable<Record<string, AmpcsParameterDictionary>> = writable({});

// /* Subscriptions. */

// export const channelDictionaries = gqlSubscribable<ChannelDictionary[]>(gql.SUB_CHANNEL_DICTIONARIES, {}, [], null);

// export const commandDictionaries = gqlSubscribable<CommandDictionary[]>(gql.SUB_COMMAND_DICTIONARIES, {}, [], null);

// export const parameterDictionaries = gqlSubscribable<ParameterDictionary[]>(
//   gql.SUB_PARAMETER_DICTIONARIES,
//   {},
//   [],
//   null,
// );

// export const parcelToParameterDictionaries = gqlSubscribable<ParcelToParameterDictionary[]>(
//   gql.SUB_PARCEL_TO_PARAMETER_DICTIONARIES,
//   {},
//   [],
//   null,
// );

// export const parcels = gqlSubscribable<Parcel[]>(gql.SUB_PARCELS, {}, [], null);

// export const parcelBundles: Readable<ParcelBundle[]> = derived(
//   [parcels, parcelToParameterDictionaries, commandDictionaries],
//   ([$parcels, $parcelToParameterDictionaries, $commandDictionaries]) => {
//     if (!$parcels || !$parcelToParameterDictionaries) {
//       return [];
//     }
//     return $parcels.map(parcel => {
//       const parameterDictionaryIds = $parcelToParameterDictionaries
//         .filter(parcelToParameterDictionary => parcelToParameterDictionary.parcel_id === parcel.id)
//         .map(parcelToParameterDictionary => parcelToParameterDictionary.parameter_dictionary_id);

//       const commandDictionary = $commandDictionaries.find(
//         commandDictionary => commandDictionary.id === parcel.command_dictionary_id,
//       )?.id;

//       return {
//         channel_dictionary_id: parcel.channel_dictionary_id,
//         command_dictionary_id: commandDictionary,
//         created_at: parcel.created_at,
//         id: parcel.id,
//         name: parcel.name,
//         owner: parcel.owner,
//         parameter_dictionary_ids: parameterDictionaryIds,
//         sequence_adaptation_id: parcel.sequence_adaptation_id,
//       };
//     });
//   },
// );

// export const userParcelColumns: Writable<string> = writable('2fr 3px 1fr');

// export const userSequences = gqlSubscribable<UserSequence[]>(gql.SUB_USER_SEQUENCES, {}, [], null);

// export const workspaces = gqlSubscribable<Workspace[]>(gql.SUB_WORKSPACES, {}, [], null);

// /* Writeable. */

export const actionsColumns: Writable<string> = writable('.75fr 3px 1.5fr');

export const actions: Writable<Action[]> = writable([
  { actionJS: 'some code 1', description: 'Description 1', id: 1, name: 'Action 1' },
  { actionJS: 'some code 2', description: 'Description 2', id: 2, name: 'Action 2' },
]);

export const actionRuns: Writable<ActionRun[]> = writable([
  {
    actionId: 1,
    id: 1,
    response: {
      console: { debug: [], error: [], info: [], log: [], warn: [] },
      errors: null,
      results: { data: { var1: 'Foo', var2: 'Bar' }, status: 'SUCCESS' },
    },
    user: 'aplave',
  },
  {
    actionId: 2,
    id: 2,
    response: {
      console: { debug: [], error: [], info: [], log: [], warn: [] },
      errors: {
        cause: 'sdfsdf',
        message: 'This failed because...',
        stack: 'Stacktrace...',
      },
      results: null,
    },
    user: 'aplave',
  },
]);

/* Derived */
export const actionsMap: Readable<Record<number, Action>> = derived(actions, $actions => {
  return keyBy($actions, 'id');
});
