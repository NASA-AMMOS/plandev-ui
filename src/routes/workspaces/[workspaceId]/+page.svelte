<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { beforeNavigate, goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { env } from '$env/dynamic/public';
  import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import type { LibrarySequenceSignature, PhoenixContext, UserSequence } from '@nasa-jpl/aerie-sequence-languages';
  import { Folder, TriangleAlert } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../../components/ui/CssGridGutter.svelte';
  import * as Sidebar from '../../../components/ui/Sidebar/index.js';
  import TextEditor from '../../../components/ui/TextEditor.svelte';
  import WorkspaceSidebar from '../../../components/workspace/WorkspaceSidebar.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import { sequenceAdaptation, setSequenceLanguages } from '../../../stores/sequence-adaptation';
  import {
    channelDictionaries,
    commandDictionaries,
    getParsedChannelDictionary,
    getParsedCommandDictionary,
    getParsedParameterDictionary,
    parameterDictionaries as parameterDictionariesStore,
    parcelToParameterDictionaries,
    userSequenceEditorColumns,
    userSequenceEditorColumnsWithFormBuilder,
  } from '../../../stores/sequencing';
  import { initialUsersLoading, users } from '../../../stores/user';
  import { parcel, parcels, workspace, workspaceColumns, workspaceId, workspaces } from '../../../stores/workspaces';
  import type { ActionDefinition } from '../../../types/actions';
  import type { ArgumentsMap } from '../../../types/parameter';
  import type {
    ChannelDictionaryMetadata,
    CommandDictionaryMetadata,
    ParameterDictionaryMetadata,
  } from '../../../types/sequencing';
  import type {
    ActionParameterPair,
    Workspace,
    WorkspaceCollaborator,
    WorkspaceMetadata,
    WorkspaceNodeEvent,
    WorkspaceNodeRunActionEvent,
  } from '../../../types/workspace';
  import type {
    WorkspaceTreeMap,
    WorkspaceTreeNode,
    WorkspaceTreeNodeWithFullPath,
  } from '../../../types/workspace-tree-view';
  import { openActionRun } from '../../../utilities/actions';
  import { setClipboardContent } from '../../../utilities/clipboard';
  import effects from '../../../utilities/effects';
  import { filterEmpty } from '../../../utilities/generic';
  import { showConfirmModal } from '../../../utilities/modal';
  import { featurePermissions } from '../../../utilities/permissions';
  import { getActionsUrl, getWorkspacesUrl } from '../../../utilities/routes';
  import * as adaptationUtils from '../../../utilities/sequence-editor/adaptation-utils';
  import { pluralize } from '../../../utilities/text';
  import { showFailureToast } from '../../../utilities/toast';
  import {
    flattenWorkspaceTreeWithPaths,
    getAvailableActionsForNodes,
    mapWorkspaceTreePaths,
    separateFilenameFromPath,
  } from '../../../utilities/workspaces';
  import type { PageData } from './$types';
  // codemirror dependencies to be injected into the adaptation

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let availableActionsForActiveFile: ActionParameterPair[] = [];
  let activeFilePath: string | null = null;
  let allActionsForWorkspace: ActionDefinition[] = [];
  let channelDictionary: ChannelDictionary | null = null;
  let commandDictionary: CommandDictionary | null = null;
  let parameterDictionaries: ParameterDictionary[] = [];
  let initialSelectedFileContent: string = '';
  let isWorkspaceLoading: boolean = false;
  let refreshInterval: NodeJS.Timeout | null = null;
  let selectedFileType: WorkspaceContentType | null = null;
  let selectedFilePath: string | null = null;
  let selectedFileName: string | undefined = undefined;
  let selectedSequenceOutput: string | undefined = undefined;
  let updatedSelectedFileContent: string = '';
  let librarySequences: LibrarySequenceSignature[] = [];
  let workspaceSequences: UserSequence[] = [];
  let workspaceTree: WorkspaceTreeNode | null = null;
  let workspaceTreeMap: WorkspaceTreeMap = {};
  let workspaceFileList: WorkspaceTreeNodeWithFullPath[] = [];
  let hasEditFilePermission: boolean = false;
  let hasEditWorkspacePermission: boolean = false;
  let hasEditWorkspaceCollaboratorsPermission: boolean = false;
  let phoenixContext: PhoenixContext;

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;
    allActionsForWorkspace = Object.values($actionDefinitionsByWorkspace[$workspaceId] || {});
  }

  // TODO check with Dan about why this was potentially moved from a reactive statement to the maybeNavigate function
  $: if (workspaceTreeMap && typeof activeFilePath === 'string') {
    availableActionsForActiveFile = getAvailableActionsForNodes(allActionsForWorkspace, [
      workspaceTreeMap[activeFilePath],
    ]);
  }

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // Check source variables directly since reactive $: statements don't update in closures
    if (updatedSelectedFileContent !== initialSelectedFileContent && activeFilePath !== null) {
      event.preventDefault(); // Triggers the native browser confirmation
      event.returnValue = ''; // Required for some older browser compatibility
    }
  };

  // Prevent in-app navigation to other routes when there are unsaved changes
  beforeNavigate(({ cancel, to }) => {
    const hasUnsavedChanges = updatedSelectedFileContent !== initialSelectedFileContent && activeFilePath !== null;
    if (!hasUnsavedChanges) {
      return;
    }
    // Allow navigation within the same workspace page (file selection is handled by goToSequence)
    if (to?.route.id === $page.route.id) {
      return;
    }
    // Cancel navigation first, then show async modal and navigate if confirmed
    cancel();
    showConfirmModal(
      'Leave Page',
      'There are unsaved changes. Are you sure you want to leave this page?',
      'Leave Page',
      true,
      'Stay on Page',
    ).then(({ confirm }) => {
      if (confirm && to?.url) {
        // Reset content to allow navigation without re-triggering the modal
        initialSelectedFileContent = updatedSelectedFileContent;
        goto(to.url);
      }
    });
  });

  onMount(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  $: if (!isWorkspaceLoading && selectedFilePath !== activeFilePath) {
    // the UI's selected file doesn't match our actively loaded file, try to navigate to selected
    maybeNavigate(selectedFilePath);
  }

  async function maybeNavigate(nextPath: string | null) {
    const didNavigate = await goToSequence(nextPath);
    if (!didNavigate) {
      // user decided not to navigate away due to unsaved changes, set selected UI back to active file
      selectedFilePath = activeFilePath;
      return;
    }
    // successfully navigated, update activeFilePath & get the file contents
    activeFilePath = nextPath;
    if (activeFilePath && workspaceTreeMap[activeFilePath]) {
      const { filename } = separateFilenameFromPath(activeFilePath);
      if (filename) {
        selectedFileName = filename;
        selectedFileType = workspaceTreeMap[activeFilePath]?.type ?? null;
      } else {
        selectedFileName = undefined;
        selectedFileType = null;
      }
      await getSelectedFileContent(activeFilePath);
    } else {
      // navigated to a null/empty file, reset the editor contents
      initialSelectedFileContent = '';
      updatedSelectedFileContent = initialSelectedFileContent;
      selectedFileName = undefined;
      selectedFileType = null;

      if (activeFilePath && !workspaceTreeMap[activeFilePath]) {
        showFailureToast('The selected file does not exist in the workspace.');
      }
    }
  }

  $: if (initialWorkspace || $workspace) {
    const ws: Workspace = $workspace ?? (initialWorkspace as Workspace);

    hasEditWorkspacePermission = featurePermissions.workspace.canUpdate(user, ws);
    hasEditWorkspaceCollaboratorsPermission = featurePermissions.workspaceCollaborators.canCreate(user, ws);
    if (activeFilePath && workspaceTreeMap[activeFilePath]) {
      hasEditFilePermission = featurePermissions.workspace.canUpdate(user, ws, workspaceTreeMap[activeFilePath]);
      availableActionsForActiveFile = getAvailableActionsForNodes(allActionsForWorkspace, [
        workspaceTreeMap[activeFilePath],
      ]);
    } else {
      hasEditFilePermission = featurePermissions.workspace.canUpdate(user, ws);
      availableActionsForActiveFile = [];
    }
  }

  $: if ($parcel) {
    loadSequenceAdaptation($parcel.sequence_adaptation_id);

    const unparsedChannelDictionary = $channelDictionaries.find(
      channelDictionaryMetadata => channelDictionaryMetadata.id === $parcel.channel_dictionary_id,
    );
    const unparsedCommandDictionary = $commandDictionaries.find(
      commandDictionaryMetadata => commandDictionaryMetadata.id === $parcel.command_dictionary_id,
    );
    const unparsedParameterDictionaries = $parameterDictionariesStore.filter(parameterDictionaryMetadata => {
      const parameterDictionary = $parcelToParameterDictionaries.find(
        parcelToParameterDictionary =>
          parcelToParameterDictionary.parameter_dictionary_id === parameterDictionaryMetadata.id &&
          parcelToParameterDictionary.parcel_id === $parcel.id,
      );

      return parameterDictionary != null;
    });

    if (unparsedCommandDictionary) {
      loadCommandDictionary(unparsedCommandDictionary);
    } else {
      commandDictionary = null;
    }
    if (unparsedChannelDictionary) {
      loadChannelDictionary(unparsedChannelDictionary);
    } else {
      channelDictionary = null;
    }
    if (unparsedParameterDictionaries.length > 0) {
      loadParameterDictionaries(unparsedParameterDictionaries);
    } else {
      parameterDictionaries = [];
    }
  }

  $: phoenixContext = {
    channelDictionary,
    commandDictionary,
    librarySequences,
    parameterDictionaries,
  };

  $: {
    if (!commandDictionary) {
      commandDictionary = null;
      channelDictionary = null;
      parameterDictionaries = [];
    }
  }

  function resetRefreshInterval() {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(refreshWorkspaceContents, 300000);
  }

  async function getWorkspaceContents(workspace: Workspace | null) {
    if (workspace) {
      isWorkspaceLoading = true;
      const workspaceContents = await effects.getWorkspaceContents(workspace.id, user);
      if (workspaceContents) {
        workspaceTree = {
          contents: workspaceContents,
          name: workspace.name,
          type: WorkspaceContentType.Workspace,
        };
      }
      workspaceTreeMap = mapWorkspaceTreePaths(workspaceTree?.contents ?? []);
      workspaceFileList = flattenWorkspaceTreeWithPaths(workspaceContents ?? []);

      const librarySequencesEnabled = env.PUBLIC_LIBRARY_SEQUENCES_ENABLED === 'true';
      workspaceSequences = await effects.getWorkspaceSequences(
        workspace.id,
        workspaceTreeMap,
        librarySequencesEnabled,
        user,
      );

      if (librarySequencesEnabled) {
        librarySequences = workspaceSequences
          .flatMap(sequence => ($sequenceAdaptation.input.getLibrarySequences ?? (() => []))(sequence))
          .filter(({ name }) => name !== '');
      }

      isWorkspaceLoading = false;
      resetRefreshInterval();
    }
  }

  function refreshWorkspaceContents() {
    getWorkspaceContents(initialWorkspace);
  }

  function isTextFile(fileType: WorkspaceContentType) {
    return (
      fileType === WorkspaceContentType.Sequence ||
      fileType === WorkspaceContentType.Json ||
      fileType === WorkspaceContentType.Text ||
      fileType === WorkspaceContentType.Metadata ||
      fileType === WorkspaceContentType.Unknown
    );
  }

  async function getSelectedFileContent(filePath: string | null) {
    initialSelectedFileContent = '';
    updatedSelectedFileContent = initialSelectedFileContent;
    let content = '';

    if (filePath !== null && user) {
      const node = workspaceTreeMap[filePath];
      if (node?.type !== WorkspaceContentType.Directory) {
        content = (await effects.getWorkspaceFileContent($workspaceId, filePath, user)) ?? '';
      }
    }

    // Check for stale response: if user navigated to a different file while we were
    // fetching, discard this result to avoid overwriting newer content
    if (filePath !== activeFilePath) {
      return;
    }

    initialSelectedFileContent = content;
    updatedSelectedFileContent = initialSelectedFileContent;
  }

  async function loadSequenceAdaptation(id: number | null | undefined) {
    // load a user sequencing adaptation from the DB, and execute it in the page's JS context.
    // adaptation is a user-provided JS module w/ functions that hook into editor functionality to provide linting, etc.

    if (!id) {
      // not passing an ID means we want to intentionally reset to the default adaptation
      resetSequenceAdaptation();
      return;
    }

    try {
      const adaptation = await adaptationUtils.loadSequenceAdaptation(id, user);
      setSequenceLanguages(adaptation);
    } catch (e) {
      console.error(e);
      showFailureToast('Invalid sequence adaptation');
    }
  }

  async function loadCommandDictionary(unparsedCommandDictionary: CommandDictionaryMetadata) {
    const parsedDictionary = await getParsedCommandDictionary(unparsedCommandDictionary, user);
    if (parsedDictionary) {
      commandDictionary = parsedDictionary;
    } else {
      commandDictionary = null;
    }
  }

  async function loadChannelDictionary(unparsedChannelDictionary?: ChannelDictionaryMetadata) {
    if (unparsedChannelDictionary) {
      const parsedDictionary = await getParsedChannelDictionary(unparsedChannelDictionary, user);
      if (parsedDictionary) {
        channelDictionary = parsedDictionary;
      }
    } else {
      channelDictionary = null;
    }
  }

  async function loadParameterDictionaries(unparsedParameterDictionaries: ParameterDictionaryMetadata[] = []) {
    parameterDictionaries = (
      await Promise.all(
        unparsedParameterDictionaries.map(unparsedParameterDictionary => {
          return getParsedParameterDictionary(unparsedParameterDictionary, user);
        }),
      )
    ).filter(filterEmpty);
  }

  function resetSequenceAdaptation(): void {
    setSequenceLanguages(undefined);
  }

  async function goToSequence(filePath: string | null) {
    if (updatedSelectedFileContent !== initialSelectedFileContent && activeFilePath !== null) {
      const { confirm } = await showConfirmModal(
        'Navigate Away',
        `There are unsaved changes. Are you sure you want navigate away from the current sequence?`,
        'Navigate to Sequence',
        true,
        'Keep Editing',
      );

      if (!confirm) {
        return false;
      }
    }
    goto(getWorkspacesUrl(base, $workspaceId, filePath));

    return true;
  }

  async function onAddCollaborator(event: CustomEvent<WorkspaceCollaborator[]>) {
    if ($workspace) {
      effects.createWorkspaceCollaborators($workspace, event.detail, user);
    }
  }

  async function onDeleteCollaborator(event: CustomEvent<string>) {
    if ($workspace) {
      effects.deleteWorkspaceCollaborator($workspace, event.detail, user);
    }
  }

  async function onUpdateWorkspaceMetadata(event: CustomEvent<Partial<WorkspaceMetadata>>) {
    if ($workspace) {
      effects.updateWorkspace($workspace, event.detail, user);
    }
  }

  async function onNewFolder(event: CustomEvent<string>) {
    if ($workspace && workspaceTree && user) {
      const { detail: startingPath } = event;
      const newFolderPath = await effects.newWorkspaceFolder($workspace, workspaceTree, startingPath, user);
      if (newFolderPath !== null) {
        refreshWorkspaceContents();
      }
    }
  }

  async function onNewSequence(event: CustomEvent<string>) {
    if ($workspace != null && workspaceTree && user) {
      const { detail: startingPath } = event;
      const newSequencePath = await effects.newWorkspaceSequence($workspace, workspaceTree, startingPath, '', user);

      if (newSequencePath !== null) {
        // select & navigate to the new file
        selectedFilePath = newSequencePath;
        refreshWorkspaceContents();
      }
    }
  }

  async function onImportFile(event: CustomEvent<string>) {
    if ($workspace != null && workspaceTree && user) {
      const { detail: startingPath } = event;
      const targetPath = await effects.importWorkspaceFile(
        $workspace,
        workspaceTree,
        startingPath,
        $sequenceAdaptation,
        phoenixContext,
        user,
      );
      refreshWorkspaceContents();

      if (targetPath) {
        selectedFilePath = targetPath;
        refreshWorkspaceContents();
      }
    }
  }

  async function onNodeDelete({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace) {
      let shouldUpdateSelectedSequencePath = treeNodePath === activeFilePath;

      await effects.deleteWorkspaceItem($workspace, treeNode, treeNodePath, user);
      refreshWorkspaceContents();

      if (shouldUpdateSelectedSequencePath) {
        selectedFilePath = null;
      }
    }
  }

  async function onNodeMove({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace && workspaceTree) {
      let shouldUpdateSelectedSequencePath = treeNodePath === activeFilePath;

      const targetPath = await effects.moveWorkspaceItem($workspace, workspaceTree, treeNode, treeNodePath, user);
      refreshWorkspaceContents();

      if (shouldUpdateSelectedSequencePath) {
        // try to select & navigate to moved file
        selectedFilePath = targetPath;
      }
    }
  }

  async function onNodeRename({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace) {
      let shouldUpdateSelectedSequencePath = treeNodePath === activeFilePath;

      const targetPath = await effects.renameWorkspaceItem($workspace, treeNode, treeNodePath, user);
      refreshWorkspaceContents();

      if (shouldUpdateSelectedSequencePath) {
        // select newly renamed file
        selectedFilePath = targetPath;
      }
    }
  }

  function onWorkspaceFileUpdated({
    detail: { filePath, input, output },
  }: CustomEvent<{ filePath: string; input: string; output?: string }>) {
    // Ignore stale events from a file that is no longer active
    if (filePath !== activeFilePath) {
      return;
    }

    updatedSelectedFileContent = input;
    if (output) {
      selectedSequenceOutput = output;
    }
  }

  async function onSaveWorkspaceFile(event: CustomEvent<string>) {
    const { detail: updatedSequenceDefinition } = event;
    if (activeFilePath) {
      effects.saveWorkspaceFile($workspaceId, activeFilePath, updatedSequenceDefinition, user);
      initialSelectedFileContent = updatedSequenceDefinition;
    } else if ($workspace && workspaceTree) {
      const newSequencePath = await effects.newWorkspaceSequence(
        $workspace,
        workspaceTree,
        '',
        updatedSequenceDefinition,
        user,
      );

      selectedFilePath = newSequencePath;
      refreshWorkspaceContents();
    }
  }

  function onCopyFileLocation({ detail: copyPath }: CustomEvent<string>) {
    const WORKSPACE_URL = browser ? env.PUBLIC_WORKSPACE_CLIENT_URL : env.PUBLIC_WORKSPACE_SERVER_URL;
    setClipboardContent(`${WORKSPACE_URL}/ws/${$workspaceId}/${copyPath}`);
  }

  function onCopyFullPath({ detail: copyPath }: CustomEvent<string>) {
    setClipboardContent(copyPath);
  }

  async function onMoveToWorkspace({ detail: sourcePath }: CustomEvent<string>) {
    if (initialWorkspace) {
      await effects.moveWorkspaceItemToWorkspace(initialWorkspace, workspaceTreeMap[sourcePath], sourcePath, user);
      refreshWorkspaceContents();
    }
  }

  function onActionsClicked() {
    window.open(getActionsUrl(base, $workspaceId), '_blank');
  }

  async function onRunActionOnActiveFile(event: CustomEvent<{ action: ActionDefinition; parameter: string }>) {
    const {
      detail: { action, parameter: primaryParameter },
    } = event;

    let parameters: ArgumentsMap = {};
    // the event will tell us which of the action's parameter is the primary, to be pre-filled with the file's path
    if (primaryParameter in action.parameter_schema) {
      const paramDefinition = action.parameter_schema[primaryParameter];
      const paramValue =
        paramDefinition.type === 'fileList' || paramDefinition.type === 'sequenceList'
          ? [activeFilePath]
          : activeFilePath;
      parameters[primaryParameter] = paramValue;
    } else {
      // no primary parameter - show modal anyway, just don't pre-fill parameter
      console.warn(`Invalid parameter ${primaryParameter} in onRunActionOnActiveFile`);
    }

    if ($workspace) {
      const actionRunId = await effects.runAction(action, $workspace, workspaceFileList, user, parameters);
      if (actionRunId !== null) {
        const goToRun = await effects.confirmOpenActionRunResults(actionRunId);
        if (goToRun === true) {
          openActionRun($workspaceId, actionRunId, true);
        }
      }
    }
  }

  async function onRunActionOnFileSelection(event: CustomEvent<WorkspaceNodeRunActionEvent>) {
    const {
      detail: { actionParameterPair, treeNodes },
    } = event;

    const treeNodePaths: string[] = treeNodes.map(({ fullPath }) => fullPath);
    const { action, parameter: primaryParameter } = actionParameterPair;

    let parameters: ArgumentsMap = {};
    // the event will tell us which of the action's parameter is the primary, to be pre-filled with the file's path
    if (primaryParameter in action.parameter_schema) {
      const paramDefinition = action.parameter_schema[primaryParameter];
      const paramValue =
        paramDefinition.type === 'fileList' || paramDefinition.type === 'sequenceList'
          ? treeNodePaths
          : treeNodePaths[0];
      parameters[primaryParameter] = paramValue;
    } else {
      // no primary parameter - show modal anyway, just don't pre-fill parameter
      console.warn(`Invalid parameter ${primaryParameter} in onRunActionOnActiveFile`);
    }

    if ($workspace) {
      const actionRunId = await effects.runAction(action, $workspace, workspaceFileList, user, parameters);
      if (actionRunId !== null) {
        const goToRun = await effects.confirmOpenActionRunResults(actionRunId);
        if (goToRun === true) {
          openActionRun($workspaceId, actionRunId, true);
        }
      }
    }
  }

  function onOpenInNewTab({ detail: treeNodePath }: CustomEvent<string>) {
    window.open(`${base}/workspaces/${$workspaceId}?sequenceId=${encodeURIComponent(treeNodePath)}`, '_blank');
  }

  onMount(() => {
    if (initialWorkspace) {
      $workspaceId = initialWorkspace.id;
      selectedFilePath = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
      getWorkspaceContents(initialWorkspace);
      resetRefreshInterval();
    }
  });

  onDestroy(() => {
    resetSequenceAdaptation();

    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
    }
  });
