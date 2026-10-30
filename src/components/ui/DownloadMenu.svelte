<svelte:options immutable={true} />

<script lang="ts">
  import { Button, cn, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, Download } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { DownloadMenuOption } from '../../types/dropdown';
  import Tooltip from './Tooltip.svelte';

  /** Where the dropdown opens relative to the trigger. */
  export let align: 'start' | 'end' = 'end';
  export let className: string = '';
  export let disabled: boolean = false;
  export let label: string;
  export let options: DownloadMenuOption[];
  export let size: 'icon' | undefined = undefined;
  export let variant: 'ghost' | 'default' | 'link' | 'destructive' | 'outline' | 'secondary' | undefined = 'outline';

  const dispatch = createEventDispatcher<{ download: { name: string } }>();

  $: singleOption = options.length === 1 ? options[0] : null;

  function selectOption(option: DownloadMenuOption) {
    if (!option.disabled) {
      dispatch('download', { name: option.name });
    }
  }
</script>

{#if singleOption}
  <Tooltip content={singleOption.disabledReason ?? label}>
    <Button
      {variant}
      {size}
      disabled={disabled || (singleOption.disabled && !singleOption.disabledReason)}
      class={cn(
        'flex shrink-0 items-center gap-0.5 text-muted-foreground',
        singleOption.disabled && singleOption.disabledReason ? 'cursor-not-allowed opacity-50' : '',
        className,
      )}
      aria-label={label}
      on:click={() => selectOption(singleOption)}
    >
      <Download size={14} class="shrink-0" />
    </Button>
  </Tooltip>
{:else}
  <DropdownMenu.Root>
    <!--
      Keyed on `disabled`: bits-ui's trigger action stamps `data-disabled`/`aria-disabled` onto the
      node once, at mount, based on whether it's disabled then, and never updates them afterward. Without
      this key, a trigger that mounts disabled stays stuck looking (and, via Tooltip's `aria-disabled`
      based styling, behaving) disabled even after `disabled` becomes false. Keying forces the trigger
      (and its action) to remount whenever `disabled` changes, so the stamped attributes stay in sync.
    -->
    {#key disabled}
      <DropdownMenu.Trigger asChild let:builder>
        <Tooltip content={label}>
          <Button
            builders={[builder]}
            {variant}
            {size}
            {disabled}
            class={cn('flex w-auto shrink-0 items-center gap-0.5', className)}
            aria-label={label}
          >
            <Download size={14} class="shrink-0" />
            <ChevronDown size={10} class="shrink-0" />
          </Button>
        </Tooltip>
      </DropdownMenu.Trigger>
    {/key}
    <DropdownMenu.Content {align} class="z-[10000]">
      {#each options as option (option.label)}
        <Tooltip
          content={option.disabledReason ?? ''}
          disabled={!option.disabled || !option.disabledReason}
          wrapperClass="w-full"
        >
          <DropdownMenu.Item
            size="sm"
            class={option.disabled ? 'cursor-not-allowed text-muted-foreground opacity-50' : ''}
            on:click={() => selectOption(option)}
          >
            {option.label}
          </DropdownMenu.Item>
        </Tooltip>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
