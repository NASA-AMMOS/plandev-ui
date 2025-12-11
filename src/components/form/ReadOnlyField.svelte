<svelte:options immutable={true} />

<script lang="ts">
  import { classNames } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  export let label: string;
  export let value: string | number | null | undefined;
  export let layout: 'inline' | 'stacked' = 'inline';
  export let tooltipContent: string = '';
  export { className as class };

  let className: string = '';

  $: displayValue = value ?? '';
  $: classes = classNames('read-only-field', {
    [className]: !!className,
    'read-only-field-inline': layout === 'inline',
    'read-only-field-stacked': layout === 'stacked',
  });
</script>

<div class={classes}>
  <label use:tooltip={{ content: tooltipContent, placement: 'top' }}>{label}</label>
  <div class="value-container">
    <span class="value" title={String(displayValue)}>{displayValue}</span>
    <slot name="right" />
  </div>
</div>

<style>
  .read-only-field {
    width: 100%;
  }

  .read-only-field-inline {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: 40% auto;
    padding: 4px 0px;
  }

  .read-only-field-stacked {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    color: var(--st-gray-60);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value-container {
    align-items: center;
    display: flex;
    gap: 4px;
    min-width: 0;
  }

  .value {
    font-size: 12px;
    overflow: hidden;
    padding: 4px 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-button {
    align-items: center;
    background: none;
    border: none;
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    opacity: 0;
    padding: 2px;
    transition: opacity 0.1s;
  }

  .copy-button:hover {
    color: var(--st-gray-60);
  }

  .read-only-field:hover .copy-button {
    opacity: 1;
  }

  .copy-button :global(svg) {
    height: 14px;
    width: 14px;
  }
</style>
