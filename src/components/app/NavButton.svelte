<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Status } from '../../enums/status';
  import { getColorForStatus } from '../../utilities/status';

  export let selected: boolean = false;
  export let status: Status | null = null;
  export let title: string;

  const dispatch = createEventDispatcher<{ click: void }>();
</script>

<div
  class="nav-button st-typography-medium"
  class:selected
  role="none"
  on:click|preventDefault|stopPropagation={() => dispatch('click')}
>
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
