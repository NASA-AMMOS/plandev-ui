<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Textarea } from '@nasa-jpl/stellar-svelte';
  import { Lock } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { classNames } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  // Input props
  export let value: string = '';
  export let placeholder: string = '';
  export let name: string = '';
  export let id: string = '';
  export let type: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' = 'text';
  export let autocomplete: string = 'off';

  // State props
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let error: boolean = false;

  // Readonly lock tooltip
  export let readonlyTooltip: string = '';

  // Textarea mode
  export let multiline: boolean = false;
  export let rows: number = 3;

  // Stellar-specific props
  export let sizeVariant: 'default' | 'sm' | 'xs' = 'xs';

  // Styling
  export { className as class };
  let className: string = '';

  // Slot padding configuration
  const padLeft = 8;
  const padRight = 8;
  const iconSize = 20;
  const lockIconSize = 14;

  const dispatch = createEventDispatcher<{
    blur: FocusEvent;
    change: string;
    focus: FocusEvent;
    input: string;
  }>();

  $: hasLeftSlot = $$slots.left;
  $: hasRightSlot = $$slots.right;

  $: containerClasses = classNames(`txt-input-container ${className}`.trim(), {
    'txt-input-disabled': disabled,
    'txt-input-error': error,
    'txt-input-multiline': multiline,
    'txt-input-readonly': readonly,
  });

  // Pre-calculate padding to avoid jitter - use fixed values based on slot presence
  $: leftPadding = hasLeftSlot ? padLeft + iconSize + 4 : padLeft;
  $: rightPadding = (readonly ? lockIconSize + padRight : 0) + (hasRightSlot ? iconSize + padRight : padRight);

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    value = target.value;
    dispatch('input', value);
  }

  function handleChange(_event: Event) {
    dispatch('change', value);
  }

  function handleFocus(event: FocusEvent) {
    dispatch('focus', event);
  }

  function handleBlur(event: FocusEvent) {
    dispatch('blur', event);
  }
</script>

<div class={containerClasses}>
  {#if !multiline && hasLeftSlot}
    <div class="txt-input-left" style="left: {padLeft}px;">
      <slot name="left" />
    </div>
  {/if}

  {#if multiline}
    <Textarea
      class="txt-input {error ? 'error' : ''}"
      {name}
      {id}
      {placeholder}
      {disabled}
      {rows}
      {readonly}
      {value}
      style="padding-left: {padLeft}px; padding-right: {rightPadding}px;"
      on:input={handleInput}
      on:change={handleChange}
      on:focus={handleFocus}
      on:blur={handleBlur}
    />
  {:else}
    <Input
      class="txt-input"
      {sizeVariant}
      {type}
      {name}
      {id}
      {placeholder}
      {disabled}
      {autocomplete}
      {readonly}
      {value}
      style="padding-left: {leftPadding}px; padding-right: {rightPadding}px;"
      on:input={handleInput}
      on:change={handleChange}
      on:focus={handleFocus}
      on:blur={handleBlur}
    />
  {/if}

  {#if (!multiline && hasRightSlot) || readonly}
    <div class="txt-input-right" style="right: {padRight}px;">
      {#if !multiline && hasRightSlot}
        <slot name="right" />
      {/if}
      {#if readonly}
        <div class="txt-input-lock" use:tooltip={{ content: readonlyTooltip, placement: 'top' }}>
          <Lock size={lockIconSize} />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .txt-input-container {
    display: flex;
    position: relative;
    width: 100%;
  }

  .txt-input-container :global(.txt-input) {
    width: 100%;
  }

  .txt-input-left,
  .txt-input-right {
    align-items: center;
    display: flex;
    gap: 4px;
    height: 100%;
    pointer-events: none;
    position: absolute;
    top: 0;
  }

  .txt-input-left {
    left: 0;
  }

  .txt-input-right {
    right: 0;
  }

  /* Allow pointer events on interactive elements in slots */
  .txt-input-left :global(*),
  .txt-input-right :global(*) {
    pointer-events: auto;
  }

  .txt-input-lock {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    pointer-events: auto;
  }

  /* Disabled state - reuse global pattern */
  .txt-input-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .txt-input-disabled :global(.txt-input) {
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Readonly state - normal appearance with lock icon */
  .txt-input-readonly :global(.txt-input) {
    cursor: text;
  }

  /* Error state */
  .txt-input-error :global(.txt-input) {
    border-color: var(--st-red);
  }

  /* Multiline specific */
  .txt-input-multiline .txt-input-right {
    align-items: flex-start;
    padding-top: 8px;
  }

  .txt-input-multiline :global(textarea) {
    resize: vertical;
  }
</style>
