<svelte:options immutable={true} />

<script lang="ts">
  import type { ExpansionRuleSlim } from '../../types/expansion';

  export let activityName: string;
  export let expansionRules: ExpansionRuleSlim[];
  export let selectedExpansionRules: Record<string, number> = {};
  export let selectExpansionRule: ((name: string, rule: ExpansionRuleSlim) => void) | undefined = undefined;

  $: sortedExpansionRules = [...expansionRules].sort((a, b) => a.id - b.id);
</script>

{#each sortedExpansionRules as rule}
  <div
    class="expansion-rule-selection"
    role="none"
    on:click|stopPropagation={() => selectExpansionRule?.(activityName, rule)}
  >
    <input checked={selectedExpansionRules[activityName] === rule.id} name={activityName} type="checkbox" />Rule {rule.id}
  </div>
{/each}

<style>
  .expansion-rule-selection {
    align-items: center;
    display: flex;
    gap: 4px;
  }
</style>
