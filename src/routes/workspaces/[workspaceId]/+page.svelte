<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { env } from '$env/dynamic/public';
  import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import type { IRowNode } from 'ag-grid-community';
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
  import {
    adaptationGlobals,
    inputFormat,
    outputFormat,
    sequenceAdaptation,
    setSequenceAdaptation,
  } from '../../../stores/sequence-adaptation';
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
  import { parcel, workspace, workspaceColumns, workspaceId } from '../../../stores/workspaces';
  import type { ActionDefinition } from '../../../types/actions';
  import type { ArgumentsMap } from '../../../types/parameter';
  import type {
    ChannelDictionaryMetadata,
    CommandDictionaryMetadata,
    LibrarySequence,
    ParameterDictionaryMetadata,
    UserSequence,
  } from '../../../types/sequencing';
  import type { Workspace, WorkspaceNodeEvent } from '../../../types/workspace';
  import type {
    WorkspaceTreeMap,
    WorkspaceTreeNode,
    WorkspaceTreeNodeWithFullPath,
  } from '../../../types/workspace-tree-view';
  import { getActionParametersOfType, openActionRun } from '../../../utilities/actions';
  import { setClipboardContent } from '../../../utilities/clipboard';
  import effects from '../../../utilities/effects';
  import { filterEmpty } from '../../../utilities/generic';
  import { showConfirmModal } from '../../../utilities/modal';
  import { featurePermissions } from '../../../utilities/permissions';
  import { getActionsUrl, getWorkspacesUrl } from '../../../utilities/routes';
  import { userSequenceToLibrarySequence } from '../../../utilities/sequence-editor/languages/seq-n/seq-n-tree-utils';
  import { parseFunctionSignatures } from '../../../utilities/sequence-editor/languages/vml/vml-adaptation';
  import { isVmlSequence } from '../../../utilities/sequence-editor/sequence-utils';
  import { showFailureToast } from '../../../utilities/toast';
  import { mapWorkspaceTreePaths, separateFilenameFromPath } from '../../../utilities/workspaces';
  import type { PageData } from './$types';

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let actionsWithSequenceParameters: ActionDefinition[] = [];
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
  let workspaceLibrarySequences: LibrarySequence[] = [];
  let workspaceSequences: UserSequence[] = [];
  let workspaceTree: WorkspaceTreeNode | null = null;
  let workspaceTreeMap: WorkspaceTreeMap = {};
  let hasEditFilePermission: boolean = false;
  let hasEditWorkspacePermission: boolean = false;

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;

    actionsWithSequenceParameters = Object.values($actionDefinitionsByWorkspace[$workspaceId] || {}).filter(action => {
      const seqParameter = getActionParametersOfType(action, 'sequence');
      return seqParameter.length > 0;
    });
  }
  $: if (selectedFilePath) {
    const { filename } = separateFilenameFromPath(selectedFilePath);
    getSelectedFileContent(selectedFilePath);

    if (filename) {
      selectedFileName = filename;
      selectedFileType = workspaceTreeMap[selectedFilePath]?.type ?? null;
    } else {
      selectedFileName = undefined;
      selectedFileType = null;
    }
  } else {
    selectedFileName = undefined;
    selectedFileType = null;
  }

  $: if (initialWorkspace) {
    hasEditWorkspacePermission = featurePermissions.workspace.canUpdate(user, initialWorkspace);
    if (selectedFilePath) {
      hasEditFilePermission = featurePermissions.workspace.canUpdate(
        user,
        initialWorkspace,
        workspaceTreeMap[selectedFilePath],
      );
    } else {
      hasEditFilePermission = true;
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

      const librarySequencesEnabled = env.PUBLIC_LIBRARY_SEQUENCES_ENABLED === 'true';
      workspaceSequences = await effects.getWorkspaceSequences(
        workspace.id,
        workspaceTreeMap,
        librarySequencesEnabled,
        user,
      );

      if (librarySequencesEnabled) {
        workspaceLibrarySequences = workspaceSequences
          .flatMap(sequence => {
            if (isVmlSequence(sequence.name)) {
              return parseFunctionSignatures(sequence.definition, $workspaceId);
            } else {
              return userSequenceToLibrarySequence(sequence, $workspaceId);
            }
          })
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

  function isRowSelectable(node: Pick<IRowNode<WorkspaceTreeNodeWithFullPath>, 'data'>): boolean {
    return isTextFile(node.data?.type ?? WorkspaceContentType.Unknown);
  }

  async function getSelectedFileContent(filePath: string | null) {
    if (filePath !== null && user) {
      initialSelectedFileContent = (await effects.getWorkspaceFileContent($workspaceId, filePath, user)) ?? '';
    } else {
      initialSelectedFileContent = '';
    }
    updatedSelectedFileContent = initialSelectedFileContent;
  }

  async function loadSequenceAdaptation(id: number | null | undefined) {
    if (id) {
      const adaptation = await effects.getSequenceAdaptation(id, user);

      if (adaptation) {
        try {
          setSequenceAdaptation(eval(String(adaptation.adaptation)));
        } catch (e) {
          console.error(e);
          showFailureToast('Invalid sequence adaptation');
        }
      }
    } else {
      resetSequenceAdaptation();
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
    setSequenceAdaptation(undefined);
  }

  async function goToSequence(filePath: string | null) {
    if (updatedSelectedFileContent !== initialSelectedFileContent && selectedFilePath !== null) {
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
        const didNavigate = await goToSequence(newSequencePath);
        if (didNavigate) {
          selectedFilePath = newSequencePath;
        }
        refreshWorkspaceContents();
      }
    }
  }

  async function onImportFile(event: CustomEvent<string>) {
    if ($workspace != null && workspaceTree && user) {
      const { detail: startingPath } = event;
      const targetPath = await effects.importWorkspaceFile($workspace, workspaceTree, startingPath, user);
      refreshWorkspaceContents();

      if (targetPath) {
        const didNavigate = await goToSequence(targetPath);
        if (didNavigate) {
          selectedFilePath = targetPath;
        }
      }
    }
  }

  async function onNodeClicked({ detail: { toggleState, treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if (isTextFile(treeNode.type) && toggleState === true) {
      if (treeNodePath !== selectedFilePath) {
        const didNavigate = await goToSequence(treeNodePath);
        if (didNavigate) {
          selectedFilePath = treeNodePath;
        }
      }
    }
  }

  async function onNodeDelete({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace) {
      let shouldUpdateSelectedSequencePath = treeNodePath === selectedFilePath;

      await effects.deleteWorkspaceItem($workspace, treeNode, treeNodePath, user);
      refreshWorkspaceContents();

      if (shouldUpdateSelectedSequencePath) {
        selectedFilePath = null;
        goToSequence(selectedFilePath);
      }
    }
  }

  async function onNodeMove({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace && workspaceTree) {
      let shouldUpdateSelectedSequencePath = treeNodePath === selectedFilePath;

      const targetPath = await effects.moveWorkspaceItem($workspace, workspaceTree, treeNode, treeNodePath, user);
      refreshWorkspaceContents();

      if (shouldUpdateSelectedSequencePath) {
        const didNavigate = await goToSequence(targetPath);
        if (didNavigate) {
          selectedFilePath = targetPath;
        }
      }
    }
  }

  async function onNodeRename({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace) {
      let shouldUpdateSelectedSequencePath = treeNodePath === selectedFilePath;

      const targetPath = await effects.renameWorkspaceItem($workspace, treeNode, treeNodePath, user);
      refreshWorkspaceContents();

      if (shouldUpdateSelectedSequencePath) {
        const didNavigate = await goToSequence(targetPath);
        if (didNavigate) {
          selectedFilePath = targetPath;
        }
      }
    }
  }

  function onWorkspaceFileUpdated({ detail: { input, output } }: CustomEvent<{ input: string; output?: string }>) {
    updatedSelectedFileContent = input;
    if (output) {
      selectedSequenceOutput = output;
    }
  }

  async function onSaveWorkspaceFile(event: CustomEvent<string>) {
    const { detail: updatedSequenceDefinition } = event;
    if (selectedFilePath) {
      effects.saveWorkspaceFile($workspaceId, selectedFilePath, updatedSequenceDefinition, user);
      initialSelectedFileContent = updatedSequenceDefinition;
    } else if ($workspace && workspaceTree) {
      const newSequencePath = await effects.newWorkspaceSequence(
        $workspace,
        workspaceTree,
        '',
        updatedSequenceDefinition,
        user,
      );

      const didNavigate = await goToSequence(newSequencePath);
      if (didNavigate) {
        selectedFilePath = newSequencePath;
      }
      refreshWorkspaceContents();
    }
  }

  function onCopyFileLocation({ detail: copyPath }: CustomEvent<string>) {
    const WORKSPACE_URL = browser ? env.PUBLIC_WORKSPACE_CLIENT_URL : env.PUBLIC_WORKSPACE_SERVER_URL;
    setClipboardContent(`${WORKSPACE_URL}/ws/${$workspaceId}/${copyPath}`);
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

  async function onRunActionOnSequence(event: CustomEvent<ActionDefinition>) {
    const { detail: action } = event;
    //get parameters of type sequence...
    const sequenceParameters = getActionParametersOfType(action, 'sequence');
    //set this sequence to the first one... FOR NOW.  TODO how do we determine the primary one?
    let parameters: ArgumentsMap = {};
    if (sequenceParameters.length > 0) {
      const primarySequenceParameter = sequenceParameters[0];
      parameters[primarySequenceParameter] = selectedFilePath;
    }

    const actionRunId = await effects.runAction(action, workspaceSequences, user, parameters);
    if (actionRunId !== null) {
      const goToRun = await effects.confirmOpenActionRunResults(actionRunId);
      if (goToRun === true) {
        openActionRun($workspaceId, actionRunId, true);
      }
    }
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
  });
</script>

<PageTitle title="Workspace: {$workspace?.name}" />

<CssGrid bind:columns={$workspaceColumns}>
  <Sidebar.Provider style="--sidebar-width: auto" className="min-h-0">
    <WorkspaceSidebar
      {selectedFilePath}
      {workspaceTree}
      {isWorkspaceLoading}
      {hasEditWorkspacePermission}
      {user}
      workspace={$workspace}
      {isRowSelectable}
      on:actionsClick={onActionsClicked}
      on:nodeClicked={onNodeClicked}
      on:nodeDelete={onNodeDelete}
      on:nodeMove={onNodeMove}
      on:nodeRename={onNodeRename}
      on:newFolder={onNewFolder}
      on:newSequence={onNewSequence}
      on:importFile={onImportFile}
      on:copyFileLocation={onCopyFileLocation}
      on:moveToWorkspace={onMoveToWorkspace}
      on:refreshWorkspace={refreshWorkspaceContents}
    />
  </Sidebar.Provider>
  <CssGridGutter track={1} type="column" />
  <Sidebar.Inset className="min-h-0">
    <div class="grid h-full grid-cols-1 grid-rows-1">
      <div
        class="flex h-full"
        class:hidden={selectedFileType != null && selectedFileType !== WorkspaceContentType.Sequence}
      >
        <SequenceEditor
          {channelDictionary}
          {commandDictionary}
          {parameterDictionaries}
          {actionsWithSequenceParameters}
          adaptationGlobals={$adaptationGlobals}
          includeActions={true}
          inputFormat={$inputFormat}
          librarySequences={workspaceLibrarySequences}
          outputFormats={$outputFormat}
          readOnly={!hasEditFilePermission}
          sequenceAdaptation={$sequenceAdaptation}
          sequenceDefinition={initialSelectedFileContent}
          sequenceName={selectedFileName}
          sequenceOutput={selectedSequenceOutput}
          showCommandFormBuilder={true}
          title="Sequence - Definition Editor"
          userSequenceEditorColumns={$userSequenceEditorColumns}
          userSequenceEditorColumnsWithFormBuilder={$userSequenceEditorColumnsWithFormBuilder}
          on:runAction={onRunActionOnSequence}
          on:save={onSaveWorkspaceFile}
          on:sequence={onWorkspaceFileUpdated}
        />
      </div>
      <div
        class="flex h-full"
        class:hidden={selectedFileType == null || selectedFileType === WorkspaceContentType.Sequence}
      >
        <TextEditor
          isJSON={selectedFileType === WorkspaceContentType.Json}
          readOnly={!hasEditFilePermission}
          textFileName={selectedFileName}
          textFileContent={initialSelectedFileContent}
          title={selectedFileType === WorkspaceContentType.Json ? 'JSON Editor' : 'Text Editor'}
          on:save={onSaveWorkspaceFile}
          on:textContentUpdated={onWorkspaceFileUpdated}
        />
      </div>
    </div>
  </Sidebar.Inset>
</CssGrid>

<style>
</style>
