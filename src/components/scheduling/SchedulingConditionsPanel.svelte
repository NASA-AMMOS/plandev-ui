<svelte:options immutable={true} />

<script lang="ts">
  import { afterUpdate, beforeUpdate } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { plan, planReadOnly } from '../../stores/plan';
  import {
    allowedSchedulingConditionSpecs,
    schedulingConditionSpecifications,
    schedulingConditionsMap,
  } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { SchedulingConditionPlanSpecification } from '../../types/scheduling';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions, isAdminRole } from '../../utilities/permissions';
  import CollapsibleListControls from '../CollapsibleListControls.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import SchedulingCondition from './conditions/SchedulingCondition.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let activeElement: HTMLElement;
  let conditionsFilterText: string = '';
  let filteredSchedulingConditionSpecs: SchedulingConditionPlanSpecification[] = [];
  let numOfPrivateConditions: number = 0;
  let visibleSchedulingConditionSpecs: SchedulingConditionPlanSpecification[] = [];

  // TODO: remove this after db merge as it becomes redundant
  $: visibleSchedulingConditionSpecs = $allowedSchedulingConditionSpecs.filter(
    ({ condition_metadata: conditionMetadata }) => {
      if (conditionMetadata) {
        const { public: isPublic, owner } = conditionMetadata;
        if (!isPublic && !isAdminRole(user?.activeRole)) {
          return owner === user?.id;
        }
        return true;
      }
      return false;
    },
  );
  $: filteredSchedulingConditionSpecs = visibleSchedulingConditionSpecs.filter(spec => {
    const filterTextLowerCase = conditionsFilterText.toLowerCase();
    const includesName = spec.condition_metadata?.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });
  $: numOfPrivateConditions = $schedulingConditionSpecifications.length - visibleSchedulingConditionSpecs.length;

  function onManageConditions() {
    effects.managePlanSchedulingConditions(user);
  }

  async function onUpdateCondition(event: CustomEvent<SchedulingConditionPlanSpecification>) {
    const {
      detail: { condition_metadata, specification_id, ...conditionPlanSpec },
    } = event;

    if ($plan) {
      await effects.updateSchedulingConditionPlanSpecification(
        $plan,
        specification_id,
        {
          ...conditionPlanSpec,
          specification_id,
        },
        user,
      );
    }
  }

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
      <svelte:fragment slot="right">
        <button
          name="manage-conditions"
          class="st-button secondary"
          use:permissionHandler={{
            hasPermission: $plan ? featurePermissions.schedulingConditions.canCreate(user) && !$planReadOnly : false,
            permissionError: $planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to update scheduling conditions',
          }}
          on:click|stopPropagation={onManageConditions}
        >
          Manage Conditions
        </button>
      </svelte:fragment>
    </CollapsibleListControls>
    <div class="pt-2">
      {#if !filteredSchedulingConditionSpecs.length}
        <div class="pt-1 st-typography-label">No scheduling conditions found</div>
        <div class="private-label">
          {#if numOfPrivateConditions > 0}
            {numOfPrivateConditions} scheduling condition{numOfPrivateConditions !== 1 ? 's' : ''}
            {numOfPrivateConditions > 1 ? 'are' : 'is'} private and not shown
          {/if}
        </div>
      {:else}
        <div class="private-label">
          {#if numOfPrivateConditions > 0}
            {numOfPrivateConditions} scheduling condition{numOfPrivateConditions !== 1 ? 's' : ''}
            {numOfPrivateConditions > 1 ? 'are' : 'is'} private and not shown
          {/if}
        </div>
        {#each filteredSchedulingConditionSpecs as specCondition (specCondition.condition_id)}
          {#if $schedulingConditionsMap[specCondition.condition_id]}
            <SchedulingCondition
              condition={$schedulingConditionsMap[specCondition.condition_id]}
              conditionPlanSpec={specCondition}
              hasEditPermission={$plan ? featurePermissions.schedulingConditionsPlanSpec.canUpdate(user, $plan) : false}
              modelId={$plan?.model.id}
              permissionError={$planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to edit scheduling conditions for this plan.'}
              on:updateConditionPlanSpec={onUpdateCondition}
            />
          {/if}
        {/each}
      {/if}
    </div>
  </svelte:fragment>
</Panel>

<style>
  .private-label {
    color: #e6b300;
  }

  .st-button {
    white-space: nowrap;
  }
</style>
