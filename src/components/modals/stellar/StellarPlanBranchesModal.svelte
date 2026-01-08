<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { Plan } from '../../../types/plan';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let plan: Plan;
</script>

<StellarDialog bind:open size="auto" className="w-[400px] h-[270px]" title="Branches" on:close>
  <div class="plan-branched-plans overflow-auto py-0">
    {#each plan.child_plans as childPlan}
      <a class="branched-plan" href={`${base}/plans/${childPlan.id}`}>{childPlan.name}</a>
    {/each}
  </div>
</StellarDialog>

<style>
  a {
    border-bottom: 1px solid var(--st-gray-20);
    color: var(--st-black);
    display: block;
    font-weight: var(--st-typography-medium-font-weight);
    padding: 8px 16px;
    text-decoration: none;
  }

  a:hover {
    background: var(--st-gray-10);
  }
</style>
