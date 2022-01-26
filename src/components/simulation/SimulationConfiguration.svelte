<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    FormParameter,
    ParametersMap,
    Simulation,
    SimulationTemplate,
  } from '../../types';
  import { getTarget } from '../../utilities/generic';
  import {
    getFormParameters,
    isNotEmpty,
    updateFormParameter,
  } from '../../utilities/parameters';
  import Parameters from '../parameters/Parameters.svelte';
  import Card from '../ui/Card.svelte';
  import Panel from '../ui/Panel.svelte';

  const dispatch = createEventDispatcher();

  export let modelParametersMap: ParametersMap;
  export let simulation: Simulation | null;
  export let simulationTemplates: SimulationTemplate[];

  $: formParameters = getFormParameters(
    modelParametersMap,
    simulation?.arguments,
    simulation?.template?.arguments,
  );

  async function onChangeSimulationTemplate(event: Event) {
    const { value } = getTarget(event);
    const id = value as number;
    const template = { ...simulation?.template, id };
    const newSimulation: Simulation = { ...simulation, template };

    dispatch('updateSimulation', { newSimulation });
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    formParameters = updateFormParameter(formParameters, formParameter);

    const { newArgumentsMap, newFiles } = formParameters.reduce(
      ({ newArgumentsMap, newFiles }, { file, name, value }) => {
        const defaultArgumentsMap = simulation?.template?.arguments || {};

        if (isNotEmpty(value) && defaultArgumentsMap[name] !== value) {
          newArgumentsMap[name] = value;
        }
        if (file) newFiles.push(file);

        return { newArgumentsMap, newFiles };
      },
      { newArgumentsMap: {}, newFiles: [] },
    );

    const newSimulation = { ...simulation, arguments: newArgumentsMap };
    dispatch('updateSimulation', { newFiles, newSimulation });
  }
</script>

<Panel hideFooter>
  <span slot="header"> Simulation Configuration </span>
  <span slot="body">
    <div class="m-2">
      <details open>
        <summary>Templates</summary>
        <div class="mt-3 mb-3">
          <select
            class="st-select w-100"
            data-type="number"
            disabled={!simulationTemplates.length}
            name="simulation-templates"
            value={simulation?.template?.id || null}
            on:change={onChangeSimulationTemplate}
          >
            {#if !simulationTemplates.length}
              <option value={null}>Empty</option>
            {:else}
              <option value={null} />
              {#each simulationTemplates as template}
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
    </div>
  </span>
</Panel>
