<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { SchedulingCondition } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import Collapse from '../../Collapse.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import Input from '../../form/Input.svelte';

  export let enabled: boolean;
  export let condition: SchedulingCondition;
  export let specificationId: number;
</script>

<div class="scheduling-condition" class:disabled={!enabled}>
  <Collapse title={condition.name} tooltipContent={condition.name} collapsible={false}>
    <svelte:fragment slot="right">
      <div class="right-content">
        <Input>
          <input
            bind:checked={enabled}
            style:cursor="pointer"
            type="checkbox"
            on:change={() => effects.updateSchedulingSpecCondition(condition.id, specificationId, { enabled })}
          />
        </Input>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="contextMenuContent">
      <ContextMenuHeader>Actions</ContextMenuHeader>
      <ContextMenuItem on:click={() => window.open(`${base}/scheduling/conditions/edit/${condition.id}`, '_blank')}>
        Edit Condition
      </ContextMenuItem>
      <ContextMenuHeader>Modify</ContextMenuHeader>
      <ContextMenuItem on:click={() => effects.deleteSchedulingCondition(condition.id)}
        >Delete Condition</ContextMenuItem
      >
    </svelte:fragment>
  </Collapse>
</div>

<style>
  .scheduling-condition {
    align-items: normal;
    display: flex;
    flex-direction: column;
  }
  .right-content {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
