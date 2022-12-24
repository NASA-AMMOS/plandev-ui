<script lang="ts">
  import Input from '../../../components/form/Input.svelte';
  import { selectedLayer, viewUpdateLayer } from '../../../stores/views';
  import type { LineLayer } from '../../../types/timeline';
  import CssGrid from '../../ui/CssGrid.svelte';

  $: lineLayer = $selectedLayer as LineLayer | null;
</script>

{#if lineLayer && lineLayer.chartType === 'line'}
  <div style="display:block; margin-bottom: 8px">
    <Input>
      <label for="yAxisId">Y-Axis Id</label>
      <input class="st-input w-100" name="yAxisId" type="number" value={lineLayer.yAxisId} on:input={viewUpdateLayer} />
    </Input>
  </div>

  <CssGrid columns="1fr 1fr 1fr" gap="16px">
    <Input>
      <label for="lineColor">Line Color</label>
      <input class="w-100" name="lineColor" type="color" value={lineLayer.lineColor} on:input={viewUpdateLayer} />
    </Input>

    <Input>
      <label for="lineWidth">Line Width</label>
      <input
        class="st-input w-100"
        name="lineWidth"
        type="number"
        value={lineLayer.lineWidth}
        on:input={viewUpdateLayer}
      />
    </Input>

    <Input>
      <label for="pointRadius">Point Radius</label>
      <input
        class="st-input w-100"
        name="pointRadius"
        type="number"
        value={lineLayer.pointRadius}
        on:input={viewUpdateLayer}
      />
    </Input>
  </CssGrid>
{/if}
