<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import type { Argument, FormParameter } from '../../../types/parameter';
  import type {
    SchedulingGoalDefinition,
    SchedulingGoalMetadata,
    SchedulingGoalPlanSpecification,
    SchedulingGoalPlanSpecificationUpdate,
  } from '../../../types/scheduling';
  import { getTarget } from '../../../utilities/generic';
  import { getCleansedStructArguments } from '../../../utilities/parameters';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { tooltip } from '../../../utilities/tooltip';
  import Collapse from '../../Collapse.svelte';
  import Parameters from '../../parameters/Parameters.svelte';
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';

  export let editPermissionError: string = 'You do not have permission to edit scheduling goals for this plan.';
  export let goal: SchedulingGoalMetadata;
  export let goalPlanSpec: SchedulingGoalPlanSpecification;
  export let hasEditPermission: boolean = false;
  export let hasReadPermission: boolean = false;
  export let modelId: number | undefined;
  export let readPermissionError: string = 'You do not have permission to view this scheduling goal.';
  export let shouldShowUpButton: boolean | undefined = false;
  export let shouldShowDownButton: boolean | undefined = false;

  const dispatch = createEventDispatcher<{
    deleteGoalInvocation: SchedulingGoalPlanSpecification;
    duplicateGoalInvocation: SchedulingGoalPlanSpecification;
    updateGoalPlanSpec: SchedulingGoalPlanSpecificationUpdate;
  }>();

  let enabled: boolean;
  let priority: number;
  let revisions: number[] = [];
  let schedulingGoalInput: HTMLInputElement;
  let simulateGoal: boolean = false;
  let formParameters: FormParameter[] = [];
  let version: Pick<SchedulingGoalDefinition, 'type' | 'revision' | 'analyses' | 'parameter_schema'> | undefined =
    undefined;

  $: revisions = goal.versions.map(({ revision }) => revision);
  $: {
    enabled = goalPlanSpec.enabled;
    priority = goalPlanSpec.priority;
    simulateGoal = goalPlanSpec.simulate_after; // Copied to local var to reflect changed values immediately in the UI
  }

  $: {
    const version = getSpecVersion(goal, goalPlanSpec.goal_revision);

    const schema = version?.parameter_schema;

    if (schema && schema.type === 'struct') {
      formParameters = Object.entries(schema.items).map(([name, subschema], i) => {
        return {
          errors: null,
          name,
          order: i,
          required: true,
          schema: subschema,
          value:
            goalPlanSpec && goalPlanSpec.arguments && goalPlanSpec.arguments[name] != null
              ? goalPlanSpec.arguments[name]
              : '',
          valueSource: 'none',
        };
      });
    } else {
      formParameters = [];
    }
  }

  function getSpecVersion(
    goalMetadata: SchedulingGoalMetadata,
    revision: number | string | null,
  ): Pick<SchedulingGoalDefinition, 'type' | 'revision' | 'analyses' | 'parameter_schema'> | undefined {
    if (revision != null && revision !== '') {
      const revisionNumber = parseInt(`${revision}`);
      version = goalMetadata.versions.find(v => v.revision === revisionNumber);
    } else {
      // if the `goal_revision` is null, that means to use the latest version of the definition
      // the query for this goal returns the versions in descending order, so the first entry in the array should correspond to the latest version
      version = goalMetadata.versions[0];
    }
    return version;
  }

  function focusInput() {
    if (document.activeElement !== schedulingGoalInput) {
      schedulingGoalInput.focus();
    }

    return true;
  }

  function onEnable(event: Event) {
    const { value: enabledUpdate } = getTarget(event);
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      enabled: enabledUpdate as boolean,
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowUp') {
        if (priority > 0) {
          updatePriority(priority - 1);
        }
      } else {
        updatePriority(priority + 1);
      }
    }
  }

  function onUpdateRevision(event: Event) {
    const { value: revision } = getTarget(event);

    const version = getSpecVersion(goal, revision as string | number | null);
    const schema = version?.parameter_schema;

    let cleansedArguments: Argument = getCleansedStructArguments(goalPlanSpec.arguments, schema);
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      arguments: cleansedArguments,
      files: [],
      goal_revision: revision === '' ? null : parseInt(`${revision}`),
    });
  }

  function simulateAfter(simulateAfterUpdate: boolean) {
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      simulate_after: simulateAfterUpdate,
    });
  }

  function onDuplicateGoalInvocation() {
    dispatch('duplicateGoalInvocation', {
      ...goalPlanSpec,
    });
  }

  function onDeleteGoalInvocation() {
    dispatch('deleteGoalInvocation', goalPlanSpec);
  }

  function updatePriority(priorityUpdate: number) {
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      priority: priorityUpdate,
    });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const {
      detail: { name, value, file },
    } = event;

    if (formParameters.length) {
      const schema = version?.parameter_schema;
      let cleansedArguments: Argument = getCleansedStructArguments(goalPlanSpec.arguments, schema);
      dispatch('updateGoalPlanSpec', {
        ...goalPlanSpec,
        arguments: { ...cleansedArguments, [name]: value },
        files: file ? [file] : [],
      });
    }
  }
</script>

