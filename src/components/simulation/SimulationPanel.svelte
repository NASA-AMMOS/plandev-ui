<svelte:options immutable={true} />

<script lang="ts">
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import { field } from '../../stores/form';
  import { plan } from '../../stores/plan';
  import {
    enableSimulation,
    simulation,
    simulationDatasetId,
    simulationDatasetIds,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import type { FieldStore } from '../../types/form';
  import type { FormParameter, ParametersMap } from '../../types/parameter';
  import type { Simulation } from '../../types/simulation';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import { Status } from '../../utilities/status';
  import { getDoyTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Input from '../form/Input.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import DatePickerActionButton from '../ui/DatePicker/DatePickerActionButton.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';

  export let gridSection: ViewGridSection;

  let endTimeDoy: string;
  let endTimeDoyField: FieldStore<string>;
  let formParameters: FormParameter[] = [];
  let startTimeDoy: string;
  let startTimeDoyField: FieldStore<string>;
  let modelParametersMap: ParametersMap = {};

  $: startTimeDoy =
    $simulation && $simulation.simulation_start_time
      ? getDoyTime(new Date($simulation.simulation_start_time))
      : $plan.start_time_doy;
  $: startTimeDoyField = field<string>(startTimeDoy, [required, timestamp]);
  $: endTimeDoy =
    $simulation && $simulation.simulation_end_time
      ? getDoyTime(new Date($simulation.simulation_end_time))
      : $plan.end_time_doy;
  $: endTimeDoyField = field<string>(endTimeDoy, [required, timestamp]);

  $: modelParametersMap = $plan?.model?.parameters?.parameters ?? {};
  $: if ($simulation) {
    effects
      .getEffectiveModelArguments($plan.model.id, $simulation.arguments)
      .then(({ arguments: defaultArguments }) => {
        // Displayed simulation arguments are either user input arguments,
        // simulation template arguments, or default arguments.
        // User input arguments take precedence over simulation template arguments,
        // which take precedence over default arguments.
        const defaultArgumentsMap = {
          ...defaultArguments,
          ...($simulation?.template?.arguments ?? {}),
        };
        formParameters = getFormParameters(modelParametersMap, $simulation.arguments, [], {}, defaultArgumentsMap);
      });
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const newArgumentsMap = getArguments($simulation?.arguments, formParameter);
    const newFiles: File[] = formParameter.file ? [formParameter.file] : [];
    const newSimulation: Simulation = {
      ...$simulation,
      arguments: newArgumentsMap,
    };

    effects.updateSimulation(newSimulation, newFiles);
  }

  async function onChangeSimulationTemplate(event: Event) {
    const { value } = getTarget(event);
    const id = value as number;
    const template = { ...$simulation?.template, id };
    const newSimulation: Simulation = { ...$simulation, template };

    effects.updateSimulation(newSimulation);
  }

  function updateStartTime(doyString: string) {
    const newSimulation: Simulation = { ...$simulation, simulation_start_time: doyString };
    effects.updateSimulation(newSimulation);
  }

  function updateEndTime(doyString: string) {
    const newSimulation: Simulation = { ...$simulation, simulation_end_time: doyString };
    effects.updateSimulation(newSimulation);
  }

  function onUpdateStartTime() {
    if ($startTimeDoyField.valid && startTimeDoy !== $startTimeDoyField.value) {
      updateStartTime($startTimeDoyField.value);
    }
  }

  function onUpdateEndTime() {
    if ($endTimeDoyField.valid && endTimeDoy !== $endTimeDoyField.value) {
      updateEndTime($endTimeDoyField.value);
    }
  }

  async function onPlanStartTimeClick() {
    await startTimeDoyField.validateAndSet($plan.start_time_doy);
    updateStartTime($startTimeDoyField.value);
  }

  async function onPlanEndTimeClick() {
    await endTimeDoyField.validateAndSet($plan.end_time_doy);
    updateEndTime($endTimeDoyField.value);
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Simulation" />
    <PanelHeaderActions status={$simulationStatus}>
      <PanelHeaderActionButton
        disabled={!$enableSimulation}
        tooltipContent={$simulationStatus === Status.Complete || $simulationStatus === Status.Failed
          ? 'Simulation up-to-date'
          : ''}
        title="Simulate"
        showLabel
        on:click={() => effects.simulate()}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <details open>
        <summary>General</summary>
        <div class="details-body">
          <Input layout="inline">
            <label use:tooltip={{ content: 'Simulation Dataset ID', placement: 'top' }} for="simulationDatasetId">
              Simulation Dataset ID
            </label>
            <select bind:value={$simulationDatasetId} class="st-select w-100" name="simulationDatasetId">
              {#if !$simulationDatasetIds.length}
                <option value={-1}>No Simulation Datasets</option>
              {:else}
                <option value={-1} />
                {#each $simulationDatasetIds as simDatasetId}
                  <option value={simDatasetId}>
                    {simDatasetId}
                  </option>
                {/each}
              {/if}
            </select>
          </Input>
          <Input layout="inline">
            <label use:tooltip={{ content: 'Template Name', placement: 'top' }} for="simulation-templates">
              Template Name
            </label>
            <select
              class="st-select w-100"
              data-type="number"
              disabled={!$simulationTemplates.length}
              name="simulation-templates"
              value={$simulation?.template?.id || null}
              on:change={onChangeSimulationTemplate}
            >
              {#if !$simulationTemplates.length}
                <option value={null}>Empty</option>
              {:else}
                <option value={null} />
                {#each $simulationTemplates as template}
                  <option value={template.id}>
                    {template.description}
                  </option>
                {/each}
              {/if}
            </select>
          </Input>
          <DatePickerField
            field={startTimeDoyField}
            label="Start Time"
            layout="inline"
            name="start-time"
            on:change={onUpdateStartTime}
            on:keydown={onUpdateStartTime}
          >
            <DatePickerActionButton on:click={onPlanStartTimeClick} text="Plan Start">
              <PlanLeftArrow />
            </DatePickerActionButton>
          </DatePickerField>
          <DatePickerField
            field={endTimeDoyField}
            label="End Time"
            layout="inline"
            name="end-time"
            on:change={onUpdateEndTime}
            on:keydown={onUpdateEndTime}
          >
            <DatePickerActionButton on:click={onPlanEndTimeClick} text="Plan End">
              <PlanRightArrow />
            </DatePickerActionButton>
          </DatePickerField>
        </div>
      </details>
    </fieldset>

    <fieldset>
      <details open>
        <summary>Arguments</summary>
        <div class="details-body">
          {#if formParameters.length}
            <Parameters {formParameters} on:change={onChangeFormParameters} />
          {:else}
            <div class="p-1">No simulation arguments found</div>
          {/if}
        </div>
      </details>
    </fieldset>
  </svelte:fragment>
</Panel>
