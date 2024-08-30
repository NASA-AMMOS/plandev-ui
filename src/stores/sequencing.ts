import type {
  ChannelDictionary as AmpcsChannelDictionary,
  CommandDictionary as AmpcsCommandDictionary,
  ParameterDictionary as AmpcsParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import type { User } from '../types/app';
import {
  type ChannelDictionary,
  type CommandDictionary,
  type ParameterDictionary,
  type Parcel,
  type ParcelBundle,
  type ParcelToParameterDictionary,
  type UserSequence,
  type Workspace,
} from '../types/sequencing';
import effects from '../utilities/effects';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writable */

export const parsedChannelDictionaries: Writable<Record<string, AmpcsChannelDictionary>> = writable({});

export const parsedCommandDictionaries: Writable<Record<string, AmpcsCommandDictionary>> = writable({});

export const parsedParameterDictionaries: Writable<Record<string, AmpcsParameterDictionary>> = writable({});

/* Subscriptions. */

export const channelDictionaries = gqlSubscribable<ChannelDictionary[]>(gql.SUB_CHANNEL_DICTIONARIES, {}, [], null);

export const commandDictionaries = gqlSubscribable<CommandDictionary[]>(gql.SUB_COMMAND_DICTIONARIES, {}, [], null);

export const parameterDictionaries = gqlSubscribable<ParameterDictionary[]>(
  gql.SUB_PARAMETER_DICTIONARIES,
  {},
  [],
  null,
);

export const parcelToParameterDictionaries = gqlSubscribable<ParcelToParameterDictionary[]>(
  gql.SUB_PARCEL_TO_PARAMETER_DICTIONARIES,
  {},
  [],
  null,
);

export const parcels = gqlSubscribable<Parcel[]>(gql.SUB_PARCELS, {}, [], null);

export const parcelBundles: Readable<ParcelBundle[]> = derived(
  [parcels, parcelToParameterDictionaries, commandDictionaries],
  ([$parcels, $parcelToParameterDictionaries, $commandDictionaries]) => {
    if (!$parcels || !$parcelToParameterDictionaries) {
      return [];
    }
    return $parcels.map(parcel => {
      const parameterDictionaryIds = $parcelToParameterDictionaries
        .filter(parcelToParameterDictionary => parcelToParameterDictionary.parcel_id === parcel.id)
        .map(parcelToParameterDictionary => parcelToParameterDictionary.parameter_dictionary_id);

      const commandDictionary = $commandDictionaries.find(
        commandDictionary => commandDictionary.id === parcel.command_dictionary_id,
      )?.id;

      return {
        channel_dictionary_id: parcel.channel_dictionary_id,
        command_dictionary_id: commandDictionary,
        created_at: parcel.created_at,
        id: parcel.id,
        name: parcel.name,
        owner: parcel.owner,
        parameter_dictionary_ids: parameterDictionaryIds,
        sequence_adaptation_id: parcel.sequence_adaptation_id,
      };
    });
  },
);

export const userParcelColumns: Writable<string> = writable('2fr 3px 1fr');

export const userSequences = gqlSubscribable<UserSequence[]>(gql.SUB_USER_SEQUENCES, {}, [], null);

export const workspaces = gqlSubscribable<Workspace[]>(gql.SUB_WORKSPACES, {}, [], null);

/* Writeable. */

export const userSequencesColumns: Writable<string> = writable('.75fr 3px 1.5fr 3px 1fr');

export const userSequenceFormColumns: Writable<string> = writable('1fr 3px 2fr');

export const userSequenceEditorColumns: Writable<string> = writable('3fr 3px');

export const userSequenceEditorColumnsWithFormBuilder: Writable<string> = writable('3fr 3px 1fr');

/* Helper Functions */

export async function getParsedChannelDictionary(
  unparsedChannelDictionary: ChannelDictionary,
  user: User | null,
): Promise<AmpcsChannelDictionary | null> {
  const id = generateId(unparsedChannelDictionary.id, unparsedChannelDictionary.updated_at);
  let channelDictionary: AmpcsChannelDictionary | null = get(parsedChannelDictionaries)[id];

  if (channelDictionary === null || channelDictionary === undefined) {
    channelDictionary = await effects.getParsedAmpcsChannelDictionary(unparsedChannelDictionary.id, user);

    if (channelDictionary !== null) {
      parsedChannelDictionaries.set({
        ...get(parsedChannelDictionaries),
        [id]: channelDictionary,
      });
    }
  }

  return channelDictionary;
}

export async function getParsedCommandDictionary(
  unparsedCommandDictionary: CommandDictionary,
  user: User | null,
): Promise<AmpcsCommandDictionary | null> {
  const id = generateId(unparsedCommandDictionary.id, unparsedCommandDictionary.updated_at);
  let commandDictionary: AmpcsCommandDictionary | null = get(parsedCommandDictionaries)[id];

  if (commandDictionary === null || commandDictionary === undefined) {
    commandDictionary = await effects.getParsedAmpcsCommandDictionary(unparsedCommandDictionary.id, user);

    if (commandDictionary !== null) {
      parsedCommandDictionaries.set({
        ...get(parsedCommandDictionaries),
        [id]: commandDictionary,
      });
    }
  }

  return commandDictionary;
}

export async function getParsedParameterDictionary(
  unparsedParameterDictionary: ParameterDictionary,
  user: User | null,
): Promise<AmpcsParameterDictionary | null> {
  const id = generateId(unparsedParameterDictionary.id, unparsedParameterDictionary.updated_at);
  let parameterDictionary: AmpcsParameterDictionary | null = get(parsedParameterDictionaries)[id];

  if (parameterDictionary === null || parameterDictionary === undefined) {
    parameterDictionary = await effects.getParsedAmpcsParameterDictionary(unparsedParameterDictionary.id, user);

    if (parameterDictionary !== null) {
      parsedParameterDictionaries.set({
        ...get(parsedParameterDictionaries),
        [id]: parameterDictionary,
      });
    }
  }

  return parameterDictionary;
}

function generateId(id: number, updatedAt: string): string {
  return `${id.toString()}_${updatedAt}`;
}
