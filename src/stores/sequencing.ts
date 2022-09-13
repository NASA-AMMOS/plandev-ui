import { writable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const commandDictionaries = gqlSubscribable<CommandDictionary[]>(gql.SUB_COMMAND_DICTIONARIES, {}, []);

export const userSequences = gqlSubscribable<UserSequence[]>(gql.SUB_USER_SEQUENCES, {}, []);

/* Writeable. */

export const userSequencesColumns: Writable<string> = writable('1fr 1px 2fr');

export const userSequencesRows: Writable<string> = writable('1fr 1px 1fr');
