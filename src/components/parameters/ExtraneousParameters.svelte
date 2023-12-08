<svelte:options immutable={true} />

<script lang="ts">
  import WarningExtraIcon from '@nasa-jpl/stellar/icons/warning_extra.svg?component';
  import CopyIcon from 'bootstrap-icons/icons/copy.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { ArgumentsMap } from '../../types/parameter';
  import { isMacOs } from '../../utilities/generic';
  import { isMetaOrCtrlPressed } from '../../utilities/keyboardEvents';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';

  export let argumentsMap: ArgumentsMap;
  export let hasPermission: boolean = true;
  export let extraArguments: string[];
  export let permissionError: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  async function onCopy(event: MouseEvent) {
    const { value } = event.currentTarget as HTMLButtonElement;
    if (value) {
      try {
        await navigator.clipboard.writeText(`${value}`);
        showSuccessToast('Value of parameter copied to clipboard');
      } catch {
        showFailureToast('Error copying parameter value to clipboard');
      }
    }
  }

  async function onReset(event: MouseEvent) {
    if (isMetaOrCtrlPressed(event)) {
      dispatch('reset', 'extra');
    }
  }
</script>

<div class="extra-parameters-container">
  <fieldset>
    <span class="extra-parameters-header">
      Extraneous Parameters
      <button
        class="reset-button"
        value="extra"
        on:click={onReset}
        use:tooltip={{
          allowHTML: true,
          content: `Remove ${extraArguments.length} extraneous parameter${pluralize(extraArguments.length)}`,
          disabled: !hasPermission,
          shortcut: `${isMacOs() ? '⌘' : 'CTRL'} Click`,
        }}
        use:permissionHandler={{
          hasPermission,
          permissionError,
        }}
      >
        <WarningExtraIcon class="dark-red-icon" />
      </button></span
    >
    <div class="extra-parameters-content">
      {#each extraArguments as extraArgument}
        <div class="name">
          <span use:tooltip={{ content: extraArgument, placement: 'top' }}>{extraArgument}</span>
        </div>
        <Input>
          <input
            value={argumentsMap[extraArgument] ? `${argumentsMap[extraArgument]}` : ''}
            class="st-input w-100 error"
            readonly
            type="text"
          />
          <div class="parameter-right" slot="right">
            <button
              class="st-button icon"
              value={argumentsMap[extraArgument] ? `${argumentsMap[extraArgument]}` : ''}
              use:tooltip={{ content: 'Copy value to clipboard', placement: 'top' }}
              on:click={onCopy}
            >
              <CopyIcon />
            </button>
          </div>
        </Input>
      {/each}
    </div>
  </fieldset>
</div>

<style>
  .extra-parameters-header {
    align-items: center;
    color: var(--st-red);
    column-gap: 0.2rem;
    display: flex;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .extra-parameters-content {
    column-gap: 4px;
    display: grid;
    grid-template-columns: 1fr 2fr;
    margin-left: 32px;
    row-gap: 10px;
  }

  .name {
    align-items: center;
    display: flex;
    overflow: hidden;
  }

  .name span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reset-button {
    background-color: unset;
    border: 0;
    margin: 0;
    padding: 0.5px 5px;
  }

  .reset-button:hover {
    background-color: var(--st-gray-20, #ebecec);
    border-radius: 9px;
  }

  .icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    min-width: 0;
  }

  .icon:hover {
    background-color: initial;
    color: var(--st-gray-60);
    cursor: pointer;
  }
</style>
