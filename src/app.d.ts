/* eslint @typescript-eslint/no-unused-vars: 0 */

declare namespace App {
  interface Locals {
    user: User | null;
  }
}

/**
 * Types for svelte-dnd-action.
 * @see https://github.com/isaacHagoel/svelte-dnd-action#typescript
 */
declare type DndEvent = import('svelte-dnd-action').DndEvent;
declare namespace svelte.JSX {
  interface HTMLAttributes<T> {
    onconsider?: (event: CustomEvent<DndEvent> & { target: EventTarget & T }) => void;
    onfinalize?: (event: CustomEvent<DndEvent> & { target: EventTarget & T }) => void;
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
