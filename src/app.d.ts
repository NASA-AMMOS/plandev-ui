/* eslint-disable no-var */
/* eslint @typescript-eslint/no-unused-vars: 0 */
import type { ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { SeqJson } from '@nasa-jpl/seq-json-schema/types';
import type { GlobalType } from './types/global-type';
import type { ArgDelegator } from './utilities/new-sequence-editor/extension-points';

declare global {
  namespace App {
    interface Locals {
      user: import('./types/app').User | null;
    }
  }

  /**
   * Types for svelte-dnd-action.
   * @see https://github.com/isaacHagoel/svelte-dnd-action#typescript
   */
  declare type Item = import('svelte-dnd-action').Item;
  declare type DndEvent<ItemType = Item> = import('svelte-dnd-action').DndEvent<ItemType>;
  declare namespace svelteHTML {
    interface HTMLAttributes<T> {
      'on:consider'?: (event: CustomEvent<DndEvent<ItemType>> & { target: EventTarget & T }) => void;
      'on:finalize'?: (event: CustomEvent<DndEvent<ItemType>> & { target: EventTarget & T }) => void;
    }
  }

  /**
   *  Types for imported SVGs.
   *  @see https://github.com/poppa/sveltekit-svg#typescript
   */
  declare module '*.svg' {
    const content: any;
    export default content;
  }

  declare module '*.svg?component' {
    const content: any;
    export default content;
  }

  declare module '*.svg?src' {
    const content: string;
    export default content;
  }

  declare module '*.svg?url' {
    const content: string;
    export default content;
  }

  var CONDITIONAL_KEYWORDS: { ELSE: string; ELSE_IF?: string[]; END_IF: string; IF: string[] } | undefined;
  var LOOP_KEYWORDS:
    | {
        BREAK: string;
        CONTINUE: string;
        END_WHILE_LOOP: string;
        WHILE_LOOP: string[];
      }
    | undefined;
  var GLOBALS: GlobalType[] | undefined;
  var ARG_DELEGATOR: ArgDelegator | undefined;
  function LINT(commandDictionary, view, node);
  function TO_SEQ_JSON(
    seqJson: SeqJson,
    parameterDictionaries: ParameterDictionary[],
    channelDictionary: ChannelDictionary | null,
  );
  function FROM_SEQ_JSON(
    seqJson: SeqJson,
    parameterDictionaries: ParameterDictionary[],
    channelDictionary: ChannelDictionary | null,
  );
  var ALLOW_NON_COMMAND_STEPS: boolean | undefined;
}

export {};
