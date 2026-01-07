<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { PATH_DELIMITER } from '../../../constants/workspaces';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import { joinPath } from '../../../utilities/workspaces';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let originalNode: WorkspaceTreeNode;
  export let originalPath: string;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?: { originalNode: WorkspaceTreeNode; originalPath: string; targetPath: string };
    };
  }>();

  let originalDirectory: string = '';
  let originalName: string = '';
  let targetName: string = '';

  $: typeString = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';

  $: {
    const pathParts = originalPath.split(PATH_DELIMITER);
    originalName = pathParts.pop() ?? '';
    targetName = originalName;
    originalDirectory = pathParts.join(PATH_DELIMITER);
  }

  $: confirmButtonDisabled = originalName === targetName || targetName.trim() === '';

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    if (!confirmButtonDisabled) {
      open = false;
      dispatch('resolve', {
        confirm: true,
        value: { originalNode, originalPath, targetPath: joinPath([originalDirectory, targetName.trim()]) },
      });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }
</script>

<StellarDialog bind:open size="sm" title="Rename Workspace {typeString}" on:close>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <Label size="sm" for="original-path">Original Name</Label>
      <Input
        sizeVariant="sm"
        id="original-path"
        name="original-path"
        autocomplete="off"
        value={originalName}
        disabled
      />
    </div>
    <div class="grid gap-2">
      <Label size="sm" for="target-path">New Name</Label>
      <Input
        sizeVariant="sm"
        id="target-path"
        name="target-path"
        autocomplete="off"
        bind:value={targetName}
        on:keydown={onInputKeydown}
      />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Rename {typeString}"
      confirmDisabled={confirmButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleConfirm}
    />
  </svelte:fragment>
</StellarDialog>
