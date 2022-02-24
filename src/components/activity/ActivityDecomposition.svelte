<svelte:options immutable={true} />

<script lang="ts">
  export let activitiesMap: ActivitiesMap = {};
  export let children: string[] | null = null;
  export let expanded = true;
  export let type: string = '';

  $: hasChildren = children ? children.length > 0 : false;

  function toggle() {
    expanded = !expanded;
  }
</script>

<div class="activity-decomposition mt-2 mb-2" on:click={toggle}>
  {#if hasChildren}
    <i class={expanded ? 'bi bi-chevron-down' : 'bi bi-chevron-right'} />
  {/if}
  {type}
</div>

{#if hasChildren && expanded}
  <ul>
    {#each children as childId}
      <li>
        <svelte:self {activitiesMap} {...activitiesMap[childId]} />
      </li>
    {/each}
  </ul>
{/if}

<style>
  ul {
    margin: 0;
    padding-inline-start: 30px;
  }

  li {
    list-style: none;
  }

  .activity-decomposition {
    align-items: center;
    display: grid;
    gap: 5px;
    grid-template-columns: 12px auto;
  }
</style>
