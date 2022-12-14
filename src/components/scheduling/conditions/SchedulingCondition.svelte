<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import Globe2Icon from 'bootstrap-icons/icons/globe2.svg?component';
  import effects from '../../../utilities/effects';
  import { tooltip } from '../../../utilities/tooltip';
  import ContextMenu from '../../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import Input from '../../form/Input.svelte';

  export let enabled: boolean;
  export let condition: SchedulingCondition;
  export let specificationId: number;

  let contextMenu: ContextMenu;
</script>

<div class="scheduling-condition" on:contextmenu|preventDefault={contextMenu.show}>
  <div class="left st-typography-body" class:disabled={!enabled}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <Globe2Icon />
    <span
      class="scheduling-condition-name st-typography-body"
      use:tooltip={{ content: condition.name, maxWidth: 'none', placement: 'right' }}
    >
      {condition.name}
    </span>
  </div>
  <div class="right">
    <Input>
      <input
        bind:checked={enabled}
        style:cursor="pointer"
        type="checkbox"
        on:change={() => effects.updateSchedulingSpecCondition(condition.id, specificationId, { enabled })}
      />
    </Input>
  </div>
</div>

<ContextMenu bind:this={contextMenu}>
  <ContextMenuHeader>Actions</ContextMenuHeader>
  <ContextMenuItem on:click={() => window.open(`${base}/scheduling/conditions/edit/${condition.id}`, '_blank')}>
    Edit Condition
  </ContextMenuItem>
  <ContextMenuHeader>Modify</ContextMenuHeader>
  <ContextMenuItem on:click={() => effects.deleteSchedulingCondition(condition.id)}>Delete Condition</ContextMenuItem>
</ContextMenu>

<style>
  .scheduling-condition {
    align-items: center;
    cursor: default;
    display: flex;
    font-size: 0.8rem;
    padding-bottom: 5px;
    padding-top: 5px;
  }

  .scheduling-condition-name {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
    overflow: hidden;
  }

  .left.disabled,
  .left.disabled :global(.st-typography-body) {
    color: var(--st-gray-30) !important;
  }

  .left > span:first-child {
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
  }

  .right {
    align-items: center;
    display: flex;
    justify-content: flex-end;
  }
</style>
