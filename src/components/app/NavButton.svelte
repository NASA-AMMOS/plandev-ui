<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getColorForStatus, type Status } from '../../utilities/status';

  export let selected: boolean = false;
  export let status: Status | null = null;
  export let title: string;

  const dispatch = createEventDispatcher();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="nav-button st-typography-medium" class:selected on:click|preventDefault={() => dispatch('click')}>
  <span style="color: {status !== null ? getColorForStatus(status) : 'unset'}">
    <slot />
  </span>
  {title}
  <slot name="menu" />
</div>

<style>
  .nav-button {
    align-items: center;
    color: var(--st-gray-20);
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    gap: 8px;
    height: var(--nav-header-height);
    line-height: 14px;
    padding: 10px;
  }

  .nav-button.selected {
    background-color: var(--st-primary-70);
  }
</style>
