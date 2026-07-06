<svelte:options immutable={true} />

<script lang="ts">
  import type { OutputLanguage } from '@nasa-jpl/aerie-sequence-languages';

  import { Button, Label } from '@nasa-jpl/stellar-svelte';
  import { Clipboard, Download, PanelBottomClose, PanelBottomOpen } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import Tooltip from '../ui/Tooltip.svelte';

  export let isPreviewOpen: boolean = false;
  export let outputLanguages: OutputLanguage[] = [];
  export let outputDisabled: boolean = false;
  export let selectedOutputFormat: OutputLanguage | undefined;

  const dispatch = createEventDispatcher<{
    copyOutput: void;
    downloadOutput: void;
    togglePreview: void;
  }>();

  let copyTooltip: string = 'Copy to clipboard';
  let downloadTooltip: string = `Download`;

  $: copyTooltip = `Copy as ${selectedOutputFormat?.name} to clipboard`;
  $: downloadTooltip = `Download as ${selectedOutputFormat?.name}`;

  function onCopy() {
    dispatch('copyOutput');
  }

  function onDownload() {
    dispatch('downloadOutput');
  }

  function onTogglePreview() {
    dispatch('togglePreview');
  }
</script>

<div class="flex items-center justify-end gap-1.5">
  {#if outputLanguages.length > 0}
    <Label size="sm" class="mr-1 whitespace-nowrap  text-muted-foreground" for="outputFormat">Output Format</Label>
    <select bind:value={selectedOutputFormat} class="st-select w-full" id="outputFormat">
      {#each outputLanguages as outputFormatItem}
        <option value={outputFormatItem}>
          {outputFormatItem.name}
        </option>
      {/each}
    </select>
  {/if}
  <div class="flex items-center gap-1.5">
    <Tooltip content={copyTooltip}>
      <Button variant="outline" aria-label={copyTooltip} size="icon" on:click={onCopy} disabled={outputDisabled}>
        <Clipboard size={16} />
      </Button>
    </Tooltip>
    <Tooltip content={downloadTooltip}>
      <Button
        variant="outline"
        aria-label={downloadTooltip}
        size="icon"
        on:click={onDownload}
        disabled={outputDisabled}
      >
        <Download size={16} />
      </Button>
    </Tooltip>

    <Tooltip content={isPreviewOpen ? `Collapse Editor` : `Expand Editor`}>
      <Button
        size="icon"
        variant="ghost"
        aria-label={isPreviewOpen ? `Collapse Editor` : `Expand Editor`}
        on:click={onTogglePreview}
      >
        {#if isPreviewOpen}
          <PanelBottomClose size={16} />
        {:else}
          <PanelBottomOpen size={16} />
        {/if}
      </Button>
    </Tooltip>
  </div>
</div>
