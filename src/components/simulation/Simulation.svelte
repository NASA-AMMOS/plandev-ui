<svelte:options immutable={true} />

<script lang="ts">
  import GridMenu from '../menus/GridMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { plan } from '../../stores/plan';
  import {
    modelParametersMap,
    simulation,
    simulationActions,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import { Status } from '../../utilities/enums';
  import { getTarget } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import req from '../../utilities/requests';

  export let gridId: number;

  let formParameters: FormParameter[] = [];

  $: {
    req.getEffectiveModelArguments($plan.model.id, $simulation?.arguments).then(({ arguments: defaultArguments }) => {
      // Displayed simulation arguments are either user input arguments,
      // simulation template arguments, or default arguments.
      // User input arguments take precedence over simulation template arguments,
      // which take precedence over default arguments.
      const defaultArgumentsMap = {
        ...defaultArguments,
        ...$simulation?.template?.arguments,
      };
      formParameters = getFormParameters($modelParametersMap, $simulation?.arguments, defaultArgumentsMap);
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

    simulationActions.updateSimulation(newSimulation, newFiles);
    simulationStatus.update(Status.Dirty);
  }

  async function onChangeSimulationTemplate(event: Event) {
    const { value } = getTarget(event);
    const id = value as number;
    const template = { ...$simulation?.template, id };
    const newSimulation: Simulation = { ...$simulation, template };

    simulationActions.updateSimulation(newSimulation);
    simulationStatus.update(Status.Dirty);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Simulation" />
    <StatusBadge status={$simulationStatus} title="Simulate" on:click={() => simulationActions.runSimulation()} />
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
          <div class="p-1">No simulation arguments found</div>
        {/if}
      </div>
    </details>
  </svelte:fragment>
</Panel>
