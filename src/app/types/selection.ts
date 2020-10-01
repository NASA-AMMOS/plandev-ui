import type { BaseType, Selection as D3Selection } from 'd3-selection';

/**
 * d3.Selection wrapper that makes the type annotations less verbose.
 */
export type Selection<T extends BaseType> = D3Selection<
  T,
  unknown,
  null,
  undefined
>;
