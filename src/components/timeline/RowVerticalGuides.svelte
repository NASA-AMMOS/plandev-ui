<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import type { TimeRange, VerticalGuide } from '../../types';
  import { getUnixEpochTime } from '../../utilities/time';

  export let drawHeight: number = 0;
  export let verticalGuides: VerticalGuide[] = [];
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;

  $: filteredVerticalGuides = verticalGuides.reduce((guides, guide) => {
    const time = getUnixEpochTime(guide.timestamp);
    if (viewTimeRange.start <= time && time <= viewTimeRange.end) {
      guides.push({ ...guide, x: xScaleView(time) });
    }
    return guides;
  }, []);
</script>

<g class="row-vertical-guides">
  {#each filteredVerticalGuides as { x }}
    <line
      x1={x}
      y1="0"
      x2={x}
      y2={drawHeight}
      stroke="gray"
      stroke-dasharray="2"
    />
  {/each}
</g>
