<svelte:options immutable={true} />

<script lang="ts">
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import { SearchParameters } from '../../enums/searchParameters';
  import { field } from '../../stores/form';
  import { plan, planEndTimeMs, planStartTimeMs } from '../../stores/plan';
  import { planSnapshot } from '../../stores/planSnapshots';
  import {
    enableSimulation,
    simulation,
    simulationDatasetId,
    simulationDatasetsAll,
    simulationDatasetsPlan,
    simulationStatus,
  } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { FieldStore } from '../../types/form';
  import type { FormParameter, ParametersMap } from '../../types/parameter';
  import type {
    Simulation,
    SimulationDataset,
    SimulationTemplate,
    SimulationTemplateInsertInput,
  } from '../../types/simulation';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { setQueryParam } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getSimulationQueuePosition } from '../../utilities/simulation';
  import { Status } from '../../utilities/status';
  import { getDoyTime } from '../../utilities/time';
  import { required, timestamp } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import DatePickerActionButton from '../ui/DatePicker/DatePickerActionButton.svelte';
  import FilterToggleButton from '../ui/FilterToggleButton.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import SimulationHistoryDataset from './SimulationHistoryDataset.svelte';
  import SimulationTemplateInput from './SimulationTemplateInput.svelte';
  import { viewTogglePanel } from '../../stores/views';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  const updatePermissionError = 'You do not have permission to update this simulation';

  let endTimeDoy: string;
  let endTimeDoyField: FieldStore<string>;
  let formParameters: FormParameter[] = [];
  let hasRunPermission: boolean = false;
  let hasUpdatePermission: boolean = false;
  let isFilteredBySnapshot: boolean = false;
  let numOfUserChanges: number = 0;
  let startTimeDoy: string;
  let startTimeDoyField: FieldStore<string>;
  let modelParametersMap: ParametersMap = {};
  let filteredSimulationDatasets: SimulationDataset[] = [];

  $: if (user !== null && $plan !== null) {
    hasRunPermission = featurePermissions.simulation.canRun(user, $plan);
    hasUpdatePermission = featurePermissions.simulation.canUpdate(user, $plan);
  }
  $: if ($plan) {
    startTimeDoy =
      $simulation && $simulation.simulation_start_time
        ? getDoyTime(new Date($simulation.simulation_start_time))
        : $plan.start_time_doy;
  }
  $: startTimeDoyField = field<string>(startTimeDoy, [required, timestamp]);
  $: if ($plan) {
    endTimeDoy =
      $simulation && $simulation.simulation_end_time
        ? getDoyTime(new Date($simulation.simulation_end_time))
        : $plan.end_time_doy;
  }
  $: endTimeDoyField = field<string>(endTimeDoy, [required, timestamp]);
  $: numOfUserChanges = formParameters.reduce((previousHasChanges: number, formParameter) => {
    return /user/.test(formParameter.valueSource) ? previousHasChanges + 1 : previousHasChanges;
  }, 0);

  $: modelParametersMap = $plan?.model?.parameters?.parameters ?? {};
  $: if ($simulation && $plan) {
    effects.getEffectiveModelArguments($plan.model.id, $simulation.arguments, user).then(response => {
      if ($simulation !== null && response !== null) {
        const { arguments: defaultArguments } = response;
        // Displayed simulation arguments are either user input arguments,
        // simulation template arguments, or default arguments.
        // User input arguments take precedence over simulation template arguments,
        // which take precedence over default arguments.
        const defaultArgumentsMap = {
          ...defaultArguments,
          ...($simulation?.template?.arguments ?? {}),
        };
        formParameters = getFormParameters(
          modelParametersMap,
          $simulation.arguments,
          [],
          $simulation?.template?.arguments,
          defaultArgumentsMap,
        );
      }
    });
  }

  $: isFilteredBySnapshot = $planSnapshot !== null;

  $: if (isFilteredBySnapshot) {
    filteredSimulationDatasets = $simulationDatasetsPlan.filter(
      simulationDataset => $planSnapshot === null || simulationDataset.plan_revision === $planSnapshot?.revision,
    );
  } else {
    filteredSimulationDatasets = $simulationDatasetsPlan;
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    if ($simulation !== null) {
      const { detail: formParameter } = event;
      const newArgumentsMap = getArguments($simulation?.arguments, formParameter);
      const newFiles: File[] = formParameter.file ? [formParameter.file] : [];
      const newSimulation: Simulation = {
        ...$simulation,
        arguments: newArgumentsMap,
      };

      effects.updateSimulation(newSimulation, user, newFiles);
    }
  }

  function onResetFormParameters(event: CustomEvent<FormParameter>) {
    if ($simulation !== null) {
      const { detail: formParameter } = event;
      const { arguments: argumentsMap } = $simulation;
      const newArguments = getArguments(argumentsMap, {
        ...formParameter,
        value: $simulation.template ? $simulation.template.arguments[formParameter.name] : null,
      });
      const newFiles: File[] = formParameter.file ? [formParameter.file] : [];
      const newSimulation: Simulation = {
        ...$simulation,
        arguments: newArguments,
      };

      effects.updateSimulation(newSimulation, user, newFiles);
    }
  }

  async function applyTemplateToSimulation(simulationTemplate: SimulationTemplate | null, numOfUserChanges: number) {
    if ($simulation !== null) {
      if (simulationTemplate === null) {
        effects.updateSimulation(
          {
            ...$simulation,
            template: null,
          },
          user,
        );
      } else {
        effects.applyTemplateToSimulation(simulationTemplate, $simulation, numOfUserChanges, user);
      }
    }
  }

  async function onApplySimulationTemplate(event: CustomEvent<SimulationTemplate | null>) {
    const { detail: simulationTemplate } = event;
    applyTemplateToSimulation(simulationTemplate, numOfUserChanges);
  }

  async function onDeleteSimulationTemplate(event: CustomEvent<number>) {
    if ($plan) {
      const { detail: id } = event;
      await effects.deleteSimulationTemplate(id, $plan.model.name, user);
    }
  }

  async function onSaveNewSimulationTemplate(event: CustomEvent<SimulationTemplateInsertInput>) {
    if ($plan && $simulation !== null) {
      const {
        detail: { description: templateName },
      } = event;
      const newSimulationTemplate = await effects.createSimulationTemplate(
        $simulation.arguments,
        templateName,
        $plan.model.id,
        user,
      );

      if (newSimulationTemplate !== null) {
        await applyTemplateToSimulation(newSimulationTemplate, 0);
      }
    }
  }

  async function onSaveSimulationTemplate(event: CustomEvent<SimulationTemplateInsertInput>) {
    if ($simulation?.template) {
      const {
        detail: { description: templateName },
      } = event;
      effects.updateSimulationTemplate(
        $simulation.template.id,
        {
          arguments: $simulation.arguments,
          description: templateName,
        },
        user,
      );
    }
  }

  function onToggleFilter() {
    isFilteredBySnapshot = !isFilteredBySnapshot;
  }

  function updateStartTime(doyString: string) {
    if ($simulation !== null) {
      const newSimulation: Simulation = { ...$simulation, simulation_start_time: doyString };
      effects.updateSimulation(newSimulation, user);
    }
  }

  function updateEndTime(doyString: string) {
    if ($simulation !== null) {
      const newSimulation: Simulation = { ...$simulation, simulation_end_time: doyString };
      effects.updateSimulation(newSimulation, user);
    }
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
    if ($plan) {
      await startTimeDoyField.validateAndSet($plan.start_time_doy);
      updateStartTime($startTimeDoyField.value);
    }
  }

  async function onPlanEndTimeClick() {
    if ($plan) {
      await endTimeDoyField.validateAndSet($plan.end_time_doy);
      updateEndTime($endTimeDoyField.value);
    }
  }

  function onCancelSimulation(event: CustomEvent) {
    effects.cancelPendingSimulation(event.detail.id, user);
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Simulation" />
    <PanelHeaderActions>
      <PanelHeaderActionButton
        disabled={!$enableSimulation}
        tooltipContent={$simulationStatus === Status.Complete || $simulationStatus === Status.Failed
          ? 'Simulation up-to-date'
          : ''}
        title="Simulate"
        showLabel
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasRunPermission,
              permissionError: 'You do not have permission to run a simulation',
            },
          ],
        ]}
        on:click={() => effects.simulate(user)}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <Collapse title="General">
        <DatePickerField
          field={startTimeDoyField}
          label="Start Time"
          layout="inline"
          name="start-time"
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdatePermission,
                permissionError: updatePermissionError,
              },
            ],
          ]}
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
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdatePermission,
                permissionError: updatePermissionError,
              },
            ],
          ]}
          on:change={onUpdateEndTime}
          on:keydown={onUpdateEndTime}
        >
          <DatePickerActionButton on:click={onPlanEndTimeClick} text="Plan End">
            <PlanRightArrow />
          </DatePickerActionButton>
        </DatePickerField>
      </Collapse>
    </fieldset>

    <fieldset>
      <Collapse title="Arguments">
        <div class="simulation-template">
          <SimulationTemplateInput
            hasChanges={numOfUserChanges > 0}
            selectedSimulationTemplate={$simulation?.template}
            plan={$plan}
            {user}
            on:applyTemplate={onApplySimulationTemplate}
            on:deleteTemplate={onDeleteSimulationTemplate}
            on:saveNewTemplate={onSaveNewSimulationTemplate}
            on:saveTemplate={onSaveSimulationTemplate}
          />
        </div>
        {#if formParameters.length}
          <Parameters
            {formParameters}
            parameterType="simulation"
            use={[
              [
                permissionHandler,
                {
                  hasPermission: hasUpdatePermission,
                  permissionError: updatePermissionError,
                },
              ],
            ]}
            on:change={onChangeFormParameters}
            on:reset={onResetFormParameters}
          />
        {:else}
          <div class="p-1">No simulation arguments found</div>
        {/if}
      </Collapse>
    </fieldset>

    <fieldset>
      <Collapse title="Simulation History" padContent={false}>
        <svelte:fragment slot="right">
          {#if $planSnapshot}
            <FilterToggleButton
              label="Simulation"
              offTooltipContent="Filter simulations by selected snapshot"
              onTooltipContent="Remove filter"
              isOn={isFilteredBySnapshot}
              on:toggle={onToggleFilter}
            />
          {/if}
        </svelte:fragment>
        <div class="simulation-history">
          {#if !filteredSimulationDatasets || !filteredSimulationDatasets.length}
            <div>No Simulation Datasets</div>
          {:else}
            {#each filteredSimulationDatasets as simDataset (simDataset.id)}
              <SimulationHistoryDataset
                queuePosition={getSimulationQueuePosition(simDataset, $simulationDatasetsAll)}
                simulationDataset={simDataset}
                planEndTimeMs={$planEndTimeMs}
                planStartTimeMs={$planStartTimeMs}
                selected={simDataset.id === $simulationDatasetId}
                on:click={() => {
                  simulationDatasetId.set(simDataset.id);
                  setQueryParam(SearchParameters.SIMULATION_DATASET_ID, `${$simulationDatasetId}`);
                  viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'PlanMetadataPanel' } });
                }}
                on:cancel={onCancelSimulation}
              />
            {/each}
          {/if}
        </div>
      </Collapse>
    </fieldset>
  </svelte:fragment>
</Panel>

<style>
  .simulation-history {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  .simulation-template {
    margin-left: -7px;
  }

  :global(.simulation-collapse.collapse .content) {
    margin: 0;
  }
</style>
