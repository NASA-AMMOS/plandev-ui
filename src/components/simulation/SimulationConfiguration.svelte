<svelte:options immutable={true} />

<script lang="ts">
  import Parameters from '../parameters/Parameters.svelte';
  import Chip from '../stellar/Chip.svelte';
  import Card from '../ui/Card.svelte';
  import Panel from '../ui/Panel.svelte';
  import {
    modelParametersMap,
    SimulationStatus,
    simulation,
    simulationStatus,
    simulationTemplates,
    updateSimulation,
  } from '../../stores/simulation';
  import { getTarget } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import req from '../../utilities/requests';

  export let modelId: number;

  let formParameters: FormParameter[] = [];

  $: {
    req
      .getEffectiveModelArguments(modelId, $simulation?.arguments)
      .then(({ arguments: defaultArguments }) => {
        // Displayed simulation arguments are either default arguments, or simulation template arguments.
        // Simulation template arguments take precedence over default arguments.
        const defaultArgumentsMap = {
          ...defaultArguments,
          ...$simulation?.template?.arguments,
        };
        formParameters = getFormParameters(
          $modelParametersMap,
          $simulation?.arguments,
          defaultArgumentsMap,
        );
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

    updateSimulation(newSimulation, newFiles);
    simulationStatus.update(SimulationStatus.Dirty);
  }

  async function onChangeSimulationTemplate(event: Event) {
    const { value } = getTarget(event);
    const id = value as number;
    const template = { ...$simulation?.template, id };
    const newSimulation: Simulation = { ...$simulation, template };

    updateSimulation(newSimulation);
    simulationStatus.update(SimulationStatus.Dirty);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Simulation Configuration</Chip>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <details open>
      <summary>Templates</summary>
      <div class="mt-3 mb-3">
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

    <details open>
      <summary>Arguments</summary>
      <div>
        {#if formParameters.length}
          <Parameters {formParameters} on:change={onChangeFormParameters} />
        {:else}
          <Card class="m-1 p-1">No Simulation Configuration Found</Card>
        {/if}
      </div>
    </details>
  </svelte:fragment>
</Panel>
