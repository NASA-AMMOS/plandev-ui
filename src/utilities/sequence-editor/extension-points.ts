import type { Tree } from '@lezer/common';
import {
  type ChannelDictionary,
  type CommandDictionary,
  type FswCommandArgument,
  type ParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import { get } from 'svelte/store';
import { inputFormat, outputFormat, sequenceAdaptation } from '../../stores/sequence-adaptation';

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
) {
  let delegate = undefined;

  if (get(sequenceAdaptation)?.argDelegator !== undefined) {
    delegate = get(sequenceAdaptation)?.argDelegator?.[stem]?.[dictArg.name];
  }

  return delegate?.(dictArg, parameterDictionaries, channelDictionary, precedingArgs) ?? dictArg;
}

export async function toOutputFormat(
  node: Tree,
  sequence: string,
  commandDictionary: CommandDictionary | null,
  parameterDictionaries: ParameterDictionary[],
  channelDictionary: ChannelDictionary | null,
  sequenceName: string,
): Promise<string> {
  const output = await get(outputFormat)?.toOutputFormat(node, sequence, commandDictionary, sequenceName);
  const modifyOutput = get(sequenceAdaptation)?.modifyOutput;

  if (modifyOutput !== undefined && output !== undefined) {
    modifyOutput(output, parameterDictionaries, channelDictionary);
  }

  return output ?? '';
}

export async function toInputFormat(
  output: string,
  parameterDictionaries: ParameterDictionary[],
  channelDictionary: ChannelDictionary | null,
) {
  const modifyOutputParse = get(sequenceAdaptation)?.modifyOutputParse;
  let modifiedOutput = null;

  if (modifyOutputParse !== undefined) {
    modifiedOutput = await modifyOutputParse(output, parameterDictionaries, channelDictionary);
  }

  const input = await get(inputFormat)?.toInputFormat(modifiedOutput ?? output);

  return input;
}
