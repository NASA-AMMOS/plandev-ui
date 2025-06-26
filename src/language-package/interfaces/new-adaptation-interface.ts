import type { Extension } from '@codemirror/state';
import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { SequenceTypes } from '../../enums/sequencing';

export type LibrarySequence = {
  name: string;
  parameters: VariableDeclaration[];
  type: SequenceTypes.LIBRARY;
  workspace_id: number;
};

export type LibrarySequenceMap = { [sequenceName: string]: LibrarySequence };

export interface PhoenixContext {
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
  librarySequenceMap: LibrarySequenceMap,
}

export interface NewAdaptationInterface {
  extension: (context: PhoenixContext) => Extension;
  outputExtension: (context: PhoenixContext) => Extension;
}
