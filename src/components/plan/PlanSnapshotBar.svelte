<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PlanSnapshot } from '../../types/plan-snapshot';

  export let snapshot: PlanSnapshot;
  export let numOfDirectives: number;

  const dispatch = createEventDispatcher();
</script>

<div class="snapshot-bar">
  <div class="info">
    <div>Preview of plan snapshot</div>
    <div class="snapshot-name">{snapshot.snapshot_name}</div>
    <div>{numOfDirectives} directive{numOfDirectives !== 1 ? 's' : ''}</div>
  </div>

  <div class="buttons">
    <button class="st-button" on:click|stopPropagation={() => dispatch('restore', snapshot)}>Restore Snapshot</button>
    <button class="st-button secondary" on:click={() => dispatch('close')}>Close Preview</button>
  </div>
</div>

<style>
  .snapshot-bar {
    align-items: center;
    background-color: var(--st-primary-10, #e6e6ff);
    border-bottom: 1px solid var(--st-primary-30, #a1a4fc);
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
  }

  .snapshot-bar .info {
    align-items: center;
    color: var(--st-primary-90, #1a237e);
    column-gap: 10px;
    display: flex;
    display: flex;
    font-weight: 500;
  }

  .snapshot-bar .info .snapshot-name {
    background-color: #fff;
    border: 1px solid var(--st-primary-30, #a1a4fc);
    border-radius: 16px;
    padding: 4px 12px;
  }
</style>
