import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { IndentContext } from '@codemirror/language';
import type { Diagnostic } from '@codemirror/lint';
import type { SyntaxNode, Tree } from '@lezer/common';
import type {
  ChannelDictionary as AmpcsChannelDictionary,
  CommandDictionary as AmpcsCommandDictionary,
  ParameterDictionary as AmpcsParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import type { SequenceTypes } from '../../enums/sequencing';
import type { GlobalType } from '../../types/global-type';
import type { ArgDelegator } from '../../utilities/sequence-editor/extension-points';

export type LibrarySequence = {
  name: string;
  parameters: VariableDeclaration[];
  tree: Tree;
  type: SequenceTypes.LIBRARY;
  workspace_id: number;
};

export type LibrarySequenceMap = { [sequenceName: string]: LibrarySequence };

export interface IOutputFormat {
  compile?: (output: string) => Promise<void>; // TODO do we use `compile`? Why does it belong to `IOutputFormat` instead of the top-level adaptation? Actions job now?
  fileExtension: string;
  linter?: (
    // TODO do we _really_ need a linter for the output format?
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

// TODO consider a unified interface for all this global sequencing context we pass around
// export interface PhoenixContext {
//   dictionaries: (AmpcsChannelDictionary | AmpcsCommandDictionary)[];
//   librarySequences: LibrarySequence[];
// }

export interface ISequenceAdaptation {
  // TODO add CommandInfoMapper here
  argDelegator?: ArgDelegator;
  autoComplete: (
    // TODO investigate whether we can, instead of defining our own interfaces for all the codemirror features, just pass an editor to be configured by the adaptation
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
