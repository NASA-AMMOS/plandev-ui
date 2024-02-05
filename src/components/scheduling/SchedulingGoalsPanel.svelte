<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import { afterUpdate, beforeUpdate } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { plan, planReadOnly } from '../../stores/plan';
  import { enableScheduling, schedulingSpecGoals, schedulingStatus, selectedSpecId } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { SchedulingSpecGoal } from '../../types/scheduling';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import CollapsibleListControls from '../CollapsibleListControls.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import SchedulingGoal from './goals/SchedulingGoal.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let activeElement: HTMLElement;
  let filterText: string = '';
  let filteredSchedulingSpecGoals: SchedulingSpecGoal[] = [];
  let hasAnalyzePermission: boolean = false;
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasGoalEditPermission: boolean = false;
  let hasSpecEditPermission: boolean = false;
  let hasRunPermission: boolean = false;

  $: filteredSchedulingSpecGoals = $schedulingSpecGoals.filter(spec => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = spec.goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  $: if ($plan) {
    hasAnalyzePermission = featurePermissions.schedulingGoals.canAnalyze(user, $plan, $plan.model) && !$planReadOnly;
    hasCreatePermission = featurePermissions.schedulingGoals.canCreate(user, $plan) && !$planReadOnly;
    hasDeletePermission = featurePermissions.schedulingGoals.canDelete(user, $plan) && !$planReadOnly;
    hasGoalEditPermission = featurePermissions.schedulingGoals.canUpdate(user, $plan) && !$planReadOnly;
    hasSpecEditPermission = featurePermissions.schedulingGoals.canUpdateSpecification(user, $plan) && !$planReadOnly;
    hasRunPermission = featurePermissions.schedulingGoals.canRun(user, $plan, $plan.model) && !$planReadOnly;
  }

  // Manually keep focus as scheduling goal elements are re-ordered.
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
    <GridMenu {gridSection} title="Scheduling Goals" />
    <PanelHeaderActions status={$schedulingStatus} indeterminate>
      <PanelHeaderActionButton
        title="Analyze"
        on:click={() => effects.schedule(true, $plan, user)}
        disabled={!$enableScheduling}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasAnalyzePermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to run a scheduling analysis',
            },
          ],
        ]}
      >
        <ChecklistIcon />
      </PanelHeaderActionButton>
      <PanelHeaderActionButton
        title="Schedule"
        on:click={() => effects.schedule(false, $plan, user)}
        disabled={!$enableScheduling}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasRunPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to run scheduling',
            },
          ],
        ]}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CollapsibleListControls
      placeholder="Filter scheduling goals"
      on:input={event => (filterText = event.detail.value)}
    >
      <button
        slot="right"
        name="new-scheduling-goal"
        class="st-button secondary"
        use:permissionHandler={{
          hasPermission: hasCreatePermission,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to create scheduling goals for this plan.',
        }}
        on:click={() =>
          window.open(`${base}/scheduling/goals/new?modelId=${$plan?.model.id}&&specId=${$selectedSpecId}`, '_blank')}
      >
        New
      </button>
    </CollapsibleListControls>
    <div class="pt-2">
      {#if !filteredSchedulingSpecGoals.length}
        <div class="pt-1 st-typography-label">No scheduling goals found</div>
      {:else}
        {#each filteredSchedulingSpecGoals as specGoal (specGoal.goal.id)}
          <SchedulingGoal
            enabled={specGoal.enabled}
            {hasDeletePermission}
            {hasGoalEditPermission}
            {hasSpecEditPermission}
            goal={specGoal.goal}
            priority={specGoal.priority}
            plan={$plan}
            simulateAfter={specGoal.simulate_after}
            specificationId={specGoal.specification_id}
            {user}
            permissionError={$planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to edit scheduling goals for this plan.'}
          />
        {/each}
      {/if}
    </div>
  </svelte:fragment>
</Panel>
