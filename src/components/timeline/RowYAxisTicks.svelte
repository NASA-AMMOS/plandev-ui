<svelte:options immutable={true} />

<script lang="ts">
  import { axisLeft as d3AxisLeft } from 'd3-axis';
  import type { Axis } from '../../types/timeline';
  import { getYScale } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let yAxes: Axis[] = [];

  let ticks: number[] = [];
  $: if (drawHeight && drawWidth) {
    ticks = [];
    yAxes.forEach(axis => {
      if (
        axis.renderTickLines &&
        axis.scaleDomain &&
        axis.scaleDomain.length === 2 &&
        typeof axis.scaleDomain[0] === 'number' &&
        typeof axis.scaleDomain[1] === 'number'
      ) {
        const scale = getYScale(axis.scaleDomain, drawHeight);
        const axisLeft = d3AxisLeft(scale).ticks(5);
        // D3 typings do not correctly reflect the presence of the "ticks()" function
        const tickValues = (axisLeft.scale() as any).ticks() as number[];
        const tickValues2 = tickValues.map(tick => scale(tick));
        ticks.push(...tickValues2);
      }
    });
  }
</script>

<g class="row-y-axis-ticks">
  {#each ticks as tick}
    <g class="tick" opacity="1" transform="translate(0 {tick})">
      <line stroke="rgba(241, 242, 243, 1)" x2={drawWidth} />
    </g>
  {/each}
</g>
