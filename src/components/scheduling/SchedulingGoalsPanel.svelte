<svelte:options immutable={true} />

<script lang="ts">
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import { afterUpdate, beforeUpdate } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { Status } from '../../enums/status';
  import { plan, planReadOnly } from '../../stores/plan';
  import {
    allowedSchedulingGoalSpecs,
    enableScheduling,
    schedulingAnalysisStatus,
    schedulingGoalSpecifications,
    schedulingGoalsMap,
  } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { SchedulingGoalPlanSpecification } from '../../types/scheduling';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions, isAdminRole } from '../../utilities/permissions';
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
  let filteredSchedulingGoalSpecs: SchedulingGoalPlanSpecification[] = [];
  let hasAnalyzePermission: boolean = false;
  let hasSpecEditPermission: boolean = false;
  let hasRunPermission: boolean = false;
  let numOfPrivateGoals: number = 0;
  let status: Status | null = null;
  let visibleSchedulingGoalSpecs: SchedulingGoalPlanSpecification[] = [];

  // TODO: remove this after db merge as it becomes redundant
  $: visibleSchedulingGoalSpecs = $allowedSchedulingGoalSpecs.filter(({ goal_metadata: goalMetadata }) => {
    if (goalMetadata) {
      const { public: isPublic, owner } = goalMetadata;
      if (!isPublic && !isAdminRole(user?.activeRole)) {
        return owner === user?.id;
      }
      return true;
    }
    return false;
  });
  $: filteredSchedulingGoalSpecs = visibleSchedulingGoalSpecs
    .filter(spec => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesName = spec.goal_metadata?.name.toLocaleLowerCase().includes(filterTextLowerCase);
      return includesName;
    })
    .sort((goalSpecA, goalSpecB) => {
      if (goalSpecA.priority < goalSpecB.priority) {
        return -1;
      }
      if (goalSpecA.priority > goalSpecB.priority) {
        return 1;
      }
      return 0;
    });
  $: numOfPrivateGoals = $schedulingGoalSpecifications.length - visibleSchedulingGoalSpecs.length;
  $: if ($plan) {
    hasAnalyzePermission =
      featurePermissions.schedulingGoalsPlanSpec.canAnalyze(user, $plan, $plan.model) && !$planReadOnly;
    hasSpecEditPermission = featurePermissions.schedulingGoalsPlanSpec.canUpdate(user, $plan) && !$planReadOnly;
    hasRunPermission = featurePermissions.schedulingGoalsPlanSpec.canRun(user, $plan, $plan.model) && !$planReadOnly;
  }
  $: status = $schedulingAnalysisStatus;

  function onManageGoals() {
    effects.managePlanSchedulingGoals(user);
  }

  async function onUpdateGoal(event: CustomEvent<SchedulingGoalPlanSpecification>) {
    const {
      detail: { goal_metadata, specification_id, ...goalPlanSpec },
    } = event;

    if ($plan) {
      await effects.updateSchedulingGoalPlanSpecification(
        $plan,
        specification_id,
        {
          ...goalPlanSpec,
          specification_id,
        },
        user,
      );
    }
  }

  function onAnalyze() {
    status = Status.Pending;
    effects.schedule(true, $plan, user);
  }

  function onSchedule() {
    status = Status.Pending;
    effects.schedule(false, $plan, user);
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
    <PanelHeaderActions {status} indeterminate>
      <PanelHeaderActionButton
        title="Analyze"
        on:click={onAnalyze}
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
        on:click={onSchedule}
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
      <svelte:fragment slot="right">
        <button
          name="manage-goals"
          class="st-button secondary"
          use:permissionHandler={{
            hasPermission: $plan ? featurePermissions.schedulingGoals.canCreate(user) && !$planReadOnly : false,
            permissionError: $planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to update scheduling goals',
          }}
          on:click|stopPropagation={onManageGoals}
        >
          Manage Goals
        </button>
      </svelte:fragment>
    </CollapsibleListControls>
    <div class="pt-2">
      {#if !filteredSchedulingGoalSpecs.length}
        <div class="pt-1 st-typography-label">No scheduling goals found</div>
        <div class="private-label">
          {#if numOfPrivateGoals > 0}
            {numOfPrivateGoals} scheduling goal{numOfPrivateGoals !== 1 ? 's' : ''}
            {numOfPrivateGoals > 1 ? 'are' : 'is'} private and not shown
          {/if}
        </div>
      {:else}
        <div class="private-label">
          {#if numOfPrivateGoals > 0}
            {numOfPrivateGoals} scheduling goal{numOfPrivateGoals !== 1 ? 's' : ''}
            {numOfPrivateGoals > 1 ? 'are' : 'is'} private and not shown
          {/if}
        </div>
        {#each filteredSchedulingGoalSpecs as specGoal (specGoal.goal_id)}
          {#if $schedulingGoalsMap[specGoal.goal_id]}
            <SchedulingGoal
              hasEditPermission={hasSpecEditPermission}
              goal={$schedulingGoalsMap[specGoal.goal_id]}
              goalPlanSpec={specGoal}
              modelId={$plan?.model.id}
              permissionError={$planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to edit scheduling goals for this plan.'}
              on:updateGoalPlanSpec={onUpdateGoal}
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
