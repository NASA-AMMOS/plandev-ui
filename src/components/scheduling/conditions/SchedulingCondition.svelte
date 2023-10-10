<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { User } from '../../../types/app';
  import type { SchedulingCondition } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import Collapse from '../../Collapse.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import Input from '../../form/Input.svelte';

  export let enabled: boolean;
  export let condition: SchedulingCondition;
  export let hasDeletePermission: boolean = false;
  export let hasEditPermission: boolean = false;
  export let permissionError: string = '';
  export let specificationId: number;
  export let user: User | null;
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
            on:change={() => effects.updateSchedulingSpecCondition(condition.id, specificationId, { enabled }, user)}
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError,
            }}
          />
        </Input>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="contextMenuContent">
      <ContextMenuHeader>Actions</ContextMenuHeader>
      <ContextMenuItem
        on:click={() => window.open(`${base}/scheduling/conditions/edit/${condition.id}`, '_blank')}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasEditPermission,
              permissionError,
            },
          ],
        ]}
      >
        Edit Condition
      </ContextMenuItem>
      <ContextMenuHeader>Modify</ContextMenuHeader>
      <ContextMenuItem
        on:click={() => effects.deleteSchedulingCondition(condition, user)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasDeletePermission,
              permissionError,
            },
          ],
        ]}
      >
        Delete Condition
      </ContextMenuItem>
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
