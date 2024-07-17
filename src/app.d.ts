/* eslint-disable no-var */
/* eslint @typescript-eslint/no-unused-vars: 0 */

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

  var SequenceAdaptation:
    | {
        ARG_DELEGATOR?: ArgDelegator;
        CONDITIONAL_KEYWORDS?: { ELSE?: string; ELSE_IF?: string[]; END_IF?: string; IF: string[] };
        GLOBALS?: GlobalType[];
        INPUT_FORMAT?: {
          NAME: string;
          TO_INPUT_FORMAT?: (input: string) => Promise<string>;
        };
        LINT?: (commandDictionary, view, node) => any;
        LOOP_KEYWORDS?: {
          BREAK: string;
          CONTINUE: string;
          END_WHILE_LOOP: string;
          WHILE_LOOP: string[];
        };
        MODFIY_OUTPUT?: (
          output: SeqJson | any,
          parameterDictionaries: ParameterDictionary[],
          channelDictionary: ChannelDictionary | null,
        ) => any;
        MODIFY_OUTPUT_PARSE?: (
          output: SeqJson | any,
          parameterDictionaries: ParameterDictionary[],
          channelDictionary: ChannelDictionary | null,
        ) => any;
        OUTPUT_FORMAT?: {
          NAME: string;
          TO_OUTPUT_FORMAT?: (
            tree: Tree | any,
            sequence: string,
            commandDictionary: CommandDictionary | null,
            sequenceName: string,
          ) => Promise<string>;
        };
      }
    | undefined;
}

export {};
