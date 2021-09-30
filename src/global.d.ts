/* eslint @typescript-eslint/no-unused-vars: 0 */

/// <reference types="@sveltejs/kit" />

/**
 * Types for svelte-dnd-action.
 * @see https://github.com/isaacHagoel/svelte-dnd-action#typescript
 */
declare type DndEvent = import('svelte-dnd-action').DndEvent;
declare namespace svelte.JSX {
  interface HTMLAttributes<T> {
    onconsider?: (
      event: CustomEvent<DndEvent> & { target: EventTarget & T },
    ) => void;
    onfinalize?: (
      event: CustomEvent<DndEvent> & { target: EventTarget & T },
    ) => void;
  }
}
