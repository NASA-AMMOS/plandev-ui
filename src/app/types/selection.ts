/**
 * d3.Selection wrapper that makes the type annotations less verbose.
 */
export type Selection<T extends d3.BaseType> = d3.Selection<
  T,
  unknown,
  null,
  undefined
>;