<div class="scheduling-goal" class:disabled={!enabled}>
  <Collapse title={goal.name} tooltipContent={goal.name} defaultExpanded={false}>
    <svelte:fragment slot="left">
      <div class="left-content">
        <input
          type="checkbox"
          checked={enabled}
          style:cursor="pointer"
          class="m-1"
          on:change={onEnable}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: editPermissionError,
          }}
          use:tooltip={{
            content: `${enabled ? 'Disable goal' : 'Enable goal'} on plan`,
            disabled: !hasEditPermission,
            placement: 'top',
          }}
        />
      </div>
    </svelte:fragment>
    <svelte:fragment slot="right">
      <div class="right-content" role="none" on:click|stopPropagation>
        <SchedulingGoalAnalysesBadge
          analyses={(goal.analyses ?? []).filter(
            analyses => analyses.goal_invocation_id === goalPlanSpec.goal_invocation_id,
          )}
          {enabled}
        />
        <div class="priority-container">
          <input
            bind:this={schedulingGoalInput}
            bind:value={priority}
            class="st-input"
            disabled={!enabled}
            min="0"
            style:width="68px"
            type="number"
            on:change={() => updatePriority(priority)}
            on:keydown={onKeyDown}
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: editPermissionError,
            }}
          />
          {#if hasEditPermission}
            <div class="priority-buttons">
              <button
                use:tooltip={{ content: 'Increase Priority', placement: 'top' }}
                class="st-button tertiary up-button"
                class:hidden={!shouldShowUpButton}
                tabindex={shouldShowUpButton ? -1 : 0}
                on:click={() => focusInput() && updatePriority(priority - 1)}
              >
                <CaretUpFillIcon />
              </button>
              <button
                use:tooltip={{ content: 'Decrease Priority', placement: 'top' }}
                class="st-button tertiary down-button"
                class:hidden={!shouldShowDownButton}
                tabindex={shouldShowDownButton ? -1 : 0}
                on:click={() => focusInput() && updatePriority(priority + 1)}
              >
                <CaretDownFillIcon />
              </button>
            </div>
          {/if}
        </div>
        <select
          class="st-select"
          value={goalPlanSpec.goal_revision}
          on:change={onUpdateRevision}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: editPermissionError,
          }}
        >
          <option value={null}>Always use latest</option>
          {#each revisions as revision, index}
            <option value={revision}>{revision}{index === 0 ? ' (Latest)' : ''}</option>
          {/each}
        </select>
      </div>
    </svelte:fragment>

    {#if formParameters.length > 0}
      <Collapse title="Parameters" className="scheduling-goal-analysis-activities" defaultExpanded={true}>
        <Parameters disabled={false} expanded={true} {formParameters} on:change={onChangeFormParameters} />
      </Collapse>
    {/if}

    <SchedulingGoalAnalysesActivities analyses={goal.analyses} />
    <svelte:fragment slot="contextMenuContent">
      <div
        use:permissionHandler={{
          hasPermission: hasReadPermission,
          permissionError: readPermissionError,
        }}
      >
        <ContextMenu.Item
          size="sm"
          disabled={!hasReadPermission}
          on:click={() =>
            window.open(
              `${base}/scheduling/goals/edit/${goal.id}${
                goalPlanSpec.goal_revision !== null
                  ? `?${SearchParameters.REVISION}=${goalPlanSpec.goal_revision}&${SearchParameters.MODEL_ID}=${modelId}`
                  : ''
              }`,
              '_blank',
            )}
        >
          View Goal
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasEditPermission,
          permissionError: editPermissionError,
        }}
      >
        <ContextMenu.Item size="sm" disabled={!hasEditPermission}>
          <div
            class="scheduling-goal-simulate-toggle"
            role="none"
            on:click|stopPropagation={() => {
              simulateGoal = !simulateGoal;
              simulateAfter(simulateGoal);
            }}
          >
            <input bind:checked={simulateGoal} style:cursor="pointer" type="checkbox" /> Simulate After
          </div>
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasEditPermission,
          permissionError: editPermissionError,
        }}
      >
        <ContextMenu.Item size="sm" disabled={!hasEditPermission} on:click={onDuplicateGoalInvocation}>
          Duplicate Invocation
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasEditPermission,
          permissionError: editPermissionError,
        }}
      >
        <ContextMenu.Item size="sm" disabled={!hasEditPermission} on:click={onDeleteGoalInvocation}>
          Delete Invocation
        </ContextMenu.Item>
      </div>
    </svelte:fragment>
  </Collapse>
</div>

<style>
  .scheduling-goal {
    align-items: normal;
    cursor: default;
    display: flex;
    flex-direction: column;
  }

  .scheduling-goal-simulate-toggle {
    align-items: center;
    display: flex;
    gap: 4px;
  }

  .scheduling-goal-simulate-toggle input {
    margin-left: 0;
  }

  .scheduling-goal.disabled :global(*:not(.collapse-icon *)) {
    color: var(--st-gray-30) !important;
  }

  .right-content {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  /* Hide number input "spinners" (up and down arrows) in WebKit browsers ... */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* ... and Firefox */
  input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
    padding-right: 32px;
  }

  .priority-buttons {
    align-items: center;
    display: flex;
    margin-left: -36px;
  }

  .priority-buttons :global(button) {
    align-items: center;
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
    min-width: 0;
    padding: 0;
    pointer-events: painted;
  }

  .priority-buttons :global(button):hover {
    background-color: transparent !important;
    color: var(--st-gray-60);
  }

  .priority-container {
    display: flex;
  }

  .down-button {
    margin-left: -3px;
    margin-right: 2px;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
