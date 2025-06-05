import type { SyntaxNode } from '@lezer/common';
import type {
  FswCommandArgument,
  FswCommandArgumentFixedString,
  FswCommandArgumentFloat,
  FswCommandArgumentInteger,
  FswCommandArgumentNumeric,
  FswCommandArgumentRepeat,
  FswCommandArgumentUnsigned,
  FswCommandArgumentVarString,
} from '@nasa-jpl/aerie-ampcs';
import type { SeqJson } from '@nasa-jpl/seq-json-schema/types';
import type { DictionaryTypes } from '../enums/dictionaryTypes';
import type { ISequenceAdaptation } from '../language-package/interfaces/legacy';
import type { UserId } from './app';

export type ChannelDictionaryMetadata = {
  type: DictionaryTypes.CHANNEL;
} & DictionaryMetadata;

export type CommandDictionaryMetadata = {
  type: DictionaryTypes.COMMAND;
} & DictionaryMetadata;

export type ParameterDictionaryMetadata = {
  type: DictionaryTypes.PARAMETER;
} & DictionaryMetadata;

export type SequenceAdaptationMetadata = {
  adaptation: ISequenceAdaptation;
  name: string;
  type: DictionaryTypes.ADAPTATION;
} & DictionaryMetadata;

export type DictionaryMetadata = {
  created_at: string;
  id: number;
  mission: string;
  path: string;
  updated_at: string;
  version: string;
};

export type Parcel = {
  channel_dictionary_id: number | null;
  command_dictionary_id: number;
  created_at: string;
  id: number;
  name: string;
  owner: UserId;
  sequence_adaptation_id: number | null;
  updated_at: string;
};

export type ParcelBundle = {
  command_dictionary_id: number | undefined;
} & Omit<Parcel, 'command_dictionary_id' | 'updated_at'>;

export type ParcelToParameterDictionary = {
  parameter_dictionary_id: number;
  parcel_id: number;
};

export type ParcelInsertInput = Omit<Parcel, 'created_at' | 'id' | 'owner' | 'updated_at'>;

export type GetSeqJsonResponseError = {
  location: {
    column: number;
    line: number;
  };
  message: string;
  stack: string;
};

export type GetSeqJsonResponse = {
  errors: GetSeqJsonResponseError[];
  seqJson: SeqJson;
  status: 'FAILURE' | 'SUCCESS';
};

export type UserSequence = {
  created_at: string;
  definition: string;
  id: number;
  is_locked: boolean;
  name: string;
  owner: UserId;
  parcel_id: number;
  seq_json: string;
  updated_at: string;
  workspace_id: number;
};

export type UserSequenceInsertInput = Omit<UserSequence, 'created_at' | 'id' | 'owner' | 'updated_at'>;

export type Workspace = {
  created_at: string;
  id: number;
  name: string;
  owner: UserId;
  updated_at: string;
};

export type TimeTagInfo = { node: SyntaxNode; text: string } | null | undefined;

export type StringArg = FswCommandArgumentVarString | FswCommandArgumentFixedString;

export type NumberArg =
  | FswCommandArgumentFloat
  | FswCommandArgumentInteger
  | FswCommandArgumentNumeric
  | FswCommandArgumentUnsigned;

export type ArgTextDef = {
  argDef?: FswCommandArgument;
  children?: ArgTextDef[];
  node?: SyntaxNode;
  parentArgDef?: FswCommandArgumentRepeat;
  text?: string;
};
