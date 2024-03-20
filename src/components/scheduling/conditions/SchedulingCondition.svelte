<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../../enums/planStatusMessages';
  import { SearchParameters } from '../../../enums/searchParameters';
  import type { SchedulingConditionMetadata, SchedulingConditionPlanSpecification } from '../../../types/scheduling';
  import { getTarget } from '../../../utilities/generic';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { tooltip } from '../../../utilities/tooltip';
  import Collapse from '../../Collapse.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';

  export let condition: SchedulingConditionMetadata;
  export let conditionPlanSpec: SchedulingConditionPlanSpecification;
  export let hasEditPermission: boolean = false;
  export let modelId: number | undefined;
  export let permissionError: string = '';
  export let readOnly: boolean = false;

  const dispatch = createEventDispatcher();

  let revisions: number[] = [];

  $: revisions = condition.versions
    .map(({ revision }) => revision)
    .sort((revisionA, revisionB) => revisionB - revisionA);

  function onEnable(event: Event) {
    const { value: enabled } = getTarget(event);
    dispatch('updateConditionPlanSpec', {
      ...conditionPlanSpec,
      enabled,
    });
  }

  function onUpdateRevision(event: Event) {
    const { value: revision } = getTarget(event);
    dispatch('updateConditionPlanSpec', {
      ...conditionPlanSpec,
      condition_revision: revision === '' ? null : parseInt(`${revision}`),
    });
  }
</script>

<div class="scheduling-condition" class:disabled={!conditionPlanSpec.enabled}>
  <Collapse title={condition.name} tooltipContent={condition.name} collapsible={false}>
    <svelte:fragment slot="left">
      <div class="left-content">
        <input
          type="checkbox"
          checked={conditionPlanSpec.enabled}
          style:cursor="pointer"
          on:change={onEnable}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError,
          }}
          use:tooltip={{
            content: `${conditionPlanSpec.enabled ? 'Disable condition' : 'Enable condition'} on plan`,
            disabled: !hasEditPermission,
            placement: 'top',
          }}
        />
      </div>
    </svelte:fragment>
    <svelte:fragment slot="right">
      <div class="right-content">
        <select
          class="st-select"
          value={conditionPlanSpec.condition_revision}
          on:change={onUpdateRevision}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: readOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to edit plan conditions',
          }}
        >
          <option value={null}>Always use latest</option>
          {#each revisions as revision, index}
            <option value={revision}>{revision}{index === 0 ? ' (Latest)' : ''}</option>
          {/each}
        </select>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="contextMenuContent">
      <ContextMenuItem
        on:click={() =>
          window.open(
            `${base}/scheduling/conditions/edit/${condition.id}${
              conditionPlanSpec.condition_revision !== null
                ? `?${SearchParameters.REVISION}=${conditionPlanSpec.condition_revision}&${SearchParameters.MODEL_ID}=${modelId}`
                : ''
            }`,
            '_blank',
          )}
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
