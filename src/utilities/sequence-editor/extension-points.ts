import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import {
  type ChannelDictionary,
  type CommandDictionary,
  type FswCommandArgument,
  type ParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import type { ISequenceAdaptation, LibrarySequence } from '../../language-package/interfaces/legacy';
import type { GlobalType } from '../../types/global-type';
import { sequenceLinter } from './sequence-linter';

// TODO sort out what this file is actually for -- is this the place we handle custom input/output formats? Should `ArgDelegator` belong with `CommandInfoMapper`?

export type ArgDelegator = {
  // TODO consider whether this can be replaced with a single callback that takes in the stem and arg position and cmd dict
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
) {
  const modifyOutputParse = sequenceAdaptation.modifyOutputParse;
  let processedOutput = `${output}`;

  if (modifyOutputParse !== undefined) {
    const modifiedOutput = await modifyOutputParse(output, parameterDictionaries, channelDictionary);
    if (modifiedOutput === null) {
      return 'modifyOutputParse returned null. Verify your adaptation is correct';
    } else if (modifiedOutput === undefined) {
      return 'modifyOutputParse returned undefined. Verify your adaptation is correct';
    } else if (typeof modifiedOutput === 'object') {
      processedOutput = JSON.stringify(modifiedOutput);
    } else {
      processedOutput = `${modifiedOutput}`;
    }
  }

  try {
    return (await sequenceAdaptation.inputFormat.toInputFormat?.(processedOutput)) ?? processedOutput;
  } catch (e) {
    console.error(e);
    return processedOutput;
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
