import {
  type ChannelDictionary,
  type FswCommandArgument,
  type ParameterDictionary
} from '@nasa-jpl/aerie-ampcs';
import type { ISequenceAdaptation } from '../../language-package/interfaces/legacy';

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
