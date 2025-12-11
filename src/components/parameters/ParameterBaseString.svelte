<svelte:options immutable={true} />

<script lang="ts">
  import CopyIcon from 'bootstrap-icons/icons/copy.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { setClipboardContent } from '../../utilities/clipboard';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';
  import { type ActionArray } from '../../utilities/useActions';
  import PermissionGuard from '../form/PermissionGuard.svelte';
  import TextInput from '../form/TextInput.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterUnits from './ParameterUnits.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let type: 'text' | 'password' = 'text';

  // New permission props (preferred)
  export let hasPermission: boolean = true;
  export let permissionError: string = '';

  // Legacy support: extract permission from use array if new props not provided
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  // Combine explicit props with legacy use array extraction
  $: effectiveHasPermission = hasPermission && !extractReadonlyFromUse(use);
  $: effectivePermissionError = permissionError || extractTooltipFromUse(use);

  // Helper to extract permission from legacy use array
  function extractReadonlyFromUse(actions: ActionArray): boolean {
    for (const action of actions) {
      if (Array.isArray(action) && action[0] === permissionHandler) {
        const props = action[1] as { hasPermission?: boolean };
        if (props?.hasPermission === false) {
          return true;
        }
      }
    }
    return false;
  }

  function extractTooltipFromUse(actions: ActionArray): string {
    for (const action of actions) {
      if (Array.isArray(action) && action[0] === permissionHandler) {
        const props = action[1] as { permissionError?: string };
        return props?.permissionError ?? '';
      }
    }
    return '';
  }

  function handleChange(): void {
    dispatch('change', formParameter);
  }
</script>

<div class="parameter-base-string" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <div class="parameter-input-container">
    <PermissionGuard hasPermission={effectiveHasPermission} permissionError={effectivePermissionError} let:readonly let:readonlyTooltip>
      <TextInput
        bind:value={formParameter.value}
        {type}
        {disabled}
        {readonly}
        {readonlyTooltip}
        error={formParameter.errors !== null}
        name={formParameter.name}
        on:change={handleChange}
      >
        <div class="parameter-right" slot="right">
          <ParameterUnits unit={formParameter.schema?.metadata?.unit?.value} />
          <button
            type="button"
            class="st-icon copy-parameter-value"
            use:tooltip={{ content: 'Copy Value' }}
            on:click={() => {
              setClipboardContent(formParameter.value);
            }}
          >
            <CopyIcon />
          </button>
          <ParameterBaseRightAdornments
            {disabled}
            hidden={hideRightAdornments}
            {formParameter}
            {parameterType}
            {readonly}
            on:reset={() => dispatch('reset', formParameter)}
          />
        </div>
      </TextInput>
    </PermissionGuard>
  </div>
</div>

<style>
  .parameter-base-string {
    align-items: center;
    display: grid;
  }

  .parameter-input-container {
    min-width: 0;
    width: 100%;
  }

  .parameter-right {
    display: flex;
    gap: 2px;
    min-width: min-content;
  }

  .copy-parameter-value {
    height: 16px;
    margin: 0 4px;
    visibility: hidden;
    width: 16px;
  }

  .copy-parameter-value:hover {
    cursor: pointer;
  }

  .parameter-base-string:hover .copy-parameter-value {
    visibility: visible;
  }
</style>
