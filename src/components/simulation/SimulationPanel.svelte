<svelte:options immutable={true} />

<script lang="ts">
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import RefreshIcon from '@nasa-jpl/stellar/icons/refresh.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { Status } from '../../enums/status';
  import { field } from '../../stores/form';
  import { plan, planEndTimeMs, planReadOnly, planStartTimeMs } from '../../stores/plan';
  import { planSnapshot } from '../../stores/planSnapshots';
  import { plugins } from '../../stores/plugins';
  import {
    enableSimulation,
    simulation,
    simulationDatasetId,
    simulationDatasetsAll,
    simulationDatasetsPlan,
    simulationStatus,
  } from '../../stores/simulation';
  import { viewTogglePanel } from '../../stores/views';
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
  import { formatDate, getDoyTime } from '../../utilities/time';
  import { required, validateStartTime } from '../../utilities/validators';
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

  export let gridSection: ViewGridSection;
  export let user: User | null;

  const updatePermissionError = 'You do not have permission to update this simulation';

  let simulateButtonTooltip: string = '';
  let reSimulateButtonTooltip: string = '';
  let endTime: string;
  let endTimeField: FieldStore<string>;
  let formParameters: FormParameter[] = [];
  let hasRunPermission: boolean = false;
  let hasUpdatePermission: boolean = false;
  let isFilteredBySnapshot: boolean = false;
  let numOfUserChanges: number = 0;
  let startTime: string;
  let startTimeField: FieldStore<string>;
  let modelParametersMap: ParametersMap = {};
  let filteredSimulationDatasets: SimulationDataset[] = [];

  function validateStartTimeField(startTime: string) {
    const startTimeDate = $plugins.time.primary.parse(startTime);
    const endTimeDate = $plugins.time.primary.parse($endTimeField.value);
    if (!startTimeDate) {
      return Promise.resolve('Invalid Start Date');
    } else if (!endTimeDate) {
      return Promise.resolve('Invalid End Date');
    }
    return validateStartTime(startTimeDate.getTime(), endTimeDate.getTime(), 'Simulation');
  }

  function validateEndTimeField(endTime: string) {
    const startTimeDate = $plugins.time.primary.parse($startTimeField.value);
    const endTimeDate = $plugins.time.primary.parse(endTime);
    if (!startTimeDate) {
      return Promise.resolve('Invalid Start Date');
    } else if (!endTimeDate) {
      return Promise.resolve('Invalid End Date');
    }
    return validateStartTime(startTimeDate.getTime(), endTimeDate.getTime(), 'Simulation');
  }

  $: if (user !== null && $plan !== null) {
    hasRunPermission = featurePermissions.simulation.canRun(user, $plan, $plan.model) && !$planReadOnly;
    hasUpdatePermission = featurePermissions.simulation.canUpdate(user, $plan) && !$planReadOnly;
  }
  $: if ($plan) {
    let startTimeDate = new Date($planStartTimeMs);
    if ($simulation && $simulation.simulation_start_time) {
      startTimeDate = new Date($simulation.simulation_start_time);
    }
    startTime = formatDate(startTimeDate, $plugins.time.primary.format);

    let endTimeDate = new Date($planEndTimeMs);
    if ($simulation && $simulation.simulation_end_time) {
      endTimeDate = new Date($simulation.simulation_end_time);
    }
    endTime = formatDate(endTimeDate, $plugins.time.primary.format);
  }

  $: startTimeField = field<string>(startTime, [required, $plugins.time.primary.validate, validateStartTimeField]);
  $: endTimeField = field<string>(endTime, [required, $plugins.time.primary.validate, validateEndTimeField]);
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
  $: if ($startTimeField.invalid || $endTimeField.invalid) {
    simulateButtonTooltip = 'Simulation start and end times are not valid';
    reSimulateButtonTooltip = 'Simulation start and end times are not valid';
  } else if (enableReSimulation) {
    reSimulateButtonTooltip = 'Re-run the same simulation';
    simulateButtonTooltip = 'Simulation up-to-date';
  } else {
    simulateButtonTooltip = '';
    reSimulateButtonTooltip = '';
  }

  $: isFilteredBySnapshot = $planSnapshot !== null;

  $: if (isFilteredBySnapshot) {
    filteredSimulationDatasets = $simulationDatasetsPlan.filter(
      simulationDataset => $planSnapshot === null || simulationDataset.plan_revision === $planSnapshot?.revision,
    );
  } else {
    filteredSimulationDatasets = $simulationDatasetsPlan;
  }

  $: enableReSimulation =
    !$enableSimulation &&
    ($simulationStatus === Status.Complete ||
      $simulationStatus === Status.Canceled ||
      $simulationStatus === Status.Failed);

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    if ($simulation !== null && $plan !== null) {
      const { detail: formParameter } = event;
      const newArgumentsMap = getArguments($simulation?.arguments, formParameter);
      const newFiles: File[] = formParameter.file ? [formParameter.file] : [];
      const newSimulation: Simulation = {
        ...$simulation,
        arguments: newArgumentsMap,
      };

      effects.updateSimulation($plan, newSimulation, user, newFiles, $plan.model.parameters.parameters);
    }
  }

  function onResetFormParameters(event: CustomEvent<FormParameter>) {
    if ($simulation !== null && $plan !== null) {
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

      effects.updateSimulation($plan, newSimulation, user, newFiles, $plan.model.parameters.parameters);
    }
  }

  async function applyTemplateToSimulation(simulationTemplate: SimulationTemplate | null, numOfUserChanges: number) {
    if ($simulation !== null && $plan !== null) {
      if (simulationTemplate === null) {
        effects.updateSimulation(
          $plan,
          {
            ...$simulation,
            template: null,
          },
          user,
        );
      } else if ($plan) {
        effects.applyTemplateToSimulation(simulationTemplate, $simulation, $plan, numOfUserChanges, user);
      }
    }
  }

  async function onApplySimulationTemplate(event: CustomEvent<SimulationTemplate | null>) {
    const { detail: simulationTemplate } = event;
    applyTemplateToSimulation(simulationTemplate, numOfUserChanges);
  }

  async function onDeleteSimulationTemplate(event: CustomEvent<SimulationTemplate>) {
    if ($plan) {
      const { detail: simulationTemplate } = event;
      await effects.deleteSimulationTemplate(simulationTemplate, $plan.model.name, user);
    }
  }

  async function onSaveNewSimulationTemplate(event: CustomEvent<Pick<SimulationTemplateInsertInput, 'description'>>) {
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

  async function onSaveSimulationTemplate(event: CustomEvent<Pick<SimulationTemplateInsertInput, 'description'>>) {
    if ($simulation?.template && $plan) {
      const {
        detail: { description: templateName },
      } = event;
      effects.updateSimulationTemplate(
        $simulation.template.id,
        {
          ...$simulation,
          arguments: $simulation.arguments,
          description: templateName,
        },
        $plan,
        user,
      );
    }
  }

  function onToggleFilter() {
    isFilteredBySnapshot = !isFilteredBySnapshot;
  }

  function updateStartEndTimes({ endString, startString }: { endString?: string; startString?: string }) {
    if ($simulation !== null && $plan !== null && startString && endString) {
      const startTimeDate = $plugins.time.primary.parse(startString);
      const endTimeDate = $plugins.time.primary.parse(endString);
      if (!startTimeDate || !endTimeDate) {
        return;
      }
      const startDoyString = startString ? getDoyTime(startTimeDate) : null;
      const endDoyString = endString ? getDoyTime(endTimeDate) : null;
      const newSimulation: Simulation = {
        ...$simulation,
        ...(startDoyString ? { simulation_start_time: startDoyString } : {}),
        ...(endDoyString ? { simulation_end_time: endDoyString } : {}),
      };

      effects.updateSimulation($plan, newSimulation, user);
    }
  }

  async function onUpdateStartTime() {
    if ($startTimeField.valid && startTime !== $startTimeField.value) {
      await endTimeField.validateAndSet($endTimeField.value);
      updateStartEndTimes({
        ...($endTimeField.valid ? { endString: $endTimeField.value } : {}),
        startString: $startTimeField.value,
      });
    }
  }

  async function onUpdateEndTime() {
    if ($endTimeField.valid && endTime !== $endTimeField.value) {
      await startTimeField.validateAndSet($startTimeField.value);
      updateStartEndTimes({
        endString: $endTimeField.value,
        ...($startTimeField.valid ? { startString: $startTimeField.value } : {}),
      });
    }
  }

  async function onPlanStartTimeClick() {
    if ($plan) {
      await startTimeField.validateAndSet(formatDate(new Date($planStartTimeMs), $plugins.time.primary.format));
      updateStartEndTimes({ startString: $startTimeField.value });
    }
  }

  async function onPlanEndTimeClick() {
    if ($plan) {
      await endTimeField.validateAndSet(formatDate(new Date($planEndTimeMs), $plugins.time.primary.format));
      updateStartEndTimes({ endString: $endTimeField.value });
    }
  }

  function onCancelSimulation(event: CustomEvent) {
    effects.cancelSimulation(event.detail.id, user);
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Simulation" />
    <PanelHeaderActions>
      {#if enableReSimulation}
        <PanelHeaderActionButton
          disabled={!enableReSimulation || $startTimeField.invalid || $endTimeField.invalid}
          tooltipContent={reSimulateButtonTooltip}
          title="Re-Run"
          showLabel
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasRunPermission,
                permissionError: $planReadOnly
                  ? PlanStatusMessages.READ_ONLY
                  : 'You do not have permission to run a simulation',
              },
            ],
          ]}
          on:click={() => effects.simulate($plan, enableReSimulation, user)}><RefreshIcon /></PanelHeaderActionButton
        >
      {/if}
      <PanelHeaderActionButton
        disabled={!$enableSimulation || $startTimeField.invalid || $endTimeField.invalid}
        tooltipContent={simulateButtonTooltip}
        title="Simulate"
        showLabel
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasRunPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to run a simulation',
            },
          ],
        ]}
        on:click={() => effects.simulate($plan, enableReSimulation, user)}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <Collapse title="General">
        <DatePickerField
          useFallback={!$plugins.time.enableDatePicker}
          field={startTimeField}
          label={`Start Time (${$plugins.time.primary.label}) - ${$plugins.time.primary.formatString}`}
          layout="inline"
          name="start-time"
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdatePermission,
                permissionError: $planReadOnly ? PlanStatusMessages.READ_ONLY : updatePermissionError,
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
          useFallback={!$plugins.time.enableDatePicker}
          field={endTimeField}
          label={`End Time (${$plugins.time.primary.label}) - ${$plugins.time.primary.formatString}`}
          layout="inline"
          name="end-time"
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdatePermission,
                permissionError: $planReadOnly ? PlanStatusMessages.READ_ONLY : updatePermissionError,
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
                  permissionError: $planReadOnly ? PlanStatusMessages.READ_ONLY : updatePermissionError,
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

  :global(.simulation-collapse.collapse .content) {
    margin: 0;
  }
</style>
