<svelte:options immutable={true} />

<script lang="ts">
  import type { D3BrushEvent } from 'd3-brush';
  import { brushX } from 'd3-brush';
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import { createEventDispatcher } from 'svelte';
  import type { Selection, TimeRange } from '../../types';

  const dispatch = createEventDispatcher();

  export let brushOverlayColor: string = '#E8EAF6';
  export let brushSelectionColor: string = '#7986cb';
  export let drawHeight: number = 20;
  export let drawWidth: number = 0;
  export let handleColor: string = '#0D1667';
  export let handleWidth: number = 2;
  export let type: 'max' | 'view' = 'view';
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleMax: ScaleTime<number, number> | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let yOffset: number = 0;

  let brush: Selection<SVGGElement>;
  let g: SVGGElement;

  $: if (drawWidth && drawHeight && viewTimeRange && xScaleMax && xScaleView) {
    draw();
  }

  function brushEnd(event: D3BrushEvent<number[]>): void {
    if (!event.sourceEvent) {
      return;
    }
    if (!event.selection) {
      return;
    }

    let scale = xScaleView;
    if (type === 'max') {
      scale = xScaleMax;
    }

    const selection = event.selection as number[];
    const [start, end] = selection.map(scale.invert);
    const newViewTimeRange = { end: end.getTime(), start: start.getTime() };
    dispatch('viewTimeRangeChanged', newViewTimeRange);
  }

  function disableBrushOverlayMouseEvents(g: Selection<SVGGElement>) {
    g.select('.overlay')
      .datum({ type: 'selection' })
      .on('mousedown touchstart', () => {
        return;
      });
  }

  function draw() {
    if (g) {
      const xBrush = brushX()
        .extent([
          [0, yOffset],
          [drawWidth, drawHeight],
        ])
        .on('start', (event: D3BrushEvent<number[]>) => {
          styleBrush(event);
        })
        .on('brush', (event: D3BrushEvent<number[]>) => {
          styleBrush(event);
        })
        .on('end', (event: D3BrushEvent<number[]>) => {
          styleBrush(event);
          brushEnd(event);
        });

      brush = select(g).call(xBrush);

      if (type === 'max') {
        const extent = [
          new Date(viewTimeRange.start),
          new Date(viewTimeRange.end),
        ].map(xScaleMax);
        brush.call(xBrush.move, extent).call(disableBrushOverlayMouseEvents);
      } else {
        brush.call(xBrush.move, null);
      }
    }
  }

  function styleBrush(event: D3BrushEvent<number[]>) {
    if (type === 'max') {
      const selection = event.selection as number[];
      brush.select('.overlay').attr('fill', brushOverlayColor);
      brush.select('.selection').attr('fill', brushSelectionColor);
      brush
        .selectAll('.handle--custom')
        .data([{ type: 'w' }, { type: 'e' }])
        .join(enter =>
          enter
            .append('rect')
            .attr('class', 'handle--custom')
            .attr('fill', handleColor)
            .attr('width', handleWidth)
            .attr('height', drawHeight - yOffset)
            .attr('y', yOffset)
            .attr('cursor', 'ew-resize'),
        )
        .attr(
          'transform',
          selection === null
            ? null
            : ({ type }, i: number) => {
                if (type === 'w') {
                  return `translate(${selection[i]}, 0)`;
                } else {
                  return `translate(${selection[i] - handleWidth}, 0)`;
                }
              },
        );
    }
  }
</script>

<g bind:this={g} />
