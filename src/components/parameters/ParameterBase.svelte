<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import type { ActionArray } from '../../utilities/useActions';
  import ParameterBaseBoolean from './ParameterBaseBoolean.svelte';
  import ParameterBaseDuration from './ParameterBaseDuration.svelte';
  import ParameterBaseNumber from './ParameterBaseNumber.svelte';
  import ParameterBasePath from './ParameterBasePath.svelte';
  import ParameterBaseString from './ParameterBaseString.svelte';
  import ParameterBaseVariant from './ParameterBaseVariant.svelte';
  import ParameterBaseSequence from './ParameterBaseSequence.svelte';
  import ParameterBaseSequenceList from './ParameterBaseSequenceList.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];
  export let workspaceId: number | null = null;
</script>

{#if formParameter.schema.type === 'boolean'}
  <ParameterBaseBoolean
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'duration'}
  <ParameterBaseDuration
    {disabled}
    hideValueSource={hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'int'}
  <ParameterBaseNumber
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'path'}
  <ParameterBasePath
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'real'}
  <ParameterBaseNumber
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'string'}
  <ParameterBaseString
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'variant'}
  <ParameterBaseVariant
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'sequence'}
  <ParameterBaseSequence
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    {workspaceId}
    on:change
    on:reset
  />
{:else if formParameter.schema.type === 'sequenceList'}
  <ParameterBaseSequenceList
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    {formParameter}
    {parameterType}
    {use}
    {workspaceId}
    on:change
    on:reset
  />
{/if}
