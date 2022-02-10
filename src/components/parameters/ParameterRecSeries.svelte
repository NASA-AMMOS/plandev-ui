<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getArgument } from '../../utilities/parameters';
  import CssGrid from '../ui/CssGrid.svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterRec from './ParameterRec.svelte';
  import ParameterRecError from './ParameterRecError.svelte';
  import { tooltip } from '../../utilities/tooltip';
  import Card from '../ui/Card.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter<ValueSchemaSeries>;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  const dispatch = createEventDispatcher();

  let expanded: boolean = false;

  $: subFormParameters = getSubFormParameters(formParameter);

  function getSubFormParameters(
    formParameter: FormParameter<ValueSchemaSeries>,
  ): FormParameter[] {
    const subFormParameters = [];
    const { schema, value = [] } = formParameter;

    for (let i = 0; i < value.length; ++i) {
      const subFormParameter: FormParameter = {
        error: null,
        index: i,
        name: `[${i}]`,
        schema: schema.items,
        value: getArgument(value[i], schema.items),
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
    const newValue = getArgument(null, schema.items);
    const value = [...formParameter.value, newValue];
    console.log(value);
    dispatch('change', { ...formParameter, value });
  }

  function valueRemove() {
    const value = [...formParameter.value];
    value.pop();
    dispatch('change', { ...formParameter, value });
  }
</script>

<div class="parameter-rec-series">
  <div class="series-left" on:click={toggleExpanded}>
    <div class="arrow">
      {#if !expanded}
        <i class="bi bi-chevron-right" />
      {:else}
        <i class="bi bi-chevron-down" />
      {/if}
    </div>
    <ParameterName {formParameter} />
  </div>
  <div class="series-right">
    <CssGrid gap="3px" columns="auto auto">
      <button
        class="st-button icon"
        disabled={subFormParameters?.length === 0}
        on:click|stopPropagation={valueRemove}
        use:tooltip={{ content: 'Remove Value', placement: 'left' }}
      >
        <i class="bi bi-dash fs-6" />
      </button>
      <button
        class="st-button icon"
        on:click|stopPropagation={valueAdd}
        use:tooltip={{ content: 'Add Value', placement: 'left' }}
      >
        <i class="bi bi-plus fs-6" />
      </button>
    </CssGrid>
  </div>
</div>

{#if expanded}
  <ul style="padding-inline-start: {levelPadding}px">
    <ParameterRecError {formParameter} />

    {#if subFormParameters?.length}
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
    {:else}
      <Card class="p-1">This series has no values</Card>
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
</style>
