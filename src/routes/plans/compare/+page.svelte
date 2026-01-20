<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy } from 'svelte';
  import Nav from '../../../components/app/Nav.svelte';
  import PlanComparisonSelectorModal from '../../../components/plan-comparison/PlanComparisonSelectorModal.svelte';
  import PlanComparisonView from '../../../components/plan-comparison/PlanComparisonView.svelte';
  import {
    comparisonError,
    comparisonLeftActivities,
    comparisonLeftDuration,
    comparisonLeftModelId,
    comparisonLeftSource,
    comparisonLeftStartTime,
    comparisonLoading,
    comparisonModelsCompatible,
    comparisonRightActivities,
    comparisonRightDuration,
    comparisonRightModelId,
    comparisonRightSource,
    comparisonRightStartTime,
    resetComparisonStores,
  } from '../../../stores/planComparison';
  import type { PageData } from './$types';

  export let data: PageData;

  $: ({ leftData, rightData, user } = data);

  let showSelectorModal = false;

  // Reactively update stores when data changes (handles both initial load and navigation)
  $: {
    if (leftData && rightData) {
      comparisonLeftSource.set(leftData.source);
      comparisonRightSource.set(rightData.source);
      comparisonLeftActivities.set(leftData.activities);
      comparisonRightActivities.set(rightData.activities);
      comparisonLeftDuration.set(leftData.duration);
      comparisonRightDuration.set(rightData.duration);
      comparisonLeftStartTime.set(leftData.startTime);
      comparisonRightStartTime.set(rightData.startTime);
      comparisonLeftModelId.set(leftData.modelId);
      comparisonRightModelId.set(rightData.modelId);
      showSelectorModal = false;
    } else {
      // No data loaded - show selector
      showSelectorModal = true;
    }
  }

  onDestroy(() => {
    resetComparisonStores();
  });

  function handleComparisonSelected(event: CustomEvent<{ left: string; right: string }>) {
    const { left, right } = event.detail;
    showSelectorModal = false;
    goto(`${base}/plans/compare?left=${left}&right=${right}`, { invalidateAll: true });
  }

  function handleNewComparison() {
    resetComparisonStores();
    showSelectorModal = true;
  }

  $: leftName = $comparisonLeftSource?.name ?? 'Left';
  $: rightName = $comparisonRightSource?.name ?? 'Right';
</script>

<div class="flex">
  <Nav {user}>
    <span slot="title">
      {#if $comparisonLeftSource && $comparisonRightSource}
        Plan Comparison: {leftName} vs {rightName}
      {:else}
        Plan Comparison
      {/if}
    </span>
    <svelte:fragment slot="right">
      <button class="st-button secondary" on:click={handleNewComparison}>
        New Comparison
      </button>
    </svelte:fragment>
  </Nav>

  <div class="plan-comparison-content">
    {#if $comparisonLoading}
      <div class="loading-state">
        <span>Loading comparison data...</span>
      </div>
    {:else if $comparisonError}
      <div class="error-state">
        <span class="error-message">{$comparisonError}</span>
        <button class="st-button secondary" on:click={handleNewComparison}>
          Try Again
        </button>
      </div>
    {:else if !$comparisonModelsCompatible}
      <div class="warning-state">
        <span class="warning-message">
          Warning: The selected plans use different mission models. Some activities may not be directly comparable.
        </span>
      </div>
      <PlanComparisonView />
    {:else if $comparisonLeftSource && $comparisonRightSource}
      <PlanComparisonView />
    {:else}
      <div class="empty-state">
        <span>Select two plans or snapshots to compare</span>
        <button class="st-button primary" on:click={() => (showSelectorModal = true)}>
          Select Plans to Compare
        </button>
      </div>
    {/if}
  </div>
</div>

{#if showSelectorModal}
  <PlanComparisonSelectorModal
    {user}
    on:close={() => (showSelectorModal = false)}
    on:select={handleComparisonSelected}
  />
{/if}

<style>
  .flex {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .plan-comparison-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .loading-state,
  .error-state,
  .empty-state,
  .warning-state {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    justify-content: center;
    padding: 32px;
  }

  .empty-state {
    flex: 1;
  }

  .error-message {
    color: var(--st-red);
  }

  .warning-message {
    color: var(--st-orange);
  }

  .warning-state {
    background: rgba(255, 165, 0, 0.1);
    border-bottom: 1px solid var(--st-gray-20);
  }
</style>
