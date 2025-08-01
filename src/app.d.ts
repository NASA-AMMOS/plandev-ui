/* eslint-disable no-var */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import type { Diagnostic } from '@codemirror/lint';
import type { CommandDictionary } from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';

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
        argDelegator?: ArgDelegator;
        conditionalKeywords?: { else?: string; elseIf?: string[]; endIf?: string; if: string[] };
        globals?: GlobalType[];
        inputFormat?: {
          linter?: (
            diagnostics: Diagnostic[],
            commandDictionary: CommandDictionary,
            view: EditorView,
            node: SyntaxNode,
          ) => Diagnostic[];
          name: string;
          toInputFormat?: (input: string) => Promise<string>;
        };
        loopKeywords?: {
          break: string;
          continue: string;
          endWhileLoop: string;
          whileLoop: string[];
        };
        modifyOutput?: (
          output: SeqJson | any,
          parameterDictionaries: ParameterDictionary[],
          channelDictionary: ChannelDictionary | null,
        ) => any;
        modifyOutputParse?: (
          output: SeqJson | any,
          parameterDictionaries: ParameterDictionary[],
          channelDictionary: ChannelDictionary | null,
        ) => any;
        outputFormat?: [
          {
            fileExtension: string;
            linter?: (
              diagnostics: Diagnostic[],
              commandDictionary: CommandDictionary,
              view: EditorView,
              node: SyntaxNode,
            ) => Diagnostic[];
            name: string;
            toOutputFormat?: (
              tree: Tree | any,
              sequence: string,
              commandDictionary: CommandDictionary | null,
              sequenceName: string,
            ) => Promise<string>;
          },
        ];
      }
    | undefined;
}

export {};
