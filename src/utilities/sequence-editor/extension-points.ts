import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import {
  type ChannelDictionary,
  type CommandDictionary,
  type FswCommandArgument,
  type ParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import type { GlobalType } from '../../types/global-type';
import type { IInputFormat, IOutputFormat, ISequenceAdaptation, LibrarySequence } from '../../types/sequencing';
import { seqJsonLinter } from './seq-json-linter';
import { sequenceLinter } from './sequence-linter';

// TODO: serialization
// replace parameter names with hex ids
// replace enum parameter values with the numeric value

//

export type ArgDelegator = {
  [stem: string]: {
    [arg: string]:
      | undefined
      | ((
          argDef: FswCommandArgument,
          paramDictionaries: ParameterDictionary[],
          channelDictionary: ChannelDictionary | null,
          precedingArgValues: string[],
        ) => FswCommandArgument | undefined);
  };
};

export function getCustomArgDef(
  stem: string,
  dictArg: FswCommandArgument,
  precedingArgs: string[],
  parameterDictionaries: ParameterDictionary[],
  channelDictionary: ChannelDictionary | null,
  sequenceAdaptation?: ISequenceAdaptation,
) {
  let delegate = undefined;

  if (sequenceAdaptation?.argDelegator !== undefined) {
    delegate = sequenceAdaptation.argDelegator?.[stem]?.[dictArg.name];
  }

  return delegate?.(dictArg, parameterDictionaries, channelDictionary, precedingArgs) ?? dictArg;
}

export async function toInputFormat(
  output: string,
  parameterDictionaries: ParameterDictionary[],
  channelDictionary: ChannelDictionary | null,
  sequenceAdaptation: ISequenceAdaptation,
  inputFormat?: IInputFormat,
) {
  const modifyOutputParse = sequenceAdaptation.modifyOutputParse;
  if (modifyOutputParse !== undefined) {
    let modifiedOutput = await modifyOutputParse(output, parameterDictionaries, channelDictionary);
    if (modifiedOutput === null) {
      modifiedOutput = 'modifyOutputParse returned null. Verify your adaptation is correct';
    } else if (modifiedOutput === undefined) {
      modifiedOutput = 'modifyOutputParse returned undefined. Verify your adaptation is correct';
    } else if (typeof modifiedOutput === 'object') {
      modifiedOutput = JSON.stringify(modifiedOutput);
    } else {
      modifiedOutput = `${modifiedOutput}`;
    }

    return (await inputFormat?.toInputFormat?.(modifiedOutput)) ?? output;
  } else {
    try {
      return (await inputFormat?.toInputFormat?.(output)) ?? output;
    } catch (e) {
      console.error(e);
      return output;
    }
  }
}

export function inputLinter(
  sequenceAdaptation: ISequenceAdaptation,
  globalVariables: GlobalType[],
  channelDictionary: ChannelDictionary | null = null,
  commandDictionary: CommandDictionary | null = null,
  parameterDictionaries: ParameterDictionary[] = [],
  librarySequences: LibrarySequence[] = [],
): Extension {
  return linter(view => {
    const inputFormatLinter = sequenceAdaptation.inputFormat.linter;
    const tree = syntaxTree(view.state);
    const treeNode = tree.topNode;
    let diagnostics: Diagnostic[];

    diagnostics = sequenceLinter(
      view,
      sequenceAdaptation,
      channelDictionary,
      commandDictionary,
      parameterDictionaries,
      librarySequences,
      globalVariables,
    );

    if (inputFormatLinter !== undefined && commandDictionary !== null) {
      diagnostics = inputFormatLinter(diagnostics, commandDictionary, view, treeNode);
    }

    return diagnostics;
  });
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
