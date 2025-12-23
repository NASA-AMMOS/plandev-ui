<svelte:options immutable={true} />

<script lang="ts" generics="OutputFormat extends { name: string }">
  import { Button, cn, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import { Braces, Bug, Clipboard, Download, FileOutput } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import { isMacOs } from '../../utilities/generic';
  import Tooltip from '../ui/Tooltip.svelte';
  import SequenceActionCombobox from './SequenceActionCombobox.svelte';

  // Actions menu
  export let actions: { action: ActionDefinition; parameter: string }[] = [];
  export let actionsDisabled: boolean = false;
  export let showActions: boolean = false;

  // Error panel button
  export let showErrorPanelButton: boolean = false;
  export let onShowErrorPanel: (() => void) | undefined = undefined;

  // Format button
  export let showFormatButton: boolean = false;
  export let onFormat: (() => void) | undefined = undefined;

  // Copy button
  export let showCopyButton: boolean = false;
  export let copyDisabled: boolean = false;
  export let copyTooltip: string = 'Copy contents';
  export let onCopy: (() => void) | undefined = undefined;

  // Download button
  export let showDownloadButton: boolean = false;
  export let downloadDisabled: boolean = false;
  export let downloadTooltip: string = 'Download contents';
  export let onDownload: (() => void) | undefined = undefined;

  // Output formats dropdown
  export let outputFormats: OutputFormat[] = [];
  export let outputDisabled: boolean = false;
  export let onCopyOutput: ((format: OutputFormat) => void) | undefined = undefined;
  export let onDownloadOutput: ((format: OutputFormat) => void) | undefined = undefined;

  // Save button
  export let showSaveButton: boolean = false;
  export let saveDisabled: boolean = false;
  export let saveHighlighted: boolean = false;
  export let onSave: (() => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{
    runAction: { action: ActionDefinition; parameter: string };
  }>();

  function handleRunAction(event: CustomEvent<{ action: ActionDefinition; parameter: string }>) {
    dispatch('runAction', event.detail);
  }
</script>

<div class="flex items-center justify-end gap-1.5">
  <slot name="start" />

  {#if showActions}
    <SequenceActionCombobox {actions} on:runAction={handleRunAction} disabled={actionsDisabled} />
  {/if}

  {#if showErrorPanelButton && onShowErrorPanel}
    <Tooltip content="Show error panel" side="top" align="center">
      <Button variant="outline" size="icon" on:click={onShowErrorPanel}>
        <Bug size={16} />
      </Button>
    </Tooltip>
  {/if}

  {#if showFormatButton && onFormat}
    <Tooltip content="Format whitespace">
      <Button variant="outline" size="icon" on:click={onFormat}>
        <Braces size={16} />
      </Button>
    </Tooltip>
  {/if}

  {#if showCopyButton && onCopy}
    <Tooltip content={copyTooltip}>
      <Button variant="outline" size="icon" on:click={onCopy} disabled={copyDisabled}>
        <Clipboard size={16} />
      </Button>
    </Tooltip>
  {/if}

  {#if showDownloadButton && onDownload}
    <Tooltip content={downloadTooltip}>
      <Button variant="outline" size="icon" on:click={onDownload} disabled={downloadDisabled}>
        <Download size={16} />
      </Button>
    </Tooltip>
  {/if}

  {#if outputFormats.length > 0}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild let:builder>
        <Button builders={[builder]} variant="outline" class="gap-1">
          <FileOutput size={14} />
          Output
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="flex flex-col">
        {#each outputFormats as outputFormat}
          <Tooltip side="left" content={`Copy as ${outputFormat.name} to clipboard`}>
            <DropdownMenu.Item
              size="sm"
              on:click={() => onCopyOutput?.(outputFormat)}
              disabled={outputDisabled}
              class="w-full"
            >
              <div class="flex gap-2">
                <Clipboard size={16} />
                {outputFormat.name}
              </div>
            </DropdownMenu.Item>
          </Tooltip>
          <Tooltip side="left" class="flex" content={`Download as ${outputFormat.name}`}>
            <DropdownMenu.Item
              size="sm"
              on:click={() => onDownloadOutput?.(outputFormat)}
              disabled={outputDisabled}
              class="w-full"
            >
              <div class="flex gap-2">
                <Download size={16} />
                {outputFormat.name}
              </div>
            </DropdownMenu.Item>
          </Tooltip>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}

  <slot name="end" />

  {#if showSaveButton && onSave}
    <Tooltip content="Save changes" shortcut={`${isMacOs() ? '⌘' : 'CTRL'}S`}>
      <Button
        class={cn('transition-none', saveHighlighted ? 'border border-primary ring-offset-1' : '')}
        variant={saveHighlighted ? 'default' : 'outline'}
        disabled={saveDisabled}
        on:click={onSave}
      >
        Save
      </Button>
    </Tooltip>
  {/if}
</div>
