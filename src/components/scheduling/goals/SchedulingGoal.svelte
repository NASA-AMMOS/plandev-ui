<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../../enums/planStatusMessages';
  import { SearchParameters } from '../../../enums/searchParameters';
  import type { FormParameter } from '../../../types/parameter';
  import type {
    SchedulingGoalDefinition,
    SchedulingGoalMetadata,
    SchedulingGoalPlanSpecification,
  } from '../../../types/scheduling';
  import { getTarget } from '../../../utilities/generic';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { tooltip } from '../../../utilities/tooltip';
  import Collapse from '../../Collapse.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import Parameters from '../../parameters/Parameters.svelte';
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';

  export let goal: SchedulingGoalMetadata;
  export let goalPlanSpec: SchedulingGoalPlanSpecification;
  export let hasEditPermission: boolean = false;
  export let modelId: number | undefined;
  export let permissionError: string = '';
  export let readOnly: boolean = false;

  const dispatch = createEventDispatcher<{
    deleteGoalInvocation: SchedulingGoalPlanSpecification;
    duplicateGoalInvocation: SchedulingGoalPlanSpecification;
    updateGoalPlanSpec: SchedulingGoalPlanSpecification;
  }>();

  let enabled: boolean;
  let priority: number;
  let revisions: number[] = [];
  let schedulingGoalInput: HTMLInputElement;
  let simulateGoal: boolean = false;
  let upButtonHidden: boolean = false;
  let formParameters: FormParameter[] = [];
  let version: Pick<SchedulingGoalDefinition, 'type' | 'revision' | 'analyses' | 'parameter_schema'> | undefined =
    undefined;

  $: revisions = goal.versions.map(({ revision }) => revision);
  $: {
    enabled = goalPlanSpec.enabled;
    priority = goalPlanSpec.priority;
    upButtonHidden = priority <= 0;
    simulateGoal = goalPlanSpec.simulate_after; // Copied to local var to reflect changed values immediately in the UI
  }

  $: {
    version = goalPlanSpec.goal_metadata?.versions[0]; // plan gql query already orders by version and limits 1
    const schema = version?.parameter_schema;

    if (schema && schema.type === 'struct') {
      formParameters = Object.entries(schema.items).map(([name, subschema], i) => ({
        errors: null,
        name,
        order: i,
        required: true,
        schema: subschema,
        value: (goalPlanSpec && goalPlanSpec.arguments && goalPlanSpec.arguments[name]) || '',
        valueSource: 'none',
      }));
    } else {
      formParameters = [];
    }
  }

  function focusInput() {
    if (document.activeElement !== schedulingGoalInput) {
      schedulingGoalInput.focus();
    }

    return true;
  }

  function onEnable(event: Event) {
    const { value: enabled } = getTarget(event);
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      enabled: enabled as boolean,
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
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      goal_revision: revision === '' ? null : parseInt(`${revision}`),
    });
  }

  function simulateAfter(simulateAfter: boolean) {
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      simulate_after: simulateAfter,
    });
  }

  function duplicateGoalInvocation() {
    dispatch('duplicateGoalInvocation', {
      ...goalPlanSpec,
    });
  }

  function deleteGoalInvocation() {
    dispatch('deleteGoalInvocation', {
      ...goalPlanSpec,
    });
  }

  function updatePriority(priority: number) {
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      priority,
    });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const {
      detail: { name, value },
    } = event;
    dispatch('updateGoalPlanSpec', {
      ...goalPlanSpec,
      arguments: { ...goalPlanSpec.arguments, [name]: value },
    });
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
          on:change={onEnable}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError,
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
        <SchedulingGoalAnalysesBadge analyses={goal.analyses} {enabled} />
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
              permissionError,
            }}
          />
          {#if hasEditPermission}
            <div class="priority-buttons">
              <button
                use:tooltip={{ content: 'Increase Priority', placement: 'top' }}
                class="st-button tertiary up-button"
                class:hidden={upButtonHidden}
                tabindex={upButtonHidden ? -1 : 0}
                on:click={() => focusInput() && updatePriority(priority - 1)}
              >
                <CaretUpFillIcon />
              </button>
              <button
                use:tooltip={{ content: 'Decrease Priority', placement: 'top' }}
                class="st-button tertiary down-button"
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
            permissionError: readOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to edit plan goals',
          }}
        >
          <option value={null}>Always use latest</option>
          {#each revisions as revision, index}
            <option value={revision}>{revision}{index === 0 ? ' (Latest)' : ''}</option>
          {/each}
        </select>
      </div>
    </svelte:fragment>

    <Collapse title="Parameters" className="scheduling-goal-analysis-activities" defaultExpanded={true}>
      <Parameters disabled={false} expanded={true} {formParameters} on:change={onChangeFormParameters} />
    </Collapse>

    <SchedulingGoalAnalysesActivities analyses={goal.analyses} />

    <svelte:fragment slot="contextMenuContent">
      <ContextMenuItem
        on:click={() =>
          window.open(
            `${base}/scheduling/goals/edit/${goal.id}${
              goalPlanSpec.goal_revision !== null
                ? `?${SearchParameters.REVISION}=${goalPlanSpec.goal_revision}&${SearchParameters.MODEL_ID}=${modelId}`
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
        View Goal
      </ContextMenuItem>
      <ContextMenuItem
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
      </ContextMenuItem>
      {#if version?.type === 'JAR'}
        <ContextMenuItem on:click={duplicateGoalInvocation}>Duplicate Invocation</ContextMenuItem>
        <ContextMenuItem on:click={deleteGoalInvocation}>Delete Invocation</ContextMenuItem>
      {/if}
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
  }

  .scheduling-goal-simulate-toggle input {
    margin-left: 0;
  }

  .scheduling-goal.disabled :global(*:not(.collapse-icon *):not(.context-menu *)) {
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
