<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../../components/ui/Sidebar/index.js';
  import type { User } from '../../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import { cleanPath, joinPath } from '../../../utilities/workspaces.js';
  import InputInternal from '../../form/Input.svelte';
  import WorkspaceTreeView from '../../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let currentWorkspace: Workspace;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let inputLanguageName: string;
  export let outputLanguageExtensions: string[];
  export let startingPath: string = '';
  export let workspace: Workspace | null | undefined = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?: {
        filesToConvert: File[];
        filesToUpload: File[];
        shouldKeepOriginalFiles: boolean;
        targetDirectory: string;
      };
    };
  }>();

  let targetDirectory: string = joinPath([currentWorkspace?.name ?? '', startingPath]);
  let uploadButtonDisabled: boolean = true;
  let files: FileList | undefined;
  let selectedFileGroupings: { convertableFiles: File[]; uploadableFiles: File[] } = {
    convertableFiles: [],
    uploadableFiles: [],
  };
  let shouldConvert: boolean = false;
  let shouldKeepOriginalFiles: boolean = false;

  $: {
    uploadButtonDisabled = files === undefined || files.length === 0;
    selectedFileGroupings = Array.from(files ?? []).reduce(
      (previousFileGroupings: { convertableFiles: File[]; uploadableFiles: File[] }, file) => {
        if (
          outputLanguageExtensions.findIndex(fileExtension =>
            file.name.endsWith(`.${fileExtension.replace(/^\./, '')}`),
          ) > -1
        ) {
          return {
            ...previousFileGroupings,
            convertableFiles: [...previousFileGroupings.convertableFiles, file],
          };
        }
        return {
          ...previousFileGroupings,
          uploadableFiles: [...previousFileGroupings.uploadableFiles, file],
        };
      },
      { convertableFiles: [], uploadableFiles: [] },
    );
  }

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function upload() {
    if (!uploadButtonDisabled) {
      let filesToConvert: File[] = [];
      let filesToUpload: File[] = [];
      if (shouldConvert) {
        filesToConvert = selectedFileGroupings.convertableFiles;
        filesToUpload = selectedFileGroupings.uploadableFiles;
      } else {
        filesToUpload = [...selectedFileGroupings.convertableFiles, ...selectedFileGroupings.uploadableFiles];
      }

      open = false;
      dispatch('resolve', {
        confirm: true,
        value: {
          filesToConvert,
          filesToUpload,
          shouldKeepOriginalFiles,
          targetDirectory: cleanPath(joinPath([targetDirectory.replace(new RegExp(`^${currentWorkspace.name}`), '')])),
        },
      });
    }
  }

  function handleCancel() {
    open = false;
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      upload();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<StellarDialog bind:open size="auto" className="w-[380px] h-[400px]" title="Upload File(s) To Workspace" on:close>
  <div class="flex h-full flex-col gap-1 overflow-hidden py-2">
    <Sidebar.Provider
      style="--sidebar-width: auto"
      className="min-h-0 flex-1 overflow-y-auto rounded-md border-(--st-gray-20) border-2"
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
        <input bind:files multiple class="w-100" name="file" type="file" aria-label="File(s)" />
      </InputInternal>
      {#if selectedFileGroupings.convertableFiles.length > 0}
        <div class="flex gap-8">
          <div class="flex items-center gap-1">
            <input bind:checked={shouldConvert} aria-label="Should translate" id="should-convert" type="checkbox" />
            <label class="select-none" for="should-convert">
              Translate{selectedFileGroupings.convertableFiles.length > 1
                ? ` ${selectedFileGroupings.convertableFiles.length} files `
                : ' '}to {inputLanguageName}
            </label>
          </div>
          {#if shouldConvert}
            <div class="flex items-center gap-1">
              <input
                bind:checked={shouldKeepOriginalFiles}
                aria-label="Keep original files"
                id="keep-files"
                type="checkbox"
              />
              <label class="select-none" for="keep-files">Keep original files</label>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      cancelText="Cancel"
      confirmText="Upload"
      confirmDisabled={uploadButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={upload}
    />
  </svelte:fragment>
</StellarDialog>
