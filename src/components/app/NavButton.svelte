<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getColorForStatus, type Status } from '../../utilities/status';

  export let icon: string = '';
  export let selected: boolean = false;
  export let status: Status | null = null;
  export let title: string;

  const dispatch = createEventDispatcher();
</script>

<div class="nav-button st-typography-medium" class:selected on:click|preventDefault={() => dispatch('click')}>
  <i class={icon} style="color: {status !== null ? getColorForStatus(status) : 'unset'}" />
  {title}
</div>

<style>
  .nav-button {
    align-items: center;
    color: var(--st-gray-20);
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    gap: 8px;
    height: 42px;
    line-height: 14px;
    padding: 10px;
  }

  .nav-button.selected {
    background-color: var(--st-primary-70);
  }
</style>
