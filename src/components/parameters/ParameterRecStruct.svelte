<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import type { ValueSchemaStruct } from '../../types/schema';
  import { isRecParameter } from '../../utilities/parameters';
  import type { ActionArray } from '../../utilities/useActions';
  import Collapse from '../Collapse.svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterRec from './ParameterRec.svelte';
  import ParameterUnits from './ParameterUnits.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameter: FormParameter<ValueSchemaStruct>;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

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
        value: value !== null ? value[key] : null,
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
      [subFormParameter.key as keyof FormParameter]: subFormParameter.value,
    };
    dispatch('change', { ...formParameter, value });
  }

  function onResetStruct() {
    dispatch('reset', formParameter);
  }
</script>

<div class="parameter-rec-struct">
  <Collapse defaultExpanded={expanded}>
    <div slot="left">
      <ParameterName {formParameter} />
    </div>
    <div class="right" slot="right">
      <ParameterUnits unit={formParameter.schema?.metadata?.unit?.value} />
      <ParameterBaseRightAdornments
        {disabled}
        hidden={hideRightAdornments}
        {formParameter}
        {parameterType}
        {use}
        on:reset={onResetStruct}
      />
    </div>
    <ul style="padding-inline-start: {levelPadding}px">
      {#each subFormParameters as subFormParameter (subFormParameter.name)}
        <li>
          {#if isRecParameter(subFormParameter)}
            <ParameterRec
              {disabled}
              {hideRightAdornments}
              formParameter={subFormParameter}
              {labelColumnWidth}
              level={++level}
              {levelPadding}
              {parameterType}
              {use}
              on:change={onChange}
              on:reset={onResetStruct}
            />
          {:else}
            <ParameterBase
              {disabled}
              {hideRightAdornments}
              formParameter={subFormParameter}
              {labelColumnWidth}
              level={++level}
              {levelPadding}
              {parameterType}
              {use}
              on:change={onChange}
              on:reset={onResetStruct}
            />
          {/if}
        </li>
      {/each}
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

  .parameter-rec-struct {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 8px;
  }

  .parameter-rec-struct :global(.form-parameter-name .name) {
    cursor: pointer;
  }

  .parameter-rec-struct :global(.collapse > .collapse-header) {
    gap: 8px;
    height: 24px;
  }

  .parameter-rec-struct :global(.collapse > .content) {
    margin-left: 0%;
  }

  .right {
    display: inline-flex;
    margin-right: 6px;
  }
</style>
