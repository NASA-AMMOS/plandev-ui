<svelte:options immutable={true} />

<script lang="ts">
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import { afterUpdate, beforeUpdate } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SchedulingDefinitionType } from '../../enums/scheduling';
  import { Status } from '../../enums/status';
  import { plan, planReadOnly } from '../../stores/plan';
  import {
    allowedSchedulingGoalSpecs,
    enableScheduling,
    getSchedulingGoalDefaultsKey,
    schedulingAnalysisStatus,
    schedulingGoalArgumentDefaultsMap,
    schedulingGoalSpecifications,
    schedulingGoalsLoading,
    schedulingGoalsMap,
    setSchedulingGoalArgumentDefaults,
  } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, SchedulingGoalEffectiveArgumentsMap } from '../../types/parameter';
  import type {
    SchedulingGoalMetadata,
    SchedulingGoalPlanSpecification,
    SchedulingGoalPlanSpecificationUpdate,
  } from '../../types/scheduling';
  import type { ValueSchemaStruct } from '../../types/schema';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions, isAdminRole } from '../../utilities/permissions';
  import CollapsibleListControls from '../CollapsibleListControls.svelte';
  import Loading from '../Loading.svelte';
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
  $: visibleSchedulingGoalSpecs = ($allowedSchedulingGoalSpecs || []).filter(({ goal_metadata: goalMetadata }) => {
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
  $: numOfPrivateGoals = ($schedulingGoalSpecifications || []).length - visibleSchedulingGoalSpecs.length;
  $: if ($plan) {
    hasAnalyzePermission =
      featurePermissions.schedulingGoalsPlanSpec.canAnalyze(user, $plan, $plan.model) && !$planReadOnly;
    hasSpecEditPermission = featurePermissions.schedulingGoalsPlanSpec.canUpdate(user, $plan) && !$planReadOnly;
    hasRunPermission = featurePermissions.schedulingGoalsPlanSpec.canRun(user, $plan, $plan.model) && !$planReadOnly;
  }
  $: status = $schedulingAnalysisStatus;

  // Fetch effective arguments for JAR type goals when specs and metadata are available
  // Need to depend on both visibleSchedulingGoalSpecs and $schedulingGoalsMap to avoid race condition
  $: if (visibleSchedulingGoalSpecs.length > 0 && Object.keys($schedulingGoalsMap).length > 0) {
    fetchJarGoalEffectiveArguments(visibleSchedulingGoalSpecs);
  }

  async function fetchJarGoalEffectiveArguments(specs: SchedulingGoalPlanSpecification[]) {
    // Collect JAR type goals that need defaults fetched
    const goalsToFetch: Array<{ arguments: Record<string, unknown>; id: number; revision: number }> = [];
    const goalInvocationMap: Map<string, { invocationId: number; revision: number }> = new Map();

    for (const spec of specs) {
      const goalMetadata = $schedulingGoalsMap[spec.goal_id];
      if (!goalMetadata) {
        continue;
      }

      // Get the effective revision (selected or latest)
      const effectiveRevision =
        spec.goal_revision !== null ? spec.goal_revision : (goalMetadata.versions[0]?.revision ?? 0);

      // Find the version to check if it's JAR type
      const version = goalMetadata.versions.find(v => v.revision === effectiveRevision) ?? goalMetadata.versions[0];

      if (version?.type === SchedulingDefinitionType.JAR) {
        const key = getSchedulingGoalDefaultsKey(spec.goal_invocation_id, effectiveRevision);

        // Only fetch if not already cached
        if (!$schedulingGoalArgumentDefaultsMap[key]) {
          goalsToFetch.push({
            arguments: {},
            id: goalMetadata.id,
            revision: effectiveRevision,
          });
          goalInvocationMap.set(getSchedulingGoalDefaultsKey(goalMetadata.id, effectiveRevision), {
            invocationId: spec.goal_invocation_id,
            revision: effectiveRevision,
          });
        }
      }
    }

    if (goalsToFetch.length > 0) {
      const results = await effects.getSchedulingProcedureEffectiveArguments(goalsToFetch, user);

      for (const result of results) {
        const mapping = goalInvocationMap.get(getSchedulingGoalDefaultsKey(result.id, result.revision));
        if (mapping) {
          setSchedulingGoalArgumentDefaults(mapping.invocationId, mapping.revision, result.arguments);
        }
      }
    }
  }

  function computeDefaultArgumentsForGoal(
    spec: SchedulingGoalPlanSpecification,
    goalsMapValue: Record<string, SchedulingGoalMetadata>,
    defaultsMapValue: SchedulingGoalEffectiveArgumentsMap,
  ): ArgumentsMap {
    const goalMetadata = goalsMapValue[spec.goal_id];
    if (!goalMetadata) {
      return {};
    }

    const effectiveRevision =
      spec.goal_revision !== null ? spec.goal_revision : (goalMetadata.versions[0]?.revision ?? 0);
    const version = goalMetadata.versions.find(v => v.revision === effectiveRevision) ?? goalMetadata.versions[0];

    // Only JAR type goals have procedural defaults
    if (version?.type !== SchedulingDefinitionType.JAR) {
      return {};
    }

    const key = getSchedulingGoalDefaultsKey(spec.goal_invocation_id, effectiveRevision);
    return defaultsMapValue[key] ?? {};
  }

  // Reactively compute default arguments lookup keyed by invocation_id
  // This ensures the template re-renders when $schedulingGoalArgumentDefaultsMap changes
  $: goalDefaultArgumentsLookup = ($allowedSchedulingGoalSpecs || []).reduce(
    (acc, spec) => {
      acc[spec.goal_invocation_id] = computeDefaultArgumentsForGoal(
        spec,
        $schedulingGoalsMap,
        $schedulingGoalArgumentDefaultsMap,
      );
      return acc;
    },
    {} as Record<number, ArgumentsMap>,
  );

  function onManageGoals() {
    effects.managePlanSchedulingGoals(user);
  }

  async function onUpdateGoal(event: CustomEvent<SchedulingGoalPlanSpecificationUpdate>) {
    const {
      detail: { goal_metadata, files = [], ...goalPlanSpec },
    } = event;

    if ($plan) {
      // Get the associated parameter schema, or the latest one if goal_revision does not exist.
      const matchingVersion = goal_metadata?.versions.find(
        v => goalPlanSpec.goal_revision != null && v.revision === goalPlanSpec.goal_revision,
      );
      const fallbackVersion = goal_metadata?.versions.reduce((latest, current) =>
        current.revision > (latest?.revision ?? -Infinity) ? current : latest,
      );
      const parameterSchema = (matchingVersion?.parameter_schema ??
        fallbackVersion?.parameter_schema ??
        null) as ValueSchemaStruct;

      await effects.updateSchedulingGoalPlanSpecification(
        $plan,
        {
          ...goalPlanSpec,
        },
        parameterSchema,
        files ?? undefined,
        user,
      );
    }
  }

  async function onDuplicateGoalInvocation(event: CustomEvent<SchedulingGoalPlanSpecification>) {
    const {
      detail: { goal_metadata, goal_invocation_id, priority, ...goalPlanSpec },
    } = event;

    if ($plan) {
      await effects.createSchedulingGoalPlanSpecification(
        {
          ...goalPlanSpec,
          priority: priority + 1,
        },
        user,
      );
    }
  }

  async function onDeleteGoalInvocation(event: CustomEvent<SchedulingGoalPlanSpecification>) {
    const {
      detail: { goal_metadata, specification_id, ...goalPlanSpec },
    } = event;

    if ($plan) {
      await effects.deleteSchedulingGoalInvocations($plan, specification_id, [goalPlanSpec.goal_invocation_id], user);
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
      {#if $schedulingGoalsLoading}
        <div class="pt-1">
          <Loading />
        </div>
      {:else if !filteredSchedulingGoalSpecs.length}
        <div class="st-typography-label pt-1">No scheduling goals found</div>
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
        {#each filteredSchedulingGoalSpecs as specGoal, specIndex (specGoal.goal_invocation_id)}
          {#if $schedulingGoalsMap[specGoal.goal_id]}
            <SchedulingGoal
              defaultArguments={goalDefaultArgumentsLookup[specGoal.goal_invocation_id] ?? {}}
              editPermissionError={$planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to edit scheduling goals for this plan.'}
              hasEditPermission={hasSpecEditPermission}
              hasReadPermission={featurePermissions.schedulingGoals.canRead(user)}
              goal={$schedulingGoalsMap[specGoal.goal_id]}
              goalPlanSpec={specGoal}
              modelId={$plan?.model?.id}
              shouldShowDownButton={specIndex < filteredSchedulingGoalSpecs.length - 1}
              shouldShowUpButton={(specGoal?.priority ?? 0) > 0}
              on:updateGoalPlanSpec={onUpdateGoal}
              on:duplicateGoalInvocation={onDuplicateGoalInvocation}
              on:deleteGoalInvocation={onDeleteGoalInvocation}
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
