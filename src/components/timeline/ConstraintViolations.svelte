<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { RowMouseOverEvent, TimeRange } from '../../types/timeline';

  export let constraintResults: ConstraintResultWithName[] = [];
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher<{
    mouseOver: Pick<RowMouseOverEvent, 'constraintResults' | 'e'>;
  }>();

  let g: SVGGElement;
  let mounted = false;

  $: if (constraintResults && drawWidth && drawHeight && mounted && viewTimeRange && xScaleView) {
    draw();
  }
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);

  onMount(() => {
    mounted = true;
  });

  function clampWindow(window: TimeRange) {
    const { end, start } = window;
    if (xScaleView !== null) {
      const xStart = xScaleView(start);
      const xEnd = xScaleView(end);
      const clampedStart = xStart < 0 ? 0 : xStart;
      const clampedEnd = xEnd > drawWidth ? drawWidth : xEnd;
      const width = clampedEnd - clampedStart;
      const clampedWidth = width <= 0 ? 5 : width;
      return { start: clampedStart, width: clampedWidth };
    }

    return { end, start, width: end - start };
  }

  function draw(): void {
    const gSelection = select(g);
    const constraintViolationClass = 'constraint-violation';
    gSelection.selectAll(`.${constraintViolationClass}`).remove();

    for (const constraintResult of constraintResults || []) {
      for (const constraintViolation of constraintResult.violations || []) {
        const { windows } = constraintViolation;
        const filteredWindows = windows.filter(({ start, end }) => {
          if (viewTimeRange) {
            return start <= viewTimeRange.end && end >= viewTimeRange.start;
          }
          return false;
        });

        if (filteredWindows.length) {
          const group = gSelection.append('g').attr('class', constraintViolationClass);

          for (const window of filteredWindows) {
            const { start, width } = clampWindow(window);
            group
              .append('rect')
              .attr('fill', '#B00020')
              .attr('fill-opacity', 0.15)
              .attr('height', drawHeight)
              .attr('width', width)
              .attr('x', start)
              .attr('y', 0);
          }
        }
      }
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      const constraintResultsWithViolations: ConstraintResultWithName[] = [];

      for (const constraintResult of constraintResults || []) {
        for (const constraintViolation of constraintResult.violations || []) {
          const { windows } = constraintViolation;
          let count = 0;

          for (const window of windows) {
            const { start, width } = clampWindow(window);
            const end = start + width;
            if (start <= offsetX && offsetX <= end) {
              ++count;
            }
          }

          if (count > 0) {
            constraintResultsWithViolations.push(constraintResult);
          }
        }
      }

      dispatch('mouseOver', { constraintResults: constraintResultsWithViolations, e });
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { constraintResults: [], e });
    }
  }
</script>

<g class="constraint-violations" bind:this={g} />
