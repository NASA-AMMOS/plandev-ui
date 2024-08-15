<svelte:options immutable={true} />

<script lang="ts">
  import { permissionHandler } from '../../../utilities/permissionHandler';

  import DownloadIcon from '@nasa-jpl/stellar/icons/download.svg?component';
  import ExpandIcon from '@nasa-jpl/stellar/icons/expand.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import type { Placement } from 'tippy.js';
  import ExportIcon from '../../../assets/export.svg?component';
  import type { TRowData } from '../../../types/data-grid';
  import { tooltip } from '../../../utilities/tooltip';
  import CancellableProgressRadial from '../CancellableProgressRadial.svelte';

  type RowData = $$Generic<TRowData>;

  type Tooltip = {
    content: string;
    placement: Placement;
  };

  export let rowData: RowData | undefined;
  export let editButtonClass: string | undefined = undefined;
  export let editTooltip: Tooltip | undefined = undefined;
  export let deleteButtonClass: string | undefined = undefined;
  export let deleteTooltip: Tooltip | undefined = undefined;
  export let downloadButtonClass: string | undefined = undefined;
  export let downloadTooltip: Tooltip | undefined = undefined;
  export let hasDeletePermission: boolean = true;
  export let hasDeletePermissionError: string | undefined = undefined;
  export let hasEditPermission: boolean = true;
  export let hasEditPermissionError: string | undefined = undefined;
  export let useExportIcon: boolean | undefined = undefined;
  export let viewButtonClass: string | undefined = undefined;
  export let viewTooltip: Tooltip | undefined = undefined;

  export let editCallback: ((data: RowData) => void) | undefined = undefined;
  export let deleteCallback: ((data: RowData) => void) | undefined = undefined;
  export let downloadCallback:
    | ((data: RowData, progressCallback?: (progress: number) => void, signal?: AbortSignal) => void)
    | undefined = undefined;
  export let viewCallback: ((data: RowData) => void) | undefined = undefined;

  let downloadAbortController: AbortController | null = null;
  let downloadProgress: number | null = null;

  async function onDownload() {
    if (rowData) {
      if (downloadProgress === null) {
        if (downloadAbortController) {
          downloadAbortController.abort();
        }

        downloadAbortController = new AbortController();
        downloadProgress = 0;

        if (downloadAbortController && !downloadAbortController.signal.aborted) {
          await downloadCallback?.(rowData, progressCallback, downloadAbortController.signal);
        }
      } else {
        downloadAbortController?.abort();
        downloadAbortController = null;
      }
      downloadProgress = null;
    }
  }

  function onCancelDownload() {
    downloadAbortController?.abort();
    downloadAbortController = null;
    downloadProgress = null;
  }

  function progressCallback(progress: number) {
    downloadProgress = progress;
  }
</script>

{#if viewCallback}
  <button
    class:st-button={true}
    class:icon={true}
    class={viewButtonClass}
    on:click|stopPropagation={() => {
      if (rowData) {
        viewCallback?.(rowData);
      }
    }}
    use:tooltip={viewTooltip}
  >
    <ExpandIcon />
  </button>
{/if}
{#if downloadCallback}
  {#if downloadProgress === null}
    <button
      class:st-button={true}
      class:download={true}
      class:icon={true}
      class={downloadButtonClass}
      on:click|stopPropagation={onDownload}
      use:tooltip={downloadTooltip}
    >
      {#if useExportIcon}
        <ExportIcon />
      {:else}
        <DownloadIcon />
      {/if}
    </button>
  {:else}
    <button
      class:st-button={true}
      class:download={true}
      class:downloading={true}
      class:icon={true}
      class={downloadButtonClass}
      on:click|stopPropagation={onCancelDownload}
      use:tooltip={{ ...downloadTooltip, content: `Cancel ${downloadTooltip?.content}` }}
    >
      <CancellableProgressRadial progress={downloadProgress} />
    </button>
  {/if}
{/if}
{#if editCallback}
  <button
    class:st-button={true}
    class:icon={true}
    class={editButtonClass}
    on:click|stopPropagation={() => {
      if (rowData && hasEditPermission === true) {
        editCallback?.(rowData);
      }
    }}
    use:tooltip={hasEditPermission ? editTooltip : undefined}
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: hasEditPermissionError || `You do not have permission to ${editTooltip?.content ?? 'edit'}.`,
    }}
  >
    <PenIcon />
  </button>
{/if}
{#if deleteCallback}
  <button
    class:st-button={true}
    class:icon={true}
    class={deleteButtonClass}
    on:click|stopPropagation={() => {
      if (rowData && hasDeletePermission === true) {
        deleteCallback?.(rowData);
      }
    }}
    use:tooltip={hasDeletePermission ? deleteTooltip : undefined}
    use:permissionHandler={{
      hasPermission: hasDeletePermission,
      permissionError:
        hasDeletePermissionError || `You do not have permission to ${deleteTooltip?.content ?? 'delete'}.`,
    }}
  >
    <TrashIcon />
  </button>
{/if}

<style>
  .download {
    --progress-radial-background: var(--st-gray-20);
    border-radius: 50%;
    position: relative;
  }
</style>
