/* eslint @typescript-eslint/no-unused-vars: 0 */

/// <reference types="@sveltejs/kit" />

declare namespace App {
  interface Locals {
    user: User | null;
  }

  interface PublicEnv {
    AUTH_TYPE: string;
    GATEWAY_CLIENT_URL: string;
    GATEWAY_SERVER_URL: string;
    HASURA_CLIENT_URL: string;
    HASURA_SERVER_URL: string;
    HASURA_WEB_SOCKET_URL: string;
    ORIGIN: string;
  }

  interface Session {
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
