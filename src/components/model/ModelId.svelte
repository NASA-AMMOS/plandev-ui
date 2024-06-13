<svelte:options immutable={true} />

<script lang="ts">
  import type { ModelSlim } from '../../types/model';
  import ModelStatusRollup from './ModelStatusRollup.svelte';

  export let model: ModelSlim | undefined;
</script>

<div class="model-id-container">
  {model?.id}
  <ModelStatusRollup mode="iconOnly" {model} showCompleteStatus={false} />
</div>

<style>
  .model-id-container {
    align-items: center;
    column-gap: 5px;
    display: grid;
    grid-template-columns: min-content auto;
    padding: 0 11px;
  }
</style>
