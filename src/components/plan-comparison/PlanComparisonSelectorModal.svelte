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
  <ModalHeader on:close={handleClose}>Compare Plans</ModalHeader>

  <ModalContent>
    <div class="flex min-h-[200px] flex-col gap-4 p-4">
      {#if loading}
        <div class="flex flex-1 items-center justify-center">Loading plans...</div>
      {:else if error}
        <div class="flex flex-1 items-center justify-center text-destructive">{error}</div>
      {:else}
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">Left Source</span>
            <select
              bind:value={leftSource}
              class="w-full rounded border border-border bg-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select a plan...</option>
              {#each sourceOptions as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>

          <div class="text-center text-muted-foreground">vs</div>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">Right Source</span>
            <select
              bind:value={rightSource}
              class="w-full rounded border border-border bg-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select a plan...</option>
              {#each sourceOptions as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>
        </div>

        {#if !modelsMatch}
          <div class="flex items-start gap-2 rounded border border-orange-500/30 bg-orange-500/10 p-3">
            <span class="flex-shrink-0 text-orange-500">⚠</span>
            <span>Selected plans use different mission models. Some activities may not be directly comparable.</span>
          </div>
        {/if}

        {#if leftSource && rightSource && leftSource === rightSource}
          <div class="flex items-start gap-2 rounded border border-orange-500/30 bg-orange-500/10 p-3">
            <span class="flex-shrink-0 text-orange-500">⚠</span>
            <span>Please select two different plans to compare.</span>
          </div>
        {/if}
      {/if}
    </div>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={handleClose}> Cancel </button>
    <button class="st-button primary" disabled={!canCompare} on:click={handleCompare}> Compare </button>
  </ModalFooter>
</Modal>
