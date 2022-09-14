<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import DashIcon from 'bootstrap-icons/icons/dash.svg?component';
  import PlusIcon from 'bootstrap-icons/icons/plus.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { getArgument } from '../../utilities/parameters';
  import { tooltip } from '../../utilities/tooltip';
  import CssGrid from '../ui/CssGrid.svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterRec from './ParameterRec.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameter: FormParameter<ValueSchemaSeries>;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let showName: boolean = true;

  const dispatch = createEventDispatcher();

  $: subFormParameters = getSubFormParameters(formParameter);

  function getSubFormParameters(formParameter: FormParameter<ValueSchemaSeries>): FormParameter[] {
    const subFormParameters = [];
    const { schema, value = [] } = formParameter;

    for (let i = 0; i < value.length; ++i) {
      const subFormParameter: FormParameter = {
        errors: null,
        index: i,
        name: `[${i}]`,
        order: i,
        schema: schema.items,
        value: getArgument(value[i], schema.items).value,
        valueSource: formParameter.valueSource,
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

  function valueAdd() {
    const { schema } = formParameter;
    const { value: newValue } = getArgument(null, schema.items);
    const value = [...formParameter.value, newValue];
    dispatch('change', { ...formParameter, value });
  }

  function valueRemove() {
    const value = [...formParameter.value];
    value.pop();
    dispatch('change', { ...formParameter, value });
  }
</script>

{#if showName}
  <div class="parameter-rec-series">
    <div class="series-left" on:click={toggleExpanded}>
      <div class="arrow">
        {#if !expanded}
          <ChevronRightIcon />
        {:else}
          <ChevronDownIcon />
        {/if}
      </div>
      <ParameterName {formParameter} />
    </div>
    <div class="series-right">
      <CssGrid gap="3px" columns="auto auto auto" class="parameter-rec-series-css-grid">
        <button
          class="st-button icon"
          disabled={subFormParameters?.length === 0}
          on:click|stopPropagation={valueRemove}
          use:tooltip={{ content: 'Remove Value', placement: 'left' }}
        >
          <DashIcon />
        </button>
        <button
          class="st-button icon"
          on:click|stopPropagation={valueAdd}
          use:tooltip={{ content: 'Add Value', placement: 'left' }}
        >
          <PlusIcon />
        </button>
        <ParameterBaseRightAdornments hidden={hideRightAdornments} {formParameter} />
      </CssGrid>
    </div>
  </div>
{:else}
  <div class="parameter-rec-series" />
{/if}

{#if expanded}
  <ul style="padding-inline-start: {levelPadding}px">
    {#if subFormParameters?.length}
      {#each subFormParameters as subFormParameter (subFormParameter.name)}
        <li>
          {#if subFormParameter.schema.type === 'series' || subFormParameter.schema.type === 'struct'}
            <ParameterRec
              {disabled}
              hideRightAdornments
              {expanded}
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
              hideRightAdornments
              {labelColumnWidth}
              level={++level}
              {levelPadding}
              on:change={onChange}
            />
          {/if}
        </li>
      {/each}
    {:else}
      <div class="p-1">This series has no values</div>
    {/if}
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

  .arrow {
    padding-right: 10px;
  }

  .parameter-rec-series {
    align-items: center;
    cursor: pointer;
    display: flex;
    margin-bottom: 1rem;
  }

  .series-left {
    align-items: center;
    display: flex;
    flex-grow: 1;
  }

  .series-right {
    align-items: center;
    justify-content: flex-end;
  }

  :global(.parameter-rec-series-css-grid) {
    align-items: center;
    margin-right: 5px;
  }
</style>
