<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ParameterType, ValueSource } from '../../types/parameter';
  import { classNames, isMacOs } from '../../utilities/generic';
  import { isMetaOrCtrlPressed } from '../../utilities/keyboardEvents';
  import { tooltip } from '../../utilities/tooltip';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let isCompact: boolean = true;
  export let disabled: boolean = false;
  export let source: ValueSource;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher();

  let showButton: boolean = false;
  let status: string = '';
  let tooltipContent: string = '';
  let tooltipContentModifiedReset: string = '';

  $: dotClasses = classNames('value-source-badge-dot st-typography-body', {
    'value-source-badge-dot--mission': source === 'mission',
    'value-source-badge-dot--preset': source === 'preset',
    'value-source-badge-dot--user': source === 'user on model' || source === 'user on preset',
  });
  $: {
    const presetText = parameterType === 'activity' ? 'Activity Preset' : 'Simulation Template';
    showButton = false;
    switch (source) {
      case 'user on model':
      case 'user on preset':
        showButton = true;
        tooltipContentModifiedReset = `<div class="value-source-tooltip-modified-reset">
                                          <span>Reset to ${source === 'user on preset' ? presetText : 'Model'}</span>
                                          <div>${isMacOs() ? '⌘' : 'CTRL'} Click</div>
                                       </div>`;
        tooltipContent = `<div class="value-source-tooltip-modified">
                            <span>Modified</span>
                            ${disabled ? '' : tooltipContentModifiedReset}
                          </div>`;
        break;
      case 'preset':
        tooltipContent = `${presetText} Value`;
        break;
      case 'mission':
      default:
        tooltipContent = 'Mission Model';
    }
    switch (source) {
      case 'user on model':
      case 'user on preset':
        status = 'Override';
        break;
      case 'preset':
        status = `${presetText} Value`;
        break;
      case 'mission':
      default:
        status = 'Mission Model';
    }
  }

  function onClick(event: MouseEvent) {
    if (isMetaOrCtrlPressed(event) && !disabled) {
      reset();
    }
  }

  function reset() {
    dispatch('reset');
  }
</script>

{#if source !== 'none'}
  <div
    class={classNames('value-source-badge-dot-root', {
      'value-source-badge-compact': isCompact,
    })}
    role="none"
    use:tooltip={{ allowHTML: true, content: tooltipContent, disabled: !isCompact, placement: 'top' }}
    use:useActions={use}
    on:click={onClick}
  >
    <div class={dotClasses} />
    {#if !isCompact}
      <span>{status}</span>
      {#if showButton && !disabled}
        <button type="button" class="value-source-reset-button st-button icon" on:click={reset}>Reset</button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .value-source-badge-dot-root {
    align-items: center;
    display: flex;
    gap: 4px;
    height: 16px;
    min-width: auto;
  }
  .value-source-badge-dot-root.value-source-badge-compact {
    justify-content: center;
  }

  .value-source-badge-dot {
    background-color: gray;
    border-radius: 50%;
    height: 6px;
    width: 6px;
  }

  .value-source-badge-dot--user {
    background: orange;
  }

  .value-source-badge-dot--preset {
    background: var(--st-primary-70);
  }

  .value-source-badge-dot--mission {
    background: var(--st-success-green);
  }

  .value-source-reset-button {
    border: 1px solid var(--st-gray-30);
    min-width: inherit;
    padding: 0 8px;
  }

  :global(.value-source-tooltip-modified) {
    align-items: center;
    color: var(--st-gray-10);
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

  :global(.value-source-tooltip-modified .value-source-tooltip-modified-reset) {
    align-items: center;
    display: flex;
    font-weight: 200;
    gap: 0.3rem;
  }

  :global(.value-source-tooltip-modified .value-source-tooltip-modified-reset > div) {
    background-color: var(--st-gray-70);
    border-radius: 3px;
    padding: 0 2px;
  }
</style>
