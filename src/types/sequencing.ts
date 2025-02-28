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
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import type { DictionaryTypes } from '../enums/dictionaryTypes';
import type { SequenceTypes } from '../enums/sequencing';
import type { ArgDelegator } from '../utilities/sequence-editor/extension-points';
import type { UserId } from './app';
import type { GlobalType } from './global-type';
import type { ActivityLayerFilter } from './timeline';

export type ExpandedTemplate = {
  created_at: string;
  expanded_template: object;
  filter_id: number;
  id: number;
  simulation_dataset_id: number;
};

export type SequenceTemplate = {
  activity_type: string;
  id: number;
  language: string;
  model_id: number;
  name: string;
  owner: string;
  parcel_id: number;
  template_definition: string;
};

export type SequenceActivityFilter = ActivityLayerFilter;

export type SequenceFilter = {
  filter: SequenceActivityFilter;
  id: number;
  model_id: number;
  name: string;
};

export type SequenceFilterInsertInput = Pick<SequenceFilter, 'filter' | 'model_id' | 'name'>;

export type SequenceRun = {
  fragments: SequenceFragment[];
  id: number;
  sequenceFilterId: number;
};

export type SequenceFragment = {
  activityId: number;
  createdAt: string;
  endTime: string;
  id: number;
  output: string;
  planId: number;
  startTime: string;
};

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
  compile?: (output: string) => Promise<void>;
  fileExtension: string;
  linter?: (
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

export interface ISequenceAdaptation {
  argDelegator?: ArgDelegator;
  autoComplete: (
    channelDictionary: AmpcsChannelDictionary | null,
    commandDictionary: AmpcsCommandDictionary | null,
    parameterDictionaries: AmpcsParameterDictionary[],
    librarySequences: LibrarySequence[],
  ) => (context: CompletionContext) => CompletionResult | null;
  autoIndent?: () => (context: IndentContext, pos: number) => number | null | undefined;
  globals?: GlobalType[];
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
  outputFormat: IOutputFormat[];
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

export type SeqJson = any; // TODO: Strongly type.

export type UserSequence = {
  created_at: string;
  definition: string;
  id: number;
  name: string;
  owner: UserId;
  parcel_id: number;
  seq_json: SeqJson;
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

export type UserSequenceTemplate = {
  created_at: string;
  definition: string;
  id: number;
  name: string;
  owner: UserId;
  parcel_id: number;
  model_id: number;
  activity_name: string;
  updated_at: string;
};

export type UserSequenceTemplateInsertInput = Omit<UserSequenceTemplate, 'created_at' | 'id' | 'owner' | 'updated_at'>;

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
