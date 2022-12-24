<svelte:options immutable={true} />

<script lang="ts">
  import { plan } from '../../stores/plan';
  import {
    simulation,
    simulationDatasetId,
    simulationDatasetIds,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import type { FormParameter, ParametersMap } from '../../types/parameter';
  import type { Simulation } from '../../types/simulation';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import GridMenu from '../menus/GridMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';

  export let gridId: number;

  let formParameters: FormParameter[] = [];
  let modelParametersMap: ParametersMap = {};

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
        formParameters = getFormParameters(modelParametersMap, $simulation.arguments, [], defaultArgumentsMap);
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
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Simulation" />
    <PanelHeaderActions status={$simulationStatus}>
      <PanelHeaderActionButton title="Simulate" showLabel on:click={() => effects.simulate()} />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <label for="id">Simulation ID</label>
      <input value={$simulation?.id} class="st-input w-100" disabled name="id" />
    </fieldset>

    <fieldset>
      <label for="simulationDatasetId">Simulation Dataset ID</label>
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
    </fieldset>

    <fieldset>
      <details open>
        <summary>Templates</summary>
        <div class="details-body">
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
