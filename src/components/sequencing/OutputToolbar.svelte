<svelte:options immutable={true} />

<script lang="ts">
  import type { OutputLanguage } from '@nasa-jpl/plandev-sequence-languages';

  import { Button, Label } from '@nasa-jpl/stellar-svelte';
  import { Clipboard, PanelBottomClose, PanelBottomOpen } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { DownloadMenuOption } from '../../types/dropdown';
  import DownloadMenu from '../ui/DownloadMenu.svelte';
  import Tooltip from '../ui/Tooltip.svelte';

  export let isPreviewOpen: boolean = false;
  export let outputLanguages: OutputLanguage[] = [];
  export let outputDisabled: boolean = false;
  export let selectedOutputFormat: OutputLanguage | undefined;
  /** One entry per naming convention offered, e.g. plain filename and/or the revision-versioned filename. */
  export let downloadOptions: DownloadMenuOption[] = [];

  const dispatch = createEventDispatcher<{
    copyOutput: void;
    downloadOutput: { name: string };
    togglePreview: void;
  }>();

  let copyTooltip: string = 'Copy to clipboard';
  let downloadTooltip: string = `Download`;

  $: copyTooltip = `Copy as ${selectedOutputFormat?.name} to clipboard`;
  $: downloadTooltip = `Download as ${selectedOutputFormat?.name}`;

  function onCopy() {
    dispatch('copyOutput');
  }

  function onDownload(event: CustomEvent<{ name: string }>) {
    dispatch('downloadOutput', event.detail);
  }

  function onTogglePreview() {
    dispatch('togglePreview');
  }
</script>

<div class="flex items-center justify-end gap-1.5">
  {#if outputLanguages.length > 0}
    <Label size="sm" class="mr-1 whitespace-nowrap  text-muted-foreground" for="outputFormat">Output Format</Label>
    <select bind:value={selectedOutputFormat} class="st-select w-full min-w-20" id="outputFormat">
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
    <DownloadMenu
      align="end"
      size="icon"
      className="px-2"
      disabled={outputDisabled}
      label={downloadTooltip}
      options={downloadOptions}
      on:download={onDownload}
    />

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
