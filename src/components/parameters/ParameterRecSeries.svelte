<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter } from '../../types';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterRec from './ParameterRec.svelte';
  import ParameterRecError from './ParameterRecError.svelte';

  const dispatch = createEventDispatcher();

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  let expanded: boolean = false;

  $: indices = formParameter?.value?.length || 1;
  $: subFormParameters = getSubFormParameters(formParameter);

  function getSubFormParameters(formParameter: FormParameter): FormParameter[] {
    const subFormParameters = [];
    const { schema, value = [] } = formParameter;

    for (let i = 0; i < indices; ++i) {
      let subFormParameterValue = null;

      if (value[i] !== null && value[i] !== undefined) {
        subFormParameterValue = value[i];
      } else if (value[i - 1] !== null && value[i - 1] !== undefined) {
        subFormParameterValue = value[i - 1];
      }

      const subFormParameter: FormParameter = {
        error: null,
        index: i,
        loading: false,
        name: `[${i}]`,
        schema: schema.items,
        value: subFormParameterValue,
      };

      subFormParameters.push(subFormParameter);
    }

    return subFormParameters;
  }

  function onChange(event: CustomEvent<FormParameter>) {
    const { detail: subFormParameter } = event;
    const value = [...formParameter.value];
    value[subFormParameter.index] = subFormParameter.value;
    dispatch('change', { ...formParameter, value });
  }

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div class="parameter-rec-series" on:click={toggleExpanded}>
  {#if !expanded}
    <i class="bi bi-chevron-right" />
  {:else}
    <i class="bi bi-chevron-down" />
  {/if}
  <ParameterName {formParameter} />
</div>

{#if expanded}
  <ul style="padding-inline-start: {levelPadding}px">
    <ParameterRecError {formParameter} />

    {#each subFormParameters as subFormParameter (subFormParameter.name)}
      <li>
        {#if subFormParameter.schema.type === 'series' || subFormParameter.schema.type === 'struct'}
          <ParameterRec
            {disabled}
            formParameter={subFormParameter}
            {labelColumnWidth}
            level={++level}
            {levelPadding}
            on:change={onChange}
          />
        {:else}
          <ParameterBase
            {disabled}
            formParameter={subFormParameter}
            {labelColumnWidth}
            level={++level}
            {levelPadding}
            on:change={onChange}
          />
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  ul {
    margin: 0;
  }

  li {
    list-style: none;
    margin-bottom: 1rem;
  }

  .parameter-rec-series {
    align-items: center;
    display: grid;
    gap: 5px;
    grid-template-columns: 16px auto;
    margin-bottom: 1rem;
  }
</style>
