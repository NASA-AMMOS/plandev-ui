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

  $: subFormParameters = getSubFormParameters(formParameter);

  function getSubFormParameters(formParameter: FormParameter): FormParameter[] {
    const subFormParameters = [];
    const { schema, value = [] } = formParameter;
    const { items: keys } = schema;
    const structKeys = Object.keys(keys).sort();

    for (const key of structKeys) {
      const subFormParameter: FormParameter = {
        error: null,
        key,
        loading: false,
        name: key,
        schema: schema.items[key],
        value: value ? value[key] || null : null,
      };
      subFormParameters.push(subFormParameter);
    }

    return subFormParameters;
  }

  function onChange(event: CustomEvent<FormParameter>) {
    const { detail: subFormParameter } = event;
    const value = {
      ...formParameter.value,
      [subFormParameter.key]: subFormParameter.value,
    };
    dispatch('change', { ...formParameter, value });
  }

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div class="parameter-rec-struct" on:click={toggleExpanded}>
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

  .parameter-rec-struct {
    align-items: center;
    display: grid;
    gap: 5px;
    grid-template-columns: 16px auto;
    margin-bottom: 1rem;
  }
</style>
