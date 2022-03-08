<svelte:options immutable={true} />

<script lang="ts">
  import Input from '../form/Input.svelte';

  export let spec: SchedulingSpecGoal;

  let expanded = false;
</script>

<div class="scheduling-goal">
  <div class="left">
    <i
      class={expanded ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill'}
      on:click={() => (expanded = !expanded)}
    />
    <i class="bi-calendar-range" />
    {spec.goal.name}
  </div>
  <div class="right">
    <Input>
      <input class="st-input" style:width="50px" value={spec.priority} />
      <input checked disabled type="checkbox" slot="right" />
    </Input>
  </div>
</div>

{#if expanded}
  <div />
{/if}

<style>
  .scheduling-goal {
    align-items: center;
    display: flex;
    font-size: 0.8rem;
    padding-bottom: 5px;
    padding-top: 5px;
  }

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
  }

  .left > i:first-child {
    color: var(--st-gray-40);
    cursor: pointer;
  }

  .right {
    align-items: center;
    justify-content: flex-end;
  }
</style>
