<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import { createEventDispatcher } from 'svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterRec from './ParameterRec.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameter: FormParameter<ValueSchemaStruct>;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let showName: boolean = true;

  const dispatch = createEventDispatcher();

  $: subFormParameters = getSubFormParameters(formParameter);

  function getSubFormParameters(formParameter: FormParameter<ValueSchemaStruct>): FormParameter[] {
    const { schema, value = [] } = formParameter;
    const { items: keys } = schema;
    const structKeys = Object.keys(keys).sort();

    const subFormParameters = structKeys.map((key, index) => {
      const subFormParameter: FormParameter = {
        errors: null,
        key,
        name: key,
        order: index,
        schema: schema.items[key],
        value: value ? value[key] || null : null,
        valueSource: formParameter.valueSource,
      };

      return subFormParameter;
    });

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

{#if showName}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="parameter-rec-struct" on:click={toggleExpanded}>
    {#if !expanded}
      <ChevronRightIcon />
    {:else}
      <ChevronDownIcon />
    {/if}
    <ParameterName {formParameter} />
  </div>
{:else}
  <div class="parameter-rec-struct" />
{/if}

{#if expanded}
  <ul style="padding-inline-start: {levelPadding}px">
    {#each subFormParameters as subFormParameter (subFormParameter.name)}
      <li>
        {#if subFormParameter.schema.type === 'series' || subFormParameter.schema.type === 'struct'}
          <ParameterRec
            {disabled}
            {hideRightAdornments}
            formParameter={subFormParameter}
            {labelColumnWidth}
            level={++level}
            {levelPadding}
            on:change={onChange}
          />
        {:else}
          <ParameterBase
            {disabled}
            {hideRightAdornments}
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
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
  }

  li {
    list-style: none;
    padding: 4px 0px;
  }

  .parameter-rec-struct {
    align-items: center;
    cursor: pointer;
    display: grid;
    gap: 8px;
    grid-template-columns: 16px auto;
    padding: 8px 0px;
  }

  .parameter-rec-struct :global(.form-parameter-name .name) {
    cursor: pointer;
  }
</style>
