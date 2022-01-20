<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    FormParameter,
    ParametersMap,
    Simulation,
    SimulationTemplate,
  } from '../../types';
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

  async function onChangeSimulationTemplate(
    target: EventTarget & HTMLSelectElement,
  ) {
    const { value } = target;
    let templateId = null;
    if (value !== '') {
      templateId = parseFloat(value);
    }
    const newSimulation: Simulation = {
      ...simulation,
      template: { ...simulation?.template, id: templateId },
    };
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
          {#if simulationTemplates.length}
            <select
              class="st-select w-100"
              name="simulation-templates"
              value={simulation?.template?.id || ''}
              on:change={({ currentTarget }) =>
                onChangeSimulationTemplate(currentTarget)}
            >
              <option value="" />
              {#each simulationTemplates as template}
                <option value={template.id}>
                  {template.description}
                </option>
              {/each}
            </select>
          {:else}
            <input class="st-input w-100" disabled value="Empty" />
          {/if}
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
