<svelte:options immutable={true} />

<script lang="ts">
  import { Input } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { cleanPath, joinPath } from '../../utilities/workspaces.js';
  import InputInternal from '../form/Input.svelte';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let inputLanguageName: string = 'SeqN';
  export let outputLanguageExtensions: string[] = ['.seq.json'];
  export let height: number = 400;
  export let width: number = 380;
  export let startingPath: string = '';
  export let workspace: Workspace | null | undefined = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      convertedFileExtension: string;
      files: FileList;
      keepOriginalFiles: boolean;
      shouldConvert: boolean;
      targetDirectory: string;
    };
  }>();

  let targetDirectory: string = joinPath([currentWorkspace?.name ?? '', startingPath]);
  let saveButtonDisabled: boolean = false;
  let filesToUpload: FileList;
  let keepOriginalFiles: boolean = false;
  let shouldConvert: boolean = false;
  let convertedFileExtension: string = '.seqN.txt';
  let numberOfConvertableFiles: number = 0;

  $: {
    saveButtonDisabled = filesToUpload?.length === 0;
    numberOfConvertableFiles = 0;
    for (let i = 0; i < (filesToUpload?.length ?? 0); i++) {
      const file = filesToUpload[i];
      const extension = file.name.replace(/^(?:[^.]+)(\..+)?$/, '$1');
      if (
        extension &&
        outputLanguageExtensions.findIndex(fileExtension => extension === `.${fileExtension.replace(/^\./, '')}`) > -1
      ) {
        numberOfConvertableFiles++;
      }
    }
  }

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function save() {
    if (!saveButtonDisabled) {
      dispatch('confirm', {
        convertedFileExtension,
        files: filesToUpload,
        keepOriginalFiles,
        shouldConvert,
        targetDirectory: cleanPath(joinPath([targetDirectory.replace(new RegExp(`^${currentWorkspace.name}`), '')])),
      });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      save();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Upload File(s) To Workspace</ModalHeader>

  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[auto_min-content] gap-1">
      <Sidebar.Provider
        style="--sidebar-width: auto"
        className="min-h-full overflow-y-auto rounded-md border-(--st-gray-20) border-2"
      >
        <Sidebar.Content>
          <Sidebar.Menu className="h-full">
            <WorkspaceTreeView
              selectedTreeNodePath={targetDirectory}
              treeNode={currentWorkspaceContents}
              enableContextMenu={false}
              showFiles={false}
              showRootNode={true}
              {workspace}
              {user}
              on:nodeClicked={onFolderClicked}
            />
          </Sidebar.Menu>
        </Sidebar.Content>
      </Sidebar.Provider>
      <div class="flex flex-col gap-2 py-1">
        <InputInternal layout="stacked">
          <label class="block pb-0.5" for="file">File(s)</label>
          <input bind:files={filesToUpload} multiple class="w-100" name="file" type="file" aria-label="File(s)" />
        </InputInternal>
        {#if numberOfConvertableFiles > 0}
          <div class="flex gap-8">
            <div class="flex items-center gap-1">
              <input bind:checked={shouldConvert} aria-label="Should translate" id="should-convert" type="checkbox" />
              <label class="select-none" for="should-convert">
                Translate{numberOfConvertableFiles > 1 ? ` ${numberOfConvertableFiles} files ` : ' '}to {inputLanguageName}
              </label>
            </div>
            {#if shouldConvert}
              <div class="flex items-center gap-1">
                <input
                  bind:checked={keepOriginalFiles}
                  aria-label="Keep original files"
                  id="keep-files"
                  type="checkbox"
                />
                <label class="select-none" for="keep-files">Keep original files</label>
              </div>
            {/if}
          </div>
          {#if shouldConvert}
            <InputInternal layout="stacked">
              <label class="block pb-0.5" for="file-extension">Translated file extension</label>
              <Input
                class="mx-1"
                sizeVariant="xs"
                bind:value={convertedFileExtension}
                aria-label="Translated file extension"
                id="file-extension"
                type="text"
              />
            </InputInternal>
          {/if}
        {/if}
      </div>
    </div>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Upload </button>
  </ModalFooter>
</Modal>
