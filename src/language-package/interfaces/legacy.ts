import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree, type IndentContext } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import type {
  ChannelDictionary as AmpcsChannelDictionary,
  CommandDictionary as AmpcsCommandDictionary,
  ParameterDictionary as AmpcsParameterDictionary,
  CommandDictionary,
} from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import { parse as jsonSourceMapParse } from 'json-source-map';
import type { ArgDelegator } from '../../utilities/sequence-editor/extension-points';
import type { GlobalType } from '../languages/seq-n/global-types';
import type { LibrarySequence } from './new-adaptation-interface';

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

export function outputLinter(
  commandDictionary: CommandDictionary | null = null,
  outputFormat: IOutputFormat | undefined = undefined,
): Extension {
  return linter(view => {
    const tree = syntaxTree(view.state);
    const treeNode = tree.topNode;
    const outputFormatLinter = outputFormat?.linter;
    let diagnostics: Diagnostic[];

    diagnostics = seqJsonLinter(view, commandDictionary);

    if (outputFormatLinter !== undefined && commandDictionary !== null) {
      diagnostics = outputFormatLinter(diagnostics, commandDictionary, view, treeNode);
    }

    return diagnostics;
  });
}

type JsonSourceMapPointerPosition = {
  column: number;
  line: number;
  pos: number;
};

type JsonSourceMapPointer = {
  key: JsonSourceMapPointerPosition;
  keyEnd: JsonSourceMapPointerPosition;
  value: JsonSourceMapPointerPosition;
  valueEnd: JsonSourceMapPointerPosition;
};

/**
 * Helper for getting an error position of JSON.prase throws a SyntaxError.
 * @see https://github.com/codemirror/lang-json/blob/main/src/lint.ts
 */
function getErrorPosition(error: SyntaxError, doc: Text): number {
  let m;

  if ((m = error.message.match(/at position (\d+)/))) {
    return Math.min(+m[1], doc.length);
  }

  if ((m = error.message.match(/at line (\d+) column (\d+)/))) {
    return Math.min(doc.line(+m[1]).from + +m[2] - 1, doc.length);
  }

  return 0;
}

// TODO do we really need a SeqJSON linter?
/**
 * Linter function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available during linting.
 */
export function seqJsonLinter(view: EditorView, commandDictionary: CommandDictionary | null = null): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  try {
    const text = view.state.doc.toString();
    const sourceMap = jsonSourceMapParse(text);

    if (commandDictionary) {
      for (const [key, pointer] of Object.entries(sourceMap.pointers)) {
        const stemMatch = key.match(/\/steps\/\d+\/stem/);

        if (stemMatch) {
          const stemValue = view.state.doc.sliceString(pointer.value.pos, pointer.valueEnd.pos);
          const stemValueNoQuotes = stemValue.replaceAll('"', '');
          const hasFswCommand = commandDictionary.fswCommandMap[stemValueNoQuotes] ?? false;
          const hasHwCommand = commandDictionary.hwCommandMap[stemValueNoQuotes] ?? false;
          const hasCommand = hasFswCommand || hasHwCommand;

          if (!hasCommand) {
            diagnostics.push({
              actions: [],
              from: pointer.value.pos,
              message: 'Command not found',
              severity: 'error',
              to: pointer.valueEnd.pos,
            });
          }
        }
      }
    }
  } catch (e) {
    if (!(e instanceof SyntaxError)) {
      throw e;
    }
    const pos = getErrorPosition(e, view.state.doc);

    diagnostics.push({
      from: pos,
      message: e.message,
      severity: 'error',
      to: pos,
    });
  }

  return diagnostics;
}
