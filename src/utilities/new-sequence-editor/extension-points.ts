/* eslint-disable @typescript-eslint/no-unused-vars */
import { type ChannelDictionary, type FswCommandArgument, type ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { SeqJson } from '@nasa-jpl/seq-json-schema/types';

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
  const delegate = globalThis.ARG_DELEGATOR?.[stem]?.[dictArg.name];
  return delegate?.(dictArg, parameterDictionaries, channelDictionary, precedingArgs) ?? dictArg;
}

export function customizeSeqJson(
  seqJson: SeqJson,
  parameterDictionaries: ParameterDictionary[],
  channelDictionary: ChannelDictionary | null,
) {
  return globalThis.TO_SEQ_JSON?.(seqJson, parameterDictionaries, channelDictionary) ?? seqJson;
}

export function customizeSeqJsonParsing(
  seqJson: SeqJson,
  parameterDictionaries: ParameterDictionary[],
  channelDictionary: ChannelDictionary | null,
) {
  return globalThis.FROM_SEQ_JSON?.(seqJson, parameterDictionaries, channelDictionary) ?? seqJson;
}
