<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { User } from '../../types/app';
  import type { PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';

  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    select: { left: string; right: string };
  }>();

  let plans: PlanSlim[] = [];
  let loading = true;
  let error: string | null = null;

  let leftSource: string = '';
  let rightSource: string = '';

  // Build source options from plans (snapshots would need to be loaded separately)
  $: sourceOptions = plans.map(plan => ({
    id: `plan:${plan.id}`,
    label: plan.name,
    modelId: plan.model_id,
    type: 'plan' as const,
  }));

  $: leftOption = sourceOptions.find(o => o.id === leftSource);
  $: rightOption = sourceOptions.find(o => o.id === rightSource);

  $: modelsMatch = !leftOption || !rightOption || leftOption.modelId === rightOption.modelId;
  $: canCompare = leftSource && rightSource && leftSource !== rightSource;

  onMount(async () => {
    try {
      const data = await effects.getPlansAndModels(user);
      plans = data.plans;
    } catch (e) {
      error = 'Failed to load plans';
    } finally {
      loading = false;
    }
  });

  function handleCompare() {
    if (canCompare) {
      dispatch('select', { left: leftSource, right: rightSource });
    }
  }

  function handleClose() {
    dispatch('close');
  }
</script>

<Modal width={500} height="auto" on:close={handleClose}>
  <ModalHeader on:close={handleClose}>
    Compare Plans
  </ModalHeader>

  <ModalContent>
    <div class="selector-content">
      {#if loading}
        <div class="loading">Loading plans...</div>
      {:else if error}
        <div class="error">{error}</div>
      {:else}
        <div class="source-selector">
          <label class="selector-label">
            <span class="st-typography-label">Left Source</span>
            <select bind:value={leftSource} class="st-select">
              <option value="">Select a plan...</option>
              {#each sourceOptions as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>

          <div class="vs-label">vs</div>

          <label class="selector-label">
            <span class="st-typography-label">Right Source</span>
            <select bind:value={rightSource} class="st-select">
              <option value="">Select a plan...</option>
              {#each sourceOptions as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>
        </div>

        {#if !modelsMatch}
          <div class="model-warning">
            <span class="warning-icon">⚠</span>
            <span>Selected plans use different mission models. Some activities may not be directly comparable.</span>
          </div>
        {/if}

        {#if leftSource && rightSource && leftSource === rightSource}
          <div class="same-plan-warning">
            <span class="warning-icon">⚠</span>
            <span>Please select two different plans to compare.</span>
          </div>
        {/if}
      {/if}
    </div>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={handleClose}>
      Cancel
    </button>
    <button
      class="st-button primary"
      disabled={!canCompare}
      on:click={handleCompare}
    >
      Compare
    </button>
  </ModalFooter>
</Modal>

<style>
  .selector-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 200px;
    padding: 16px;
  }

  .loading,
  .error {
    align-items: center;
    display: flex;
    flex: 1;
    justify-content: center;
  }

  .error {
    color: var(--st-red);
  }

  .source-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .selector-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .vs-label {
    color: var(--st-gray-50);
    text-align: center;
  }

  .st-select {
    background-color: var(--st-gray-10);
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    font-size: 14px;
    padding: 8px 12px;
    width: 100%;
  }

  .st-select:focus {
    border-color: var(--st-primary);
    outline: none;
  }

  .model-warning,
  .same-plan-warning {
    align-items: flex-start;
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: 4px;
    display: flex;
    gap: 8px;
    padding: 12px;
  }

  .warning-icon {
    color: var(--st-orange);
    flex-shrink: 0;
  }
</style>
