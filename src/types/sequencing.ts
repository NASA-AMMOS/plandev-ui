import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { IndentContext } from '@codemirror/language';
import type { Diagnostic } from '@codemirror/lint';
import type { SyntaxNode, Tree } from '@lezer/common';
import type {
  ChannelDictionary as AmpcsChannelDictionary,
  CommandDictionary as AmpcsCommandDictionary,
  ParameterDictionary as AmpcsParameterDictionary,
  FswCommandArgument,
  FswCommandArgumentFixedString,
  FswCommandArgumentFloat,
  FswCommandArgumentInteger,
  FswCommandArgumentNumeric,
  FswCommandArgumentRepeat,
  FswCommandArgumentUnsigned,
  FswCommandArgumentVarString,
} from '@nasa-jpl/aerie-ampcs';
import type { SeqJson, VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import type { DictionaryTypes } from '../enums/dictionaryTypes';
import type { SequenceTypes } from '../enums/sequencing';
import type { ArgDelegator } from '../utilities/sequence-editor/extension-points';
import type { UserId } from './app';
import type { GlobalType } from './global-type';

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

export interface IOutputFormat {
  compile?: (output: string) => Promise<void>; // TODO do we use `compile`? Why does it belong to `IOutputFormat` instead of the top-level adaptation? Actions job now?
  fileExtension: string;
  linter?: ( // TODO do we _really_ need a linter for the output format?
    diagnostics: Diagnostic[],
    commandDictionary: AmpcsCommandDictionary,
    view: EditorView,
    node: SyntaxNode,
  ) => Diagnostic[];
  name: string;
  toOutputFormat?(
    tree: any,
    sequence: string,
    commandDictionary: AmpcsCommandDictionary | null,
    sequenceName: string,
  ): Promise<string>;
}

export interface IInputFormat {
  linter?: (
    diagnostics: Diagnostic[],
    commandDictionary: AmpcsCommandDictionary,
    view: EditorView,
    node: SyntaxNode,
  ) => Diagnostic[];
  name: string;
  toInputFormat?(input: string): Promise<string>;
}

export interface PhoenixContext { // TODO consider a unified interface for all this global sequencing context we pass around
  dictionaries: (AmpcsChannelDictionary | AmpcsCommandDictionary)[];
  librarySequences: LibrarySequence[];
}

export interface ISequenceAdaptation { // TODO add CommandInfoMapper here
  argDelegator?: ArgDelegator;
  autoComplete: ( // TODO investigate whether we can, instead of defining our own interfaces for all the codemirror features, just pass an editor to be configured by the adaptation
    channelDictionary: AmpcsChannelDictionary | null,
    commandDictionary: AmpcsCommandDictionary | null,
    parameterDictionaries: AmpcsParameterDictionary[],
    librarySequences: LibrarySequence[],
  ) => (context: CompletionContext) => CompletionResult | null;
  autoIndent?: () => (context: IndentContext, pos: number) => number | null | undefined;
  globals?: GlobalType[]; // TODO do we need globals to be known outside the adaptation?
  inputFormat: IInputFormat;
  modifyOutput?: (
    output: string,
    parameterDictionaries: AmpcsParameterDictionary[],
    channelDictionary: AmpcsChannelDictionary | null,
  ) => any;
  modifyOutputParse?: (
    output: string,
    parameterDictionaries: AmpcsParameterDictionary[],
    channelDictionary: AmpcsChannelDictionary | null,
  ) => any;
  outputFormat?: IOutputFormat; // TODO why did we previously allow multiple output formats?
}

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

export type LibrarySequence = {
  name: string;
  parameters: VariableDeclaration[];
  tree: Tree;
  type: SequenceTypes.LIBRARY;
  workspace_id: number;
};

export type LibrarySequenceMap = { [sequenceName: string]: LibrarySequence };

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