</script>

<PageTitle title="Workspace: {$workspace?.name}" />

<CssGrid bind:columns={$workspaceColumns}>
  <Sidebar.Provider style="--sidebar-width: auto" className="min-h-0">
    <WorkspaceSidebar
      bind:selectedFilePath
      actions={allActionsForWorkspace}
      {workspaceTree}
      {isWorkspaceLoading}
      {hasEditWorkspacePermission}
      {hasEditWorkspaceCollaboratorsPermission}
      parcels={$parcels ?? []}
      {user}
      users={$users ?? []}
      usersLoading={$initialUsersLoading}
      workspace={$workspace}
      workspaces={$workspaces}
      on:actionsClick={onActionsClicked}
      on:addCollaborator={onAddCollaborator}
      on:deleteCollaborator={onDeleteCollaborator}
      on:nodeDelete={onNodeDelete}
      on:nodeMove={onNodeMove}
      on:nodeRename={onNodeRename}
      on:newFolder={onNewFolder}
      on:newSequence={onNewSequence}
      on:importFile={onImportFile}
      on:copyFileLocation={onCopyFileLocation}
      on:copyFullPath={onCopyFullPath}
      on:moveToWorkspace={onMoveToWorkspace}
      on:refreshWorkspace={refreshWorkspaceContents}
      on:updateWorkspaceMetadata={onUpdateWorkspaceMetadata}
      on:runAction={onRunActionOnFileSelection}
      on:openInNewTab={onOpenInNewTab}
    />
  </Sidebar.Provider>
  <CssGridGutter track={1} type="column" />
  <Sidebar.Inset className="min-h-0">
    <div class="grid h-full grid-cols-1 grid-rows-1">
      {#if activeFilePath === null || isTextFile(workspaceTreeMap[activeFilePath]?.type)}
        {@const isSequenceFile = selectedFileType !== null && selectedFileType === WorkspaceContentType.Sequence}
        <div class="flex h-full" class:hidden={!isSequenceFile}>
          <SequenceEditor
            {phoenixContext}
            availableActions={availableActionsForActiveFile}
            includeActions
            previewOnly={!hasEditFilePermission}
            sequenceAdaptation={$sequenceAdaptation}
            sequenceDefinition={isSequenceFile ? initialSelectedFileContent : ''}
            sequenceName={selectedFileName}
            sequenceFilePath={selectedFilePath ?? ''}
            sequenceOutput={selectedSequenceOutput}
            showCommandFormBuilder
            userSequenceEditorColumns={$userSequenceEditorColumns}
            userSequenceEditorColumnsWithFormBuilder={$userSequenceEditorColumnsWithFormBuilder}
            on:runAction={onRunActionOnActiveFile}
            on:save={onSaveWorkspaceFile}
            on:sequence={isSequenceFile ? onWorkspaceFileUpdated : undefined}
          />
        </div>
        <div class="flex h-full" class:hidden={isSequenceFile}>
          <TextEditor
            availableActions={availableActionsForActiveFile}
            includeActions={true}
            isJSON={selectedFileType === WorkspaceContentType.Json}
            previewOnly={!hasEditFilePermission}
            textFileName={selectedFileName}
            textFilePath={selectedFilePath ?? ''}
            textFileContent={!isSequenceFile ? initialSelectedFileContent : ''}
            on:runAction={onRunActionOnActiveFile}
            on:save={onSaveWorkspaceFile}
            on:textContentUpdated={!isSequenceFile ? onWorkspaceFileUpdated : undefined}
          />
        </div>
      {:else if selectedFileType === WorkspaceContentType.Directory}
        {@const folderNode = workspaceTreeMap[activeFilePath]}
        {@const folderFiles =
          (folderNode?.contents || []).filter(node => node.type !== WorkspaceContentType.Directory) ?? []}
        {@const folderSubfolders =
          (folderNode?.contents || []).filter(node => node.type === WorkspaceContentType.Directory) ?? []}
        <div class="flex w-full flex-col items-center justify-center gap-8 pt-6">
          <Folder size={70} class="text-muted-foreground" />
          <p class="st-typography-body max-w-prose text-center text-sm text-muted-foreground">
            The selected folder
            <code class="font-bold">
              {activeFilePath}
            </code>
            {#if folderFiles.length === 0 && folderSubfolders.length === 0}
              is empty.
            {:else}
              contains{folderFiles.length ? ` ${folderFiles.length} file${pluralize(folderFiles.length)}` : ''}
              {`${folderFiles.length && folderSubfolders.length ? ' and' : ''}`}
              {folderSubfolders.length
                ? ` ${folderSubfolders.length} subfolder${pluralize(folderSubfolders.length)}`
                : ''}.
            {/if}
          </p>
        </div>
      {:else}
        <div class="flex w-full flex-col items-center justify-center gap-8 pt-6">
          <TriangleAlert size={70} class="text-muted-foreground" />
          <p class="st-typography-body max-w-prose text-center text-sm text-muted-foreground">
            The selected file
            <code class="font-bold">
              {activeFilePath}
            </code>
            is not displayed in the editor because is either binary or an unsupported extension.
          </p>
        </div>
      {/if}
    </div>
  </Sidebar.Inset>
</CssGrid>

<style>
</style>
