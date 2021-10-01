<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    FormParameter,
    ParameterMap,
    ParameterSchema,
  } from '../../types';
  import Parameters from '../parameters/Parameters.svelte';
  import Card from '../ui/Card.svelte';
  import Panel from '../ui/Panel.svelte';

  const dispatch = createEventDispatcher();

  export let modelArgumentsMap: ParameterMap;
  export let modelParameters: ParameterSchema[];

  $: formParameters = getFormParameters(modelParameters, modelArgumentsMap);

  function getFormParameters(
    modelParameters: ParameterSchema[],
    modelArgumentsMap: ParameterMap,
  ): FormParameter[] {
    const formParameters = modelParameters.map(({ name, schema }) => {
      let value = null;

      const parameter = modelArgumentsMap[name];

      if (parameter) {
        value = parameter.value;
      } else if (schema.type === 'boolean') {
        value = false;
      } else if (schema.type === 'duration') {
        value = 0;
      } else if (schema.type === 'int') {
        value = 0;
      } else if (schema.type === 'path') {
        value = '/etc/os-release';
      } else if (schema.type === 'real') {
        value = 0;
      } else if (schema.type === 'series') {
        value = [];
      } else if (schema.type === 'string') {
        value = '';
      } else if (schema.type === 'struct') {
        value = {};
      } else if (schema.type === 'variant') {
        value = '';
      }

      const formParameter: FormParameter = {
        error: null,
        loading: false,
        name,
        schema,
        validate: false,
        value,
      };

      return formParameter;
    });

    return formParameters;
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    updateFormParemter({ ...formParameter });

    const { newFiles, newModelArguments } = formParameters.reduce(
      ({ newFiles, newModelArguments }, { file, name, value }) => {
        newModelArguments.push({ name, value });
        if (file) newFiles.push(file);
        return { newFiles, newModelArguments };
      },
      { newFiles: [], newModelArguments: [] },
    );
    dispatch('updateModelArguments', { newFiles, newModelArguments });
  }

  function updateFormParemter(newParameter: FormParameter) {
    formParameters = formParameters.map(parameter => {
      if (newParameter.name === parameter.name) {
        return newParameter;
      }
      return parameter;
    });
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
