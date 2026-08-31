<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { ComponentProps } from 'svelte';
  import TimelineRow from './Row.svelte';

  /**
   * Everything a TimelineRow needs that is the same for every row in a timeline. The row-specific
   * props are derived from `row` below, so this is the exact complement of them - typed off
   * TimelineRow itself so a prop added there cannot be silently dropped here.
   */
  export type TimelineRowSharedProps = Omit<
    ComponentProps<TimelineRow>,
    | 'autoAdjustHeight'
    | 'discreteOptions'
    | 'discreteTreeExpansionMap'
    | 'drawHeight'
    | 'expanded'
    | 'horizontalGuides'
    | 'id'
    | 'index'
    | 'layers'
    | 'name'
    | 'yAxes'
  >;
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DiscreteTreeExpansionMap, MouseOver, Row } from '../../types/timeline';

  export let discreteTreeExpansionMap: DiscreteTreeExpansionMap | undefined = undefined;
  export let index: number;
  export let row: Row;
  export let sharedProps: TimelineRowSharedProps;

  // The three events a caller cannot handle without knowing which row they came from. Re-dispatched
  // with the row attached, so a parent rendering rows in more than one place - at the root and
  // inside a section - wires each of them up exactly once instead of once per placement.
  const dispatch = createEventDispatcher<{
    contextMenu: MouseOver;
    discreteTreeExpansionChange: { map: DiscreteTreeExpansionMap; rowId: number };
    mouseOver: MouseOver;
  }>();
</script>

<TimelineRow
  {...sharedProps}
  {discreteTreeExpansionMap}
  {index}
  autoAdjustHeight={row.autoAdjustHeight}
  discreteOptions={row.discreteOptions}
  drawHeight={row.height}
  expanded={row.expanded}
  horizontalGuides={row.horizontalGuides}
  id={row.id}
  layers={row.layers}
  name={row.name}
  yAxes={row.yAxes}
  on:buildDirective
  on:dblClick
  on:deleteActivityDirective
  on:mouseDown
  on:mouseDownRowMove
  on:mouseUpRowMove
  on:toggleRowExpansion
  on:updateRowHeight
  on:updateYAxes
  on:zoom
  on:contextMenu={e => dispatch('contextMenu', { ...e.detail, row })}
  on:discreteTreeExpansionChange={e => dispatch('discreteTreeExpansionChange', { map: e.detail, rowId: row.id })}
  on:mouseOver={e => dispatch('mouseOver', { ...e.detail, row })}
/>
