export type Dispatcher<TEvents extends Record<keyof TEvents, CustomEvent<any>>> = {
  [Property in keyof TEvents]: TEvents[Property]['detail'];
};

/**
 * Utility type for components that accept an element reference
 * Used by sidebar components for DOM element binding
 */
export type WithElementRef<T, K = HTMLElement> = T & {
  ref?: K | null | undefined;
};
