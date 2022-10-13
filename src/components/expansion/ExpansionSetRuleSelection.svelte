<svelte:options immutable={true} />

<script lang="ts">
  export let activityName: string;
  export let expansionRules: ExpansionRule[];
  export let selectedExpansionRules: Record<string, number> = {};
  export let selectExpansionRule: (name: string, rule: ExpansionRule) => void = undefined;
</script>

{#each expansionRules as rule}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="expansion-rule-selection" on:click|stopPropagation={() => selectExpansionRule(activityName, rule)}>
    <input checked={selectedExpansionRules[activityName] === rule.id} name={activityName} type="checkbox" />Rule {rule.id}
  </div>
{/each}

<style>
  .expansion-rule-selection {
    display: flex;
  }
</style>
