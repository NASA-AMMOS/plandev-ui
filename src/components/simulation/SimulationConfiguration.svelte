<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ArgumentsMap, FormParameter, ParametersMap } from '../../types';
  import {
    getFormParameters,
    updateFormParameter,
  } from '../../utilities/parameters';
  import Parameters from '../parameters/Parameters.svelte';
  import Card from '../ui/Card.svelte';
  import Panel from '../ui/Panel.svelte';

  const dispatch = createEventDispatcher();

  export let argumentsMap: ArgumentsMap;
  export let parametersMap: ParametersMap;

  $: formParameters = getFormParameters(parametersMap, argumentsMap);

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    formParameters = updateFormParameter(formParameters, formParameter);

    const { newArgumentsMap, newFiles } = formParameters.reduce(
      ({ newArgumentsMap, newFiles }, { file, name, value }) => {
        newArgumentsMap[name] = value;
        if (file) newFiles.push(file);
        return { newArgumentsMap, newFiles };
      },
      { newArgumentsMap: {}, newFiles: [] },
    );

    dispatch('updateArguments', { newArgumentsMap, newFiles });
  }
</script>

<Panel hideFooter>
  <span slot="header"> Simulation Configuration </span>
  <span slot="body">
    {#if formParameters.length}
      <div class="m-2">
        <Parameters {formParameters} on:change={onChangeFormParameters} />
      </div>
    {:else}
      <Card class="m-1 p-1">No Simulation Configuration Found</Card>
    {/if}
  </span>
</Panel>
