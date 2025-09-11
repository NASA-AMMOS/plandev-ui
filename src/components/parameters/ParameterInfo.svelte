<svelte:options immutable={true} />

<script lang="ts">
  import { Popover } from '@nasa-jpl/stellar-svelte';
  import { Info } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ValueSource } from '../../types/parameter';
  import ValueSourceBadge from './ValueSourceBadge.svelte';

  export let formParameter: FormParameter;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    reset: FormParameter;
  }>();

  let isIconHovered: boolean = false;
  let isTooltipHovered: boolean = false;
  let leaveTimeout: NodeJS.Timeout | null = null;
  let source: ValueSource;
  let unit: string | undefined = undefined;
  let required: boolean = true;
  let externalEvent: boolean = false;
  let ref: HTMLElement;

  $: if (formParameter) {
    source = formParameter.valueSource;
    unit = formParameter.schema?.metadata?.unit?.value;
    externalEvent = formParameter.externalEvent ?? false;
    required = formParameter.required ?? true;
  }

  function leaveCallback() {
    if (leaveTimeout != null) {
      clearTimeout(leaveTimeout);
    }

    leaveTimeout = setTimeout(() => {
      if (isIconHovered || isTooltipHovered) {
        leaveCallback();
      }
    }, 100);
  }

  function hoverCallback() {
    if (leaveTimeout != null) {
      clearTimeout(leaveTimeout);
    }
  }

  function onIconOver() {
    isIconHovered = true;
    hoverCallback();
  }

  function onReset() {
    dispatch('reset', formParameter);
  }

  function onTooltipOver() {
    isTooltipHovered = true;
    hoverCallback();
  }

  function onIconOut() {
    isIconHovered = false;
    leaveCallback();
  }

  function onTooltipOut() {
    isTooltipHovered = false;
    leaveCallback();
  }
</script>

{#if externalEvent || unit || source !== 'none'}
  <div
    bind:this={ref}
    class="parameter-info-container"
    role="contentinfo"
    on:mouseenter={onIconOver}
    on:mouseleave={onIconOut}
  >
    <Popover.Root bind:open={isIconHovered} onOpenChange={open => (isTooltipHovered = open)} portal={ref}>
      <Popover.Trigger on:click={e => e.preventDefault()}>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div on:mouseenter={onTooltipOver}>
          <Info size={16} />
        </div>
      </Popover.Trigger>
      <Popover.Content align="center" side="left" strategy="fixed" class="p-3">
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="block max-w-[300px]" on:mouseenter={onTooltipOver} on:mouseleave={onTooltipOut}>
          <div class="grid grid-cols-[1fr_1fr] gap-y-3">
            {#if unit}
              <div>Units</div>
              <div>{unit}</div>
            {/if}
            {#if source !== 'none'}
              <div>Source</div>
              <div>
                <ValueSourceBadge {disabled} isCompact={false} {source} on:reset={onReset} />
              </div>
            {/if}
            {#if externalEvent}
              <div class="parameter-info-label">Required</div>
              <div class="parameter-info-value"><i>{required}</i></div>
            {/if}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  </div>
{/if}
