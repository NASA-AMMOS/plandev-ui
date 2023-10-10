<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { afterUpdate, beforeUpdate } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { plan, planReadOnly } from '../../stores/plan';
  import { schedulingSpecConditions, selectedSpecId } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { SchedulingSpecCondition } from '../../types/scheduling';
  import type { ViewGridSection } from '../../types/view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import CollapsibleListControls from '../CollapsibleListControls.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import SchedulingCondition from './conditions/SchedulingCondition.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let activeElement: HTMLElement;
  let conditionsFilterText: string = '';
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasEditPermission: boolean = false;
  let filteredSchedulingSpecConditions: SchedulingSpecCondition[] = [];

  $: if ($plan) {
    hasCreatePermission = featurePermissions.schedulingConditions.canCreate(user, $plan) && !$planReadOnly;
    hasDeletePermission = featurePermissions.schedulingConditions.canDelete(user, $plan) && !$planReadOnly;
    hasEditPermission = featurePermissions.schedulingConditions.canUpdate(user, $plan) && !$planReadOnly;
  }

  $: filteredSchedulingSpecConditions = $schedulingSpecConditions.filter(spec => {
    const filterTextLowerCase = conditionsFilterText.toLowerCase();
    const includesName = spec.condition.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  // Manually keep focus as scheduling condition elements are re-ordered.
  // Svelte currently does not retain focus as elements are moved, even when keyed.
  // See discussion here: https://github.com/sveltejs/svelte/issues/3973
  beforeUpdate(() => {
    activeElement = document.activeElement as HTMLElement;
  });

  afterUpdate(() => {
    if (activeElement) {
      activeElement.focus();
    }
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Scheduling Conditions" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CollapsibleListControls
      placeholder="Filter scheduling conditions"
      on:input={event => (conditionsFilterText = event.detail.value)}
    >
      <button
        slot="right"
        name="new-scheduling-condition"
        class="st-button secondary"
        on:click={() =>
          window.open(
            `${base}/scheduling/conditions/new?modelId=${$plan?.model.id}&&specId=${$selectedSpecId}`,
            '_blank',
          )}
        use:permissionHandler={{
          hasPermission: hasCreatePermission,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to create scheduling conditions for this plan.',
        }}
      >
        New
      </button>
    </CollapsibleListControls>
    <div class="pt-2">
      {#if !filteredSchedulingSpecConditions.length}
        <div class="pt-1 st-typography-label">No scheduling conditions found</div>
      {:else}
        {#each filteredSchedulingSpecConditions as specCondition (specCondition.condition.id)}
          <SchedulingCondition
            enabled={specCondition.enabled}
            condition={specCondition.condition}
            {hasDeletePermission}
            {hasEditPermission}
            specificationId={specCondition.specification_id}
            permissionError={$planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to edit scheduling conditions for this plan.'}
            {user}
          />
        {/each}
      {/if}
    </div>
  </svelte:fragment>
</Panel>
