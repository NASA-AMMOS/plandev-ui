import type { Extension } from '@codemirror/state';
import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';

export interface PhoenixContext {
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
}

export interface NewAdaptationInterface {
  extension: (context: PhoenixContext) => Extension;
  outputExtension: (context: PhoenixContext) => Extension;
}
