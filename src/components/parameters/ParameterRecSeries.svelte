<svelte:options immutable={true} />

<script lang="ts">
  import DashIcon from 'bootstrap-icons/icons/dash.svg?component';
  import PlusIcon from 'bootstrap-icons/icons/plus.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import type { ValueSchemaSeries } from '../../types/schema';
  import { getArgument } from '../../utilities/parameters';
  import { tooltip } from '../../utilities/tooltip';
  import type { ActionArray } from '../../utilities/useActions';
  import Collapse from '../Collapse.svelte';
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
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

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
    if (subFormParameter.index !== undefined) {
      value[subFormParameter.index] = subFormParameter.value;
    }
    dispatch('change', { ...formParameter, value });
  }

  function onResetSeries() {
    dispatch('reset', formParameter);
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

<div class="parameter-rec-series">
  <Collapse defaultExpanded={expanded}>
    <div slot="left">
      <ParameterName {formParameter} />
    </div>
    <div class="series-right" slot="right">
      <CssGrid gap="3px" columns="auto auto auto" class="parameter-rec-series-css-grid">
        <button
          class="st-button icon"
          disabled={subFormParameters?.length === 0 || disabled}
          on:click|stopPropagation={valueRemove}
          use:tooltip={{ content: 'Remove Value', placement: 'left' }}
        >
          <DashIcon />
        </button>
        <button
          {disabled}
          class="st-button icon"
          on:click|stopPropagation={valueAdd}
          use:tooltip={{ content: 'Add Value', placement: 'left' }}
        >
          <PlusIcon />
        </button>
        <ParameterBaseRightAdornments
          hidden={hideRightAdornments}
          {formParameter}
          {parameterType}
          {use}
          on:reset={onResetSeries}
        />
      </CssGrid>
    </div>
    <ul style="padding-inline-start: {levelPadding}px">
      {#if subFormParameters?.length}
        {#each subFormParameters as subFormParameter (subFormParameter.name)}
          <li>
            {#if subFormParameter.schema.type === 'series' || subFormParameter.schema.type === 'struct'}
              <ParameterRec
                {disabled}
                hideRightAdornments
                expanded
                formParameter={subFormParameter}
                {labelColumnWidth}
                level={++level}
                {levelPadding}
                {parameterType}
                {use}
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
                {parameterType}
                {use}
                on:change={onChange}
              />
            {/if}
          </li>
        {/each}
      {:else}
        <div class="p-1">This series has no values</div>
      {/if}
    </ul>
  </Collapse>
</div>

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

  .parameter-rec-series {
    align-items: center;
    cursor: pointer;
    display: flex;
  }

  .series-right {
    align-items: center;
    justify-content: flex-end;
  }

  :global(.parameter-rec-series-css-grid) {
    align-items: center;
    margin-right: 5px;
  }

  .parameter-rec-series :global(.form-parameter-name .name) {
    cursor: pointer;
  }

  .parameter-rec-series :global(.collapse > .collapse-header) {
    gap: 8px;
    height: 24px;
  }

  .parameter-rec-series :global(.collapse > .content) {
    margin-left: 0px;
  }
</style>
