<script lang="ts">
  import { view, viewActions } from '../../stores/views';
  import type { Status } from '../../utilities/status';
  import { getColorForStatus } from '../../utilities/status';

  export let icon: string = '';
  export let status: Status | null = null;
  export let title: GridName;

  let selected: boolean = false;

  $: selected = $view.plan.layout?.gridName === title;

  function onClick() {
    viewActions.setLayout(title);
  }
</script>

<div class="nav-button" class:selected on:click|preventDefault={() => onClick()}>
  <i class={icon} style="color: {status !== null ? getColorForStatus(status) : 'unset'}" />
  {title}
</div>

<style>
  .nav-button {
    align-items: center;
    color: var(--st-gray-20);
    cursor: pointer;
    display: inline-flex;
    font-weight: 500;
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
