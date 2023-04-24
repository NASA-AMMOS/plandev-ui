<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ParameterType, ValueSource } from '../../types/parameter';
  import { classNames, isMacOs } from '../../utilities/generic';
  import { isMetaOrCtrlPressed } from '../../utilities/keyboardEvents';
  import { tooltip } from '../../utilities/tooltip';

  export let source: ValueSource;
  export let parameterType: ParameterType = 'activity';

  const dispatch = createEventDispatcher();

  let tooltipContent: string = '';

  $: dotClasses = classNames('value-source-badge-dot st-typography-body', {
    'value-source-badge-dot--mission': source === 'mission',
    'value-source-badge-dot--preset': source === 'preset',
    'value-source-badge-dot--user': source === 'user on model' || source === 'user on preset',
  });
  $: {
    const presetText = parameterType === 'activity' ? 'Activity Preset' : 'Simulation Template';
    switch (source) {
      case 'user on model':
      case 'user on preset':
        tooltipContent = `<div class="value-source-tooltip-modified">
                          <span>Modified</span>
                          <div class="value-source-tooltip-modified-reset">
                            <span>Reset to ${source === 'user on preset' ? presetText : 'Model'}</span>
                            <div>${isMacOs() ? '⌘' : 'CTRL'} Click</div>
                          </div>
                        </div>`;
        break;
      case 'preset':
        tooltipContent = `${presetText} Value`;
        break;
      case 'mission':
      default:
        tooltipContent = 'Mission Model';
    }
  }

  function onClick(event: MouseEvent) {
    if (isMetaOrCtrlPressed(event)) {
      dispatch('reset');
    }
  }
</script>

{#if source !== 'none'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="value-source-badge-dot-root"
    use:tooltip={{ allowHTML: true, content: tooltipContent, placement: 'top' }}
    on:click={onClick}
  >
    <div class={dotClasses} />
  </div>
{/if}

<style>
  .value-source-badge-dot-root {
    align-items: center;
    display: flex;
    height: 16px;
    justify-content: center;
    width: 16px;
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

  :global(.value-source-tooltip-modified) {
    align-items: center;
    color: var(--st-gray-10);
    column-gap: 2rem;
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
  }

  :global(.value-source-tooltip-modified .value-source-tooltip-modified-reset) {
    align-items: center;
    column-gap: 0.3rem;
    display: grid;
    font-weight: 200;
    grid-template-columns: auto auto;
  }

  :global(.value-source-tooltip-modified .value-source-tooltip-modified-reset > div) {
    background-color: var(--st-gray-70);
    border-radius: 3px;
    padding: 0 2px;
  }
</style>
