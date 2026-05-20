<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { beforeNavigate, goto, replaceState } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { env } from '$env/dynamic/public';
  import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import type {
    LibrarySequenceSignature,
    OutputLanguage,
    PhoenixContext,
    UserSequence,
  } from '@nasa-jpl/aerie-sequence-languages';
  import { Button, Checkbox, Resizable, Select } from '@nasa-jpl/stellar-svelte';
  import type { EditorView } from 'codemirror';
  import { capitalize, startCase } from 'lodash-es';
  import { Folder, ListX, LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import type { PaneAPI } from 'paneforge';
  import { getContext, onDestroy, onMount, tick } from 'svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Console from '../../../components/console/Console.svelte';
  import ConsoleTab from '../../../components/console/ConsoleTab.svelte';
  import ConsoleLogs from '../../../components/console/views/ConsoleLogs.svelte';
  import WorkspaceLogMessage from '../../../components/console/views/WorkspaceLogMessage.svelte';
  import ActionDetailView from '../../../components/sequencing/actions/ActionDetailView.svelte';
  import ActionRunDetailView from '../../../components/sequencing/actions/ActionRunDetailView.svelte';
  import ActionRunsListView from '../../../components/sequencing/actions/ActionRunsListView.svelte';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  import TextEditor from '../../../components/ui/TextEditor.svelte';
  import WorkspaceLeftIconRail from '../../../components/workspace/WorkspaceLeftIconRail.svelte';
  import WorkspaceRightIconRail from '../../../components/workspace/WorkspaceRightIconRail.svelte';
  import WorkspaceRightPanel from '../../../components/workspace/WorkspaceRightPanel.svelte';
  import WorkspaceSidebar from '../../../components/workspace/WorkspaceSidebar.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { WorkspaceContentMode, WorkspaceContentType } from '../../../enums/workspace';
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import {
    activeDocument,
    activeDocumentIsDirty,
    activeDocumentIsLoading,
    activeDocumentPath,
  } from '../../../stores/activeDocument';
  import { allLogs, catchError, clearLogs, errorLogs, logMessage } from '../../../stores/errors';
  import { sequenceAdaptation, setSequenceLanguages } from '../../../stores/sequence-adaptation';
  import {
    channelDictionaries,
    commandDictionaries,
    getParsedChannelDictionary,
    getParsedCommandDictionary,
    getParsedParameterDictionary,
    parameterDictionaries as parameterDictionariesStore,
    parcelToParameterDictionaries,
  } from '../../../stores/sequencing';
  import { initialUsersLoading, users } from '../../../stores/user';
  import {
    addWorkspaceAdaptationError,
    addWorkspaceAdaptationLog,
    clearWorkspaceAdaptationMessages,
    clearWorkspaceLintErrors,
    resetWorkspaceErrorStores,
    setWorkspaceLintErrors,
    userInitiatedActionRunIds,
    workspaceActionErrors,
    workspaceActionRunMessages,
    workspaceAdaptationErrors,
    workspaceAdaptationMessages,
    workspaceLintErrors,
  } from '../../../stores/workspaceErrors';
  import {
    parcel,
    parcels,
    selectedActionDefinitionId,
    selectedActionRunId,
    workspace,
    workspaceContentMode,
    workspaceId,
    workspaces,
  } from '../../../stores/workspaces';
  import type { ActionDefinition } from '../../../types/actions';
  import type { UserStore } from '../../../types/app';
  import type { LintDiagnostic, LogLevel } from '../../../types/errors';
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
    WorkspaceNodesEvent,
  } from '../../../types/workspace';
  import type {
    WorkspaceTreeMap,
    WorkspaceTreeNode,
    WorkspaceTreeNodeWithFullPath,
  } from '../../../types/workspace-tree-view';
  import { setClipboardContent } from '../../../utilities/clipboard';
  import effects from '../../../utilities/effects';
  import { ErrorTypes } from '../../../utilities/errors';
  import { downloadBlob, filterEmpty } from '../../../utilities/generic';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import { showConfirmModal, showRunActionResultsModal } from '../../../utilities/modal';
  import { featurePermissions } from '../../../utilities/permissions';
  import { getWorkspacesUrl } from '../../../utilities/routes';
  import * as adaptationUtils from '../../../utilities/sequence-editor/adaptation-utils';
  import { pluralize } from '../../../utilities/text';
  import { showFailureToast, showSuccessToast } from '../../../utilities/toast';
  import {
    computeMovedFilePath,
    downloadWorkspaceNodesAsZip,
    findNodeAffectingPath,
    flattenWorkspaceTreeWithPaths,
    getAvailableActionsForNodes,
    mapWorkspaceTreePaths,
    removeRedundantNodes,
    separateFilenameFromPath,
    WorkspaceApi,
  } from '../../../utilities/workspaces';
  import type { PageData } from './$types';

  export let data: PageData;

  type WorkspaceConsoleTab = 'actions' | 'adaptation' | 'linting' | 'logs';

  // Initialize sidebar tab and content mode from URL params before first render to avoid flash
  const initialActionRunIdParam = $page.url.searchParams.get(SearchParameters.ACTION_RUN_ID);
  const initialActionIdParam = $page.url.searchParams.get(SearchParameters.ACTION_ID);
  const initialSidebarTab = $page.url.searchParams.get(SearchParameters.SIDEBAR_TAB);

  const { initialWorkspace } = data;
  const user: UserStore = getContext('user');
  const defaultLogLevels: LogLevel[] = ['error', 'warn', 'info'];
  const PANEL_DEFAULT_SIZE = 25;
  const PANEL_MIN_SIZE = 10;
  const resizableHandleClass =
    'w-[3px] hover:after:bg-neutral-300 hover:after:transition-all hover:after:delay-[400ms] data-[active]:after:bg-neutral-300 data-[active]:after:transition-all';

  let availableActionsForActiveFile: ActionParameterPair[] = [];
  let panelsReady: boolean = false;
  let allActionsForWorkspace: ActionDefinition[] = [];
  let channelDictionary: ChannelDictionary | null = null;
  let commandDictionary: CommandDictionary | null = null;
  let consolePaneApi: PaneAPI;
  let leftPaneApi: PaneAPI;
  let leftPanelActiveTab: string =
    initialActionRunIdParam || initialActionIdParam || initialSidebarTab === 'actions' ? 'actions' : 'files';
  let rightPaneApi: PaneAPI;
  let rightPanelActiveTab: string = 'metadata';
  let rightPanelCommandNodeName: string | null = null;
  let hasEditFilePermission: boolean = false;
  let hasEditWorkspacePermission: boolean = false;
  let hasEditWorkspaceCollaboratorsPermission: boolean = false;
  let hasRunActionPermission: boolean = false;
  let isConsoleExpanded: boolean = false;
  let parameterDictionaries: ParameterDictionary[] = [];
  let phoenixContext: PhoenixContext;
  let isWorkspaceLoading: boolean = false;
  let refreshInterval: NodeJS.Timeout | null = null;
  let sidebarBreadcrumbPath: string = '';
  let selectedFilePath: string | null = null;
  let selectedSequenceOutput: string | undefined = undefined;
  let rightPanelOpen: boolean = true;
  let sidebarPanelOpen: boolean = true;
  let selectedConsoleTab: WorkspaceConsoleTab = 'actions';
  let activeEditorView: EditorView | null = null;
  let sequenceEditorRef: SequenceEditor;
  let showLoadingSpinner: boolean = false;
  let librarySequences: LibrarySequenceSignature[] = [];
  let loadingSpinnerTimeout: ReturnType<typeof setTimeout> | null = null;
  let logLevels: LogLevel[] = defaultLogLevels;
  let preserveAdaptationLog: boolean = false;
  let workspaceSequences: UserSequence[] = [];
  let workspaceTree: WorkspaceTreeNode | null = null;
  let workspaceTreeMap: WorkspaceTreeMap = {};
  let workspaceFileList: WorkspaceTreeNodeWithFullPath[] = [];
  let actionDetailIsDirty: boolean = false;

  if (initialActionRunIdParam) {
    const runId = parseInt(initialActionRunIdParam, 10);
    if (!isNaN(runId)) {
      $selectedActionRunId = runId;
      $workspaceContentMode = WorkspaceContentMode.ActionRunDetail;
      if (initialActionIdParam) {
        const actionId = parseInt(initialActionIdParam, 10);
        if (!isNaN(actionId)) {
          $selectedActionDefinitionId = actionId;
        }
      }
    }
  } else if (initialActionIdParam) {
    const actionId = parseInt(initialActionIdParam, 10);
    if (!isNaN(actionId)) {
      $selectedActionDefinitionId = actionId;
      $workspaceContentMode = WorkspaceContentMode.ActionDetail;
    }
  } else if (initialSidebarTab === 'actions') {
    $workspaceContentMode = WorkspaceContentMode.ActionRunsList;
  }

  // Programmatic collapse/expand of left sidebar content pane
  $: if (leftPaneApi) {
    if (sidebarPanelOpen) {
      leftPaneApi.expand();
    } else {
      leftPaneApi.collapse();
    }
  }

  // Programmatic collapse/expand of right panel content pane
  $: if (rightPaneApi) {
    if (rightPanelOpen) {
      rightPaneApi.expand();
    } else {
      rightPaneApi.collapse();
    }
  }

  // Workaround for PaneForge bug: when a pane is expanded for the first time (no saved
  // pre-collapse size), it opens at minSize instead of defaultSize. This callback detects
  // that case and resizes the pane to defaultSize.
  function ensurePaneDefaultSize(paneApi: PaneAPI) {
    const size = paneApi.getSize();
    if (size <= PANEL_MIN_SIZE) {
      paneApi.resize(PANEL_DEFAULT_SIZE);
    }
  }

  // Show loading spinner after a delay to avoid flashing for fast loads
  $: if ($activeDocumentIsLoading) {
    loadingSpinnerTimeout = setTimeout(() => {
      showLoadingSpinner = true;
    }, 200);
  } else {
    if (loadingSpinnerTimeout) {
      clearTimeout(loadingSpinnerTimeout);
      loadingSpinnerTimeout = null;
    }
    showLoadingSpinner = false;
  }

  $: logLevelLabel =
    logLevels.length === defaultLogLevels.length
      ? 'Default levels'
      : logLevels.length === 0
        ? 'None'
        : logLevels.map(l => capitalize(l)).join(', ');

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;
    allActionsForWorkspace = Object.values($actionDefinitionsByWorkspace[$workspaceId] || {});
  }

  // Re-compute permissions when user, workspace, or active document changes
  $: if ($user && (initialWorkspace || $workspace)) {
    const ws: Workspace = $workspace ?? (initialWorkspace as Workspace);

    hasEditWorkspacePermission = featurePermissions.workspace.canUpdate($user, ws);
    hasEditWorkspaceCollaboratorsPermission = featurePermissions.workspaceCollaborators.canCreate($user, ws);
    if ($activeDocumentPath && workspaceTreeMap[$activeDocumentPath]) {
      hasEditFilePermission = featurePermissions.workspace.canUpdate($user, ws, workspaceTreeMap[$activeDocumentPath]);
      availableActionsForActiveFile = getAvailableActionsForNodes(allActionsForWorkspace, [
        workspaceTreeMap[$activeDocumentPath],
      ]);
    } else {
      hasEditFilePermission = featurePermissions.workspace.canUpdate($user, ws);
      availableActionsForActiveFile = [];
    }
    hasRunActionPermission = featurePermissions.actionRun.canCreate($user, ws);
  }

  $: activeFileMetadata = ($activeDocumentPath && workspaceTreeMap[$activeDocumentPath]?.metadata) || null;
  $: activeFileIsSequence =
    $activeDocumentPath !== null &&
    $activeDocument.type !== null &&
    $activeDocument.type === WorkspaceContentType.Sequence;
  $: commandInfoMapper = $sequenceAdaptation.input.commandInfoMapper;
  $: isFileReadOnly = activeFileMetadata?.readOnly ?? false;

  // Switch right panel tab when file type changes
  let previousActiveFileIsSequence: boolean = activeFileIsSequence;
  $: if (activeFileIsSequence !== previousActiveFileIsSequence) {
    previousActiveFileIsSequence = activeFileIsSequence;
    if (!activeFileIsSequence) {
      rightPanelActiveTab = 'metadata';
    } else {
      rightPanelActiveTab = 'command';
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

  $: if (!isWorkspaceLoading && selectedFilePath !== $activeDocumentPath) {
    // the UI's selected file doesn't match our actively loaded file, try to navigate to selected
    maybeNavigate(selectedFilePath);
  }

  $: if (!commandDictionary) {
    commandDictionary = null;
    channelDictionary = null;
    parameterDictionaries = [];
  }

  // Prevent in-app navigation to other routes when there are unsaved changes
  beforeNavigate(({ cancel, to }) => {
    if (!$activeDocumentIsDirty) {
      return;
    }
    // Allow navigation within the same workspace page (file selection is handled by confirmAndNavigate)
    if (to?.route.id === $page.route.id) {
      return;
    }
    // Skip for external navigation (tab close, refresh) - handled by beforeunload
    if (to === null) {
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
        activeDocument.markClean();
        goto(to.url);
      }
    });
  });

  onMount(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if ($activeDocumentIsDirty) {
        event.preventDefault(); // Triggers the native browser confirmation
        event.returnValue = ''; // Required for some older browser compatibility
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  async function maybeNavigate(nextPath: string | null) {
    // treat `null` as a navigable path so we can intentionally unload the editor file rather than skipping
    if (nextPath === null) {
      // wait a tick then revert selected UI to the existing active path
      await tick();
      selectedFilePath = $activeDocumentPath;
      return;
    }
    // If we're in a non-file mode, guard against dirty action detail before switching
    if ($workspaceContentMode !== WorkspaceContentMode.File && actionDetailIsDirty) {
      const { confirm } = await showConfirmModal(
        'Navigate Away',
        'There are unsaved action changes. Are you sure you want to navigate away?',
        'Navigate Away',
        true,
        'Keep Editing',
      );
      if (!confirm) {
        selectedFilePath = $activeDocumentPath;
        return;
      }
      actionDetailIsDirty = false;
    }
    // Switch back to file mode
    $workspaceContentMode = WorkspaceContentMode.File;
    $selectedActionDefinitionId = null;

    const didNavigate = await confirmAndNavigate(nextPath);
    if (!didNavigate) {
      // user decided not to navigate away due to unsaved changes, set selected UI back to active file
      selectedFilePath = $activeDocumentPath;
      return;
    }

    // Clear lint errors for the previous file when switching files
    if ($activeDocumentPath && $activeDocumentPath !== nextPath) {
      clearWorkspaceLintErrors($activeDocumentPath);
    }

    // successfully navigated, start loading the file contents
    selectedSequenceOutput = undefined;
    if (nextPath && workspaceTreeMap[nextPath]) {
      const { filename } = separateFilenameFromPath(nextPath);
      const fileType = workspaceTreeMap[nextPath]?.type ?? null;
      activeDocument.startLoad(nextPath, filename ?? null, fileType);
      await getSelectedFileContent(nextPath);
    } else {
      // navigated to a null/empty file, reset the editor contents
      activeDocument.close();
      if (nextPath && !workspaceTreeMap[nextPath]) {
        showFailureToast('The selected file does not exist in the workspace.');
      }
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
      const workspaceContents = await effects.getWorkspaceContents(workspace.id, '', $user, true);
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
        $user,
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
    return getWorkspaceContents(initialWorkspace);
  }

  /**
   * Force Svelte reactivity for the workspace tree by creating a new contents array reference.
   */
  function invalidateWorkspaceTree() {
    if (workspaceTree?.contents) {
      workspaceTree = { ...workspaceTree, contents: [...workspaceTree.contents] };
    }
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

  async function getSelectedFileContent(filePath: string) {
    let content: string | null = '';

    if ($user) {
      const node = workspaceTreeMap[filePath];
      if (node?.type !== WorkspaceContentType.Directory) {
        content = await effects.getWorkspaceFileContent($workspaceId, filePath, $user);
      }
    }

    if (content === null) {
      // File may have been deleted or renamed — refresh tree so the UI self-corrects
      activeDocument.close();
      refreshWorkspaceContents();
      return;
    }

    // activeDocument.open handles the stale check internally (compares filePath with loadingPath)
    activeDocument.open(filePath, content);

    // Fetch fresh metadata so readOnly/user fields are current when the user opens the file
    const fileNode = workspaceTreeMap[filePath];
    if ($workspaceId && $user && fileNode?.type !== WorkspaceContentType.Directory) {
      WorkspaceApi.getFileMetadata($workspaceId, filePath, $user)
        .then(metadata => {
          if (metadata) {
            const treeNode = workspaceTreeMap[filePath];
            if (treeNode) {
              treeNode.metadata = metadata;
              workspaceTreeMap = { ...workspaceTreeMap };
              invalidateWorkspaceTree();
            }
          }
        })
        .catch(() => {});
    }
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
      const startTime = performance.now();
      const { adaptation, metadata } = await adaptationUtils.loadSequenceAdaptation(id, $user, log => {
        // Forward adaptation console output to the workspace log
        addWorkspaceAdaptationLog(log.level as LogLevel, log.args);
      });
      setSequenceLanguages(adaptation);
      logMessage('log', `Loaded adaptation "${metadata.name}" (ID=${id}).`, {
        duration: performance.now() - startTime,
      });
    } catch (e) {
      console.error(e);
      showFailureToast('Invalid sequence adaptation');
      addWorkspaceAdaptationError({
        cause: (e as Error).message,
        message: `Failed to load sequence adaptation (ID: ${id})`,
        timestamp: new Date().toISOString(),
        trace: (e as Error).stack,
        type: ErrorTypes.WORKSPACE_ADAPTATION_ERROR,
      });
    }
  }

  async function loadCommandDictionary(unparsedCommandDictionary: CommandDictionaryMetadata) {
    const parsedDictionary = await getParsedCommandDictionary(unparsedCommandDictionary, $user);
    if (parsedDictionary) {
      commandDictionary = parsedDictionary;
    } else {
      commandDictionary = null;
    }
  }

  async function loadChannelDictionary(unparsedChannelDictionary?: ChannelDictionaryMetadata) {
    if (unparsedChannelDictionary) {
      const parsedDictionary = await getParsedChannelDictionary(unparsedChannelDictionary, $user);
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
          return getParsedParameterDictionary(unparsedParameterDictionary, $user);
        }),
      )
    ).filter(filterEmpty);
  }

  function resetSequenceAdaptation(): void {
    setSequenceLanguages(undefined);
  }

  async function confirmAndNavigate(filePath: string | null) {
    if ($activeDocumentIsDirty) {
      const { confirm } = await showConfirmModal(
        'Navigate Away',
        `There are unsaved changes. Are you sure you want navigate away from the current file?`,
        'Navigate Away',
        true,
        'Keep Editing',
      );

      if (!confirm) {
        return false;
      }
    }
    // Use replaceState to update URL immediately without triggering SvelteKit navigation
    replaceState(getWorkspacesUrl(base, $workspaceId, filePath), {});

    return true;
  }

  function updateActiveFilePath(newFilePath: string) {
    // Clear lint errors for the old path before updating to new path
    if ($activeDocumentPath) {
      clearWorkspaceLintErrors($activeDocumentPath);
    }
    const { filename } = separateFilenameFromPath(newFilePath);
    const newType = workspaceTreeMap[newFilePath]?.type ?? null;
    activeDocument.updatePath(newFilePath, filename ?? undefined, newType);
    selectedFilePath = newFilePath;
    // Manually update URL since reactive statement won't trigger (selectedFilePath === $activeDocumentPath)
    replaceState(getWorkspacesUrl(base, $workspaceId, newFilePath), {});
  }

  async function saveBeforeOperation(
    operation: 'moving' | 'renaming' | 'downloading' | 'running action',
  ): Promise<boolean> {
    const operationVerb =
      operation === 'moving'
        ? 'Move'
        : operation === 'renaming'
          ? 'Rename'
          : operation === 'downloading'
            ? 'Download'
            : 'Run';
    const { confirm } = await showConfirmModal(
      `Save before ${startCase(operation)}`,
      `The file ${operation === 'running action' ? 'you are running this action on' : `you are ${operation}`} has unsaved changes. Would you like to save them before ${operation === 'running action' ? 'running the action' : operation}?`,
      `Save and ${operationVerb}`,
      true,
      `Cancel ${operationVerb === 'Run' ? '' : operationVerb}`,
    );

    if (!confirm) {
      return false;
    }

    // Save the file before the operation
    await effects.saveWorkspaceFile($workspaceId, $activeDocumentPath!, $activeDocument.currentContent, $user);
    activeDocument.markClean($activeDocument.currentContent);
    return true;
  }

  async function onAddCollaborator(event: CustomEvent<WorkspaceCollaborator[]>) {
    if ($workspace) {
      effects.createWorkspaceCollaborators($workspace, event.detail, $user);
    }
  }

  async function onDeleteCollaborator(event: CustomEvent<string>) {
    if ($workspace) {
      effects.deleteWorkspaceCollaborator($workspace, event.detail, $user);
    }
  }

  async function onUpdateWorkspaceMetadata(event: CustomEvent<Partial<WorkspaceMetadata>>) {
    if ($workspace) {
      effects.updateWorkspace($workspace, event.detail, $user);
    }
  }

  async function onNewFolder(event: CustomEvent<string>) {
    if ($workspace && workspaceTree && $user) {
      const { detail: startingPath } = event;
      const newFolderPath = await effects.newWorkspaceFolder($workspace, workspaceTree, startingPath, $user);
      if (newFolderPath !== null) {
        // select & navigate to the new file
        selectedFilePath = newFolderPath;
        refreshWorkspaceContents();
      }
    }
  }

  async function onNewFile(event: CustomEvent<string>) {
    if ($workspace != null && workspaceTree && $user) {
      const { detail: startingPath } = event;
      const newFilePath = await effects.newWorkspaceSequence($workspace, workspaceTree, startingPath, '', $user);

      if (newFilePath !== null) {
        // select & navigate to the new file
        selectedFilePath = newFilePath;
        refreshWorkspaceContents();
      }
    }
  }

  async function onDownloadFile(filePath: string) {
    if ($workspace && $user) {
      const blob = await effects.getWorkspaceFileContentBlob($workspace, filePath, $user);
      if (blob !== null) {
        downloadBlob(blob, filePath.split('/').pop() || 'download');
      }
    }
  }

  async function onOpenFolder(filePath: string) {
    if ($workspace && $user) {
      sidebarBreadcrumbPath = filePath;
      leftPanelActiveTab = 'files';
      sidebarPanelOpen = true;
    }
  }

  function downloadFileContent(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    downloadBlob(blob, filename);
  }

  async function onImportFile(event: CustomEvent<string>) {
    if ($workspace != null && workspaceTree && $user) {
      const { detail: startingPath } = event;
      const targetPath = await effects.importWorkspaceFile(
        $workspace,
        workspaceTree,
        startingPath,
        $sequenceAdaptation,
        phoenixContext,
        $user,
      );
      refreshWorkspaceContents();

      if (targetPath) {
        selectedFilePath = targetPath;
        refreshWorkspaceContents();
      }
    }
  }

  async function onDeleteNodes({ detail: { treeNodes } }: CustomEvent<WorkspaceNodesEvent>) {
    if ($workspace) {
      const affectedNode = findNodeAffectingPath(treeNodes, $activeDocumentPath);

      const didDelete = await effects.deleteWorkspaceItems($workspace, treeNodes, $user);
      await refreshWorkspaceContents();

      if (didDelete && affectedNode) {
        activeDocument.close();
        selectedFilePath = null;
        confirmAndNavigate(null);
      }
    }
  }

  async function onDownloadNodes({ detail: { treeNodes } }: CustomEvent<WorkspaceNodesEvent>) {
    // Prompt user to save their active file if it is found within treeNodes
    const containsActiveNode = findNodeAffectingPath(treeNodes, $activeDocumentPath);

    // Prompt to save unsaved changes before moving
    if (containsActiveNode && $activeDocumentIsDirty) {
      if (!(await saveBeforeOperation('downloading'))) {
        return;
      }
    }

    // Download if just a single file
    if (treeNodes.length === 1 && treeNodes[0].type !== WorkspaceContentType.Directory) {
      onDownloadFile(treeNodes[0].fullPath);
      return;
    }

    await downloadWorkspaceNodesAsZip({
      allFiles: workspaceFileList,
      nodes: treeNodes,
      onError: showFailureToast,
      user: $user,
      workspaceId: $workspaceId,
      workspaceName: $workspace?.name,
    });
  }

  async function onMoveNodes({ detail: { hasReadOnlyNodes = false, treeNodes } }: CustomEvent<WorkspaceNodesEvent>) {
    if ($workspace && workspaceTree) {
      const movedActiveNode = findNodeAffectingPath(treeNodes, $activeDocumentPath);

      // Prompt to save unsaved changes before moving
      if (movedActiveNode && $activeDocumentIsDirty) {
        if (!(await saveBeforeOperation('moving'))) {
          return;
        }
      }

      // Remove redundant nodes that would already be moved by a selected parent node
      const minimalNodes = removeRedundantNodes(treeNodes);

      const result = await effects.moveWorkspaceItems($workspace, workspaceTree, minimalNodes, hasReadOnlyNodes, $user);
      await refreshWorkspaceContents();

      if (movedActiveNode && result) {
        const { renamedFiles, skippedFiles, targetPath } = result;
        // Don't update selection if the file was skipped
        if (!skippedFiles.has($activeDocumentPath!)) {
          const newFilePath = computeMovedFilePath($activeDocumentPath!, minimalNodes, targetPath, renamedFiles);
          // Wait for tree to render before updating selection (ensures parent folders can expand)
          await tick();
          updateActiveFilePath(newFilePath);
        }
      }
    }
  }

  async function onRenameNode({ detail: { treeNode, treeNodePath } }: CustomEvent<WorkspaceNodeEvent>) {
    if ($workspace) {
      const shouldUpdateSelectedNode = treeNodePath === $activeDocumentPath;

      // Prompt to save unsaved changes before renaming
      if (shouldUpdateSelectedNode && $activeDocumentIsDirty) {
        if (!(await saveBeforeOperation('renaming'))) {
          return;
        }
      }

      const targetPath = await effects.renameWorkspaceItem($workspace, treeNode, treeNodePath, $user);
      await refreshWorkspaceContents();

      if (shouldUpdateSelectedNode && typeof targetPath === 'string') {
        // Wait for tree to render before updating selection (ensures parent folders can expand)
        await tick();
        updateActiveFilePath(targetPath);
      }
    }
  }

  function onWorkspaceInputFileUpdated({
    detail: { filePath, input },
  }: CustomEvent<{ filePath: string; input: string }>) {
    // Ignore stale events from a file that is no longer active
    // Note: editors receive ($activeDocumentPath ?? '') so we normalize the comparison
    if (filePath !== ($activeDocumentPath ?? '')) {
      return;
    }

    activeDocument.updateContent(input);
  }

  function onWorkspaceOutputFileUpdated({
    detail: { filePath, output },
  }: CustomEvent<{ filePath: string; output?: string }>) {
    // Ignore stale events from a file that is no longer active
    // Note: editors receive ($activeDocumentPath ?? '') so we normalize the comparison
    if (filePath !== ($activeDocumentPath ?? '')) {
      return;
    }

    if (output) {
      selectedSequenceOutput = output;
    }
  }

  async function saveCurrentFile(content: string) {
    if ($activeDocumentPath) {
      await effects.saveWorkspaceFile($workspaceId, $activeDocumentPath, content, $user);
      activeDocument.markClean(content);
      refreshWorkspaceContents();
    } else if ($workspace && workspaceTree && content) {
      const newFilePath = await effects.newWorkspaceSequence($workspace, workspaceTree, '', content, $user);
      if (newFilePath !== null) {
        selectedFilePath = newFilePath;
        activeDocument.markClean(content);
        refreshWorkspaceContents();
      }
    }
  }

  async function onReadOnlyChange(readOnly: boolean) {
    if (!$activeDocumentPath || !$workspaceId) {
      return;
    }
    try {
      await WorkspaceApi.setFileMetadata($workspaceId, $activeDocumentPath, { readOnly }, $user);
      // Update local metadata optimistically
      const node = workspaceTreeMap[$activeDocumentPath];
      if (node) {
        node.metadata = { ...node.metadata, readOnly };
        workspaceTreeMap = { ...workspaceTreeMap };
        invalidateWorkspaceTree();
      }
      showSuccessToast(`File marked as ${readOnly ? 'read only' : 'editable'}`);
    } catch (e) {
      catchError('log', 'Failed to update read-only status', e as Error);
      showFailureToast('Failed to update read-only status');
    }
  }

  async function onUpdateUserMetadata(event: CustomEvent<Record<string, unknown>>) {
    if (!$activeDocumentPath || !$workspaceId) {
      return;
    }
    try {
      await WorkspaceApi.setFileMetadata($workspaceId, $activeDocumentPath, { user: event.detail }, $user);
      const node = workspaceTreeMap[$activeDocumentPath];
      if (node) {
        node.metadata = { ...node.metadata, user: event.detail };
        workspaceTreeMap = { ...workspaceTreeMap };
        invalidateWorkspaceTree();
      }
      showSuccessToast('User metadata updated');
    } catch (e) {
      catchError('log', 'Failed to update user metadata', e as Error);
      showFailureToast('Failed to update user metadata');
    }
  }

  function onSaveWorkspaceFile(event: CustomEvent<string>) {
    saveCurrentFile(event.detail);
  }

  function onCopyFileLocation({ detail: copyPath }: CustomEvent<string>) {
    const WORKSPACE_URL = browser ? env.PUBLIC_WORKSPACE_CLIENT_URL : env.PUBLIC_WORKSPACE_SERVER_URL;
    setClipboardContent(`${WORKSPACE_URL}/ws/${$workspaceId}/${copyPath}`);
  }

  function onCopyFullPath({ detail: copyPath }: CustomEvent<string>) {
    setClipboardContent(copyPath);
  }

  async function onMoveNodesToWorkspace({
    detail: { hasReadOnlyNodes = false, treeNodes },
  }: CustomEvent<WorkspaceNodesEvent>) {
    if (initialWorkspace) {
      const movedActiveNode = findNodeAffectingPath(treeNodes, $activeDocumentPath);

      // Prompt to save unsaved changes before moving
      if (movedActiveNode && $activeDocumentIsDirty) {
        if (!(await saveBeforeOperation('moving'))) {
          return;
        }
      }

      await effects.moveWorkspaceItemsToWorkspace(initialWorkspace, treeNodes, hasReadOnlyNodes, $user);
      refreshWorkspaceContents();
    }
  }

  async function switchToContentMode(
    mode: WorkspaceContentMode,
    options?: { actionId?: number | null; runId?: number | null },
  ) {
    // Guard against switching away from dirty file
    if ($workspaceContentMode === WorkspaceContentMode.File && $activeDocumentIsDirty) {
      const { confirm } = await showConfirmModal(
        'Navigate Away',
        'There are unsaved changes. Are you sure you want to navigate away from the current file?',
        'Navigate Away',
        true,
        'Keep Editing',
      );
      if (!confirm) {
        return;
      }
      // Revert content to last-saved state and mark clean
      activeDocument.updateContent($activeDocument.originalContent);
      activeDocument.markClean();
    }

    // Silently reset dirty action detail state on navigate away
    if ($workspaceContentMode === WorkspaceContentMode.ActionDetail && actionDetailIsDirty) {
      actionDetailIsDirty = false;
    }

    $workspaceContentMode = mode;
    if (options?.actionId !== undefined) {
      $selectedActionDefinitionId = options.actionId ?? null;
    } else if (mode === WorkspaceContentMode.ActionRunsList) {
      $selectedActionDefinitionId = null;
    }
    if (options?.runId !== undefined) {
      $selectedActionRunId = options.runId ?? null;
    }

    // Sync sidebar tab with content mode
    if (mode === WorkspaceContentMode.File) {
      leftPanelActiveTab = 'files';
    } else {
      leftPanelActiveTab = 'actions';
    }

    // Update URL to reflect current content mode for deep linking
    updateContentModeUrl(mode, options);
  }

  function updateContentModeUrl(
    mode: WorkspaceContentMode,
    options?: { actionId?: number | null; runId?: number | null },
  ) {
    const baseUrl = getWorkspacesUrl(base, $workspaceId);
    const params = new URLSearchParams();

    if (mode === WorkspaceContentMode.ActionRunDetail && options?.runId != null) {
      params.set(SearchParameters.ACTION_RUN_ID, String(options.runId));
      if ($selectedActionDefinitionId != null) {
        params.set(SearchParameters.ACTION_ID, String($selectedActionDefinitionId));
      }
    } else if (mode === WorkspaceContentMode.ActionDetail && $selectedActionDefinitionId != null) {
      params.set(SearchParameters.ACTION_ID, String($selectedActionDefinitionId));
    } else if (mode === WorkspaceContentMode.ActionRunsList) {
      params.set(SearchParameters.SIDEBAR_TAB, 'actions');
    }

    const query = params.toString();
    replaceState(query ? `${baseUrl}?${query}` : baseUrl, {});
  }

  function onSelectAction(event: CustomEvent<{ id: number }>) {
    switchToContentMode(WorkspaceContentMode.ActionDetail, { actionId: event.detail.id });
  }

  function onSelectAllRuns() {
    switchToContentMode(WorkspaceContentMode.ActionRunsList);
  }

  async function onTabChange(event: CustomEvent<string>) {
    const tab = event.detail;
    if (tab === 'actions') {
      await switchToContentMode(WorkspaceContentMode.ActionRunsList);
    } else if (tab === 'settings') {
      leftPanelActiveTab = 'settings'; // settings doesn't have a content mode, so just update the active tab
    } else {
      await switchToContentMode(WorkspaceContentMode.File);
    }
    // Ensure panel is open after switching tabs
    sidebarPanelOpen = true;
  }

  function onActionDetailDirty(event: CustomEvent<boolean>) {
    actionDetailIsDirty = event.detail;
  }

  function onViewActionRun(event: CustomEvent<{ runId: number }>) {
    switchToContentMode(WorkspaceContentMode.ActionRunDetail, { runId: event.detail.runId });
  }

  function onActionRunBack() {
    // Navigate back to the previous action view
    if ($selectedActionDefinitionId !== null) {
      switchToContentMode(WorkspaceContentMode.ActionDetail, { actionId: $selectedActionDefinitionId });
    } else {
      switchToContentMode(WorkspaceContentMode.ActionRunsList);
    }
  }

  function handleActionRunResult(runId: number | null) {
    if (runId !== null) {
      userInitiatedActionRunIds.update(ids => new Set(ids).add(runId));
      switchToContentMode(WorkspaceContentMode.ActionRunDetail, { runId });
    }
  }

  async function handleActionRunResultFromEditor(runId: number | null) {
    if (runId === null) {
      return;
    }
    userInitiatedActionRunIds.update(ids => new Set(ids).add(runId));
    const { confirm } = await showRunActionResultsModal(runId);
    if (confirm) {
      switchToContentMode(WorkspaceContentMode.ActionRunDetail, { runId });
    }
  }

  async function onRerunAction(
    event: CustomEvent<{
      actionDefinitionId: number;
      parameters: ArgumentsMap;
      revision: number;
      settings: ArgumentsMap;
    }>,
  ) {
    const { actionDefinitionId, parameters, revision, settings } = event.detail;
    const defs = $actionDefinitionsByWorkspace[$workspaceId] || {};
    const actionDef = defs[actionDefinitionId];
    if (actionDef && $workspace) {
      handleActionRunResult(
        await effects.runAction(actionDef, $workspace, workspaceFileList, $user, parameters, revision, true, settings),
      );
    }
  }

  async function onRunActionFromSidebar(event: CustomEvent<ActionDefinition>) {
    const action = event.detail;
    if ($workspace) {
      handleActionRunResult(await effects.runAction(action, $workspace, workspaceFileList, $user));
    }
  }

  async function onRunActionFromDetailView(event: CustomEvent<ActionDefinition>) {
    const action = event.detail;
    if ($workspace) {
      handleActionRunResult(await effects.runAction(action, $workspace, workspaceFileList, $user));
    }
  }

  async function onRunActionOnActiveFile(event: CustomEvent<{ action: ActionDefinition; parameter: string }>) {
    const {
      detail: { action, parameter: primaryParameter },
    } = event;

    // Prompt to save unsaved changes before running action
    if ($activeDocumentIsDirty) {
      if (!(await saveBeforeOperation('running action'))) {
        return;
      }
    }

    let parameters: ArgumentsMap = {};
    const latestParamSchema = action.versions[0]?.parameter_schema ?? {};
    // the event will tell us which of the action's parameter is the primary, to be pre-filled with the file's path
    if (primaryParameter in latestParamSchema) {
      const paramDefinition = latestParamSchema[primaryParameter];
      const paramValue =
        paramDefinition.type === 'fileList' || paramDefinition.type === 'sequenceList'
          ? [$activeDocumentPath]
          : $activeDocumentPath;
      parameters[primaryParameter] = paramValue;
    } else {
      // no primary parameter - show modal anyway, just don't pre-fill parameter
      console.warn(`Invalid parameter ${primaryParameter} in onRunActionOnActiveFile`);
    }

    if ($workspace) {
      handleActionRunResultFromEditor(
        await effects.runAction(action, $workspace, workspaceFileList, $user, parameters),
      );
    }
  }

  async function onRunActionOnFileSelection(event: CustomEvent<WorkspaceNodeRunActionEvent>) {
    const {
      detail: { actionParameterPair, treeNodes },
    } = event;

    // Check if the active file is in the selection and has unsaved changes
    const containsActiveNode = findNodeAffectingPath(treeNodes, $activeDocumentPath);

    if (containsActiveNode && $activeDocumentIsDirty) {
      if (!(await saveBeforeOperation('running action'))) {
        return;
      }
    }

    const treeNodePaths: string[] = treeNodes.map(({ fullPath }) => fullPath);
    const { action, parameter: primaryParameter } = actionParameterPair;

    let parameters: ArgumentsMap = {};
    const latestParamSchema = action.versions[0]?.parameter_schema ?? {};
    // the event will tell us which of the action's parameter is the primary, to be pre-filled with the file's path
    if (primaryParameter in latestParamSchema) {
      const paramDefinition = latestParamSchema[primaryParameter];
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
      handleActionRunResultFromEditor(
        await effects.runAction(action, $workspace, workspaceFileList, $user, parameters),
      );
    }
  }

  function onOpenInNewTab({ detail: treeNodePath }: CustomEvent<string>) {
    window.open(`${base}/workspaces/${$workspaceId}?sequenceId=${encodeURIComponent(treeNodePath)}`, '_blank');
  }

  async function onDownloadInput(event: CustomEvent<{ filePath: string }>) {
    const { filePath } = event.detail;

    // Check if downloading the active file with unsaved changes
    if (filePath === $activeDocumentPath && $activeDocumentIsDirty) {
      if (!(await saveBeforeOperation('downloading'))) {
        return;
      }
    }

    // Trigger the actual download
    onDownloadFile(filePath);
  }

  async function onDownloadOutput(
    event: CustomEvent<{ content: string; filePath: string; filename: string; outputLanguage: OutputLanguage }>,
  ) {
    const { content, filePath, filename } = event.detail;

    // Check if downloading output for the active file with unsaved changes
    if (filePath === $activeDocumentPath && $activeDocumentIsDirty) {
      if (!(await saveBeforeOperation('downloading'))) {
        return;
      }
    }

    // Trigger the actual download with in-memory content
    downloadFileContent(content, filename);
  }

  function onGlobalKeydown(event: KeyboardEvent) {
    if (isSaveEvent(event)) {
      event.preventDefault();
      if (hasEditFilePermission && $activeDocumentIsDirty) {
        saveCurrentFile($activeDocument.currentContent);
      }
    }
  }

  // Console handlers
  function onConsoleToggle(event: CustomEvent<boolean>) {
    isConsoleExpanded = event.detail;
    if (isConsoleExpanded) {
      consolePaneApi?.expand();
    } else {
      consolePaneApi?.collapse();
    }
  }

  function onSelectConsoleTab(event: CustomEvent<{ expand: boolean; tab: string }>) {
    selectedConsoleTab = event.detail.tab as WorkspaceConsoleTab;
    isConsoleExpanded = true;
    consolePaneApi?.expand();
  }

  function onClearConsole() {
    if (selectedConsoleTab === 'logs') {
      clearLogs();
    } else if (selectedConsoleTab === 'adaptation') {
      clearWorkspaceAdaptationMessages();
    }
  }

  function onLintChange(event: CustomEvent<{ diagnostics: LintDiagnostic[]; filePath: string }>) {
    const { diagnostics, filePath } = event.detail;
    setWorkspaceLintErrors(filePath, diagnostics);
  }

  function onAdaptationError(event: CustomEvent<{ error: Error; filePath: string }>) {
    const { error, filePath } = event.detail;
    addWorkspaceAdaptationError({
      cause: error.message,
      message: `Adaptation error while processing "${filePath}"`,
      timestamp: new Date().toISOString(),
      trace: error.stack,
      type: ErrorTypes.WORKSPACE_ADAPTATION_ERROR,
    });
  }

  function onGotoLine(event: CustomEvent<{ column: number; line: number }>) {
    const { column, line } = event.detail;
    if (sequenceEditorRef) {
      sequenceEditorRef.gotoLine(line, column);
    }
  }

  onMount(async () => {
    if (initialWorkspace) {
      $workspaceId = initialWorkspace.id;
      selectedFilePath = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
      getWorkspaceContents(initialWorkspace);
    }
    // Wait a tick for paneforge to restore saved sizes from localStorage before showing panels
    await tick();
    panelsReady = true;
  });

  onDestroy(() => {
    resetSequenceAdaptation();
    activeDocument.reset();
    resetWorkspaceErrorStores();
    $workspaceContentMode = WorkspaceContentMode.File;
    $selectedActionDefinitionId = null;
    $selectedActionRunId = null;

    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
    }

    if (loadingSpinnerTimeout !== null) {
      clearTimeout(loadingSpinnerTimeout);
    }
  });
</script>

<svelte:window on:keydown={onGlobalKeydown} />

<PageTitle title="Workspace: {$workspace?.name}" />

<Resizable.PaneGroup direction="vertical" autoSaveId="workspace-console">
  <Resizable.Pane defaultSize={84}>
    <div class="flex h-full" class:invisible={!panelsReady}>
      <!-- Left icon rail (fixed 45px, always visible, outside Resizable) -->
      <WorkspaceLeftIconRail
        bind:activeTab={leftPanelActiveTab}
        bind:panelOpen={sidebarPanelOpen}
        on:tabChange={onTabChange}
      />

      <!-- All resizable panel content -->
      <Resizable.PaneGroup direction="horizontal" autoSaveId="workspace-panels">
        <!-- Left sidebar content (collapses to 0, icon rail is outside) -->
        <Resizable.Pane
          defaultSize={PANEL_DEFAULT_SIZE}
          minSize={PANEL_MIN_SIZE}
          collapsible
          collapsedSize={0}
          onCollapse={() => (sidebarPanelOpen = false)}
          onExpand={() => {
            sidebarPanelOpen = true;
            ensurePaneDefaultSize(leftPaneApi);
          }}
          bind:pane={leftPaneApi}
        >
          <WorkspaceSidebar
            bind:currentBreadcrumbPath={sidebarBreadcrumbPath}
            bind:selectedFilePath
            activeTab={leftPanelActiveTab}
            actions={allActionsForWorkspace}
            {workspaceTree}
            {isWorkspaceLoading}
            {hasEditWorkspacePermission}
            {hasEditWorkspaceCollaboratorsPermission}
            parcels={$parcels}
            user={$user}
            users={$users}
            usersLoading={$initialUsersLoading}
            workspace={$workspace}
            workspaces={$workspaces}
            on:addCollaborator={onAddCollaborator}
            on:deleteCollaborator={onDeleteCollaborator}
            on:download={onDownloadNodes}
            on:deleteNodes={onDeleteNodes}
            on:moveNodes={onMoveNodes}
            on:renameNode={onRenameNode}
            on:newFolder={onNewFolder}
            on:newFile={onNewFile}
            on:importFile={onImportFile}
            on:copyFileLocation={onCopyFileLocation}
            on:copyFullPath={onCopyFullPath}
            on:moveNodesToWorkspace={onMoveNodesToWorkspace}
            on:refreshWorkspace={refreshWorkspaceContents}
            on:updateWorkspaceMetadata={onUpdateWorkspaceMetadata}
            on:runAction={onRunActionOnFileSelection}
            on:runActionFromSidebar={onRunActionFromSidebar}
            on:selectAction={onSelectAction}
            on:selectAllRuns={onSelectAllRuns}
            on:openInNewTab={onOpenInNewTab}
          />
        </Resizable.Pane>

        <Resizable.Handle class={resizableHandleClass} />

        <!-- Content area -->
        <Resizable.Pane defaultSize={60} minSize={30} class="z-10">
          {#if $workspaceContentMode === WorkspaceContentMode.ActionDetail && $selectedActionDefinitionId !== null}
            <ActionDetailView
              actionDefinitionId={$selectedActionDefinitionId}
              user={$user}
              workspace={$workspace}
              workspaceFiles={workspaceFileList}
              on:close={() => switchToContentMode(WorkspaceContentMode.ActionRunsList)}
              on:dirty={onActionDetailDirty}
              on:runAction={onRunActionFromDetailView}
              on:viewRun={onViewActionRun}
            />
          {:else if $workspaceContentMode === WorkspaceContentMode.ActionRunDetail && $selectedActionRunId !== null}
            <ActionRunDetailView
              actionRunId={$selectedActionRunId}
              user={$user}
              hasRunPermission={$workspace != null && featurePermissions.actionRun.canCreate($user, $workspace)}
              on:back={onActionRunBack}
              on:rerun={onRerunAction}
              on:viewAction={e =>
                switchToContentMode(WorkspaceContentMode.ActionDetail, { actionId: e.detail.actionId })}
            />
          {:else if $workspaceContentMode === WorkspaceContentMode.ActionRunsList}
            <ActionRunsListView user={$user} on:viewRun={onViewActionRun} />
          {:else}
            {@const isTextOrEmpty =
              $activeDocumentPath === null || isTextFile(workspaceTreeMap[$activeDocumentPath]?.type)}
            {@const isSequenceFile =
              $activeDocumentPath === null ||
              ($activeDocument.type !== null && $activeDocument.type === WorkspaceContentType.Sequence)}
            <div class="relative grid h-full grid-cols-1 grid-rows-1">
              {#if showLoadingSpinner && isTextOrEmpty}
                <div
                  class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/50"
                >
                  <LoaderCircle size={32} class="animate-spin text-muted-foreground" />
                </div>
              {/if}
              {#if isTextOrEmpty && isSequenceFile}
                <div class="flex h-full">
                  <SequenceEditor
                    bind:this={sequenceEditorRef}
                    {phoenixContext}
                    availableActions={availableActionsForActiveFile}
                    fileMetadata={activeFileMetadata}
                    includeActions={hasRunActionPermission}
                    isLoading={$activeDocumentIsLoading}
                    onReadOnlyChange={readOnly => onReadOnlyChange(readOnly)}
                    {preserveAdaptationLog}
                    previewOnly={!hasEditFilePermission}
                    readOnly={isFileReadOnly}
                    sequenceAdaptation={$sequenceAdaptation}
                    sequenceDefinition={$activeDocument.originalContent}
                    sequenceName={$activeDocument.fileName ?? ''}
                    sequenceFilePath={$activeDocumentPath ?? ''}
                    sequenceOutput={selectedSequenceOutput}
                    shouldListenForKeyboardSave={false}
                    showCommandFormBuilder={false}
                    userSequenceEditorColumns="1fr"
                    userSequenceEditorColumnsWithFormBuilder="1fr"
                    on:adaptationError={onAdaptationError}
                    on:editorViewChange={e => (activeEditorView = e.detail)}
                    on:lintChange={onLintChange}
                    on:runAction={onRunActionOnActiveFile}
                    on:save={onSaveWorkspaceFile}
                    on:downloadInput={onDownloadInput}
                    on:downloadOutput={onDownloadOutput}
                    on:sequenceInputUpdate={onWorkspaceInputFileUpdated}
                    on:sequenceOutputUpdate={onWorkspaceOutputFileUpdated}
                  />
                </div>
              {:else if isTextOrEmpty}
                <div class="flex h-full">
                  <TextEditor
                    availableActions={availableActionsForActiveFile}
                    fileMetadata={activeFileMetadata}
                    includeActions={true}
                    isJSON={$activeDocument.type === WorkspaceContentType.Json}
                    isLoading={$activeDocumentIsLoading}
                    onReadOnlyChange={readOnly => onReadOnlyChange(readOnly)}
                    previewOnly={!hasEditFilePermission}
                    readOnly={isFileReadOnly}
                    shouldListenForKeyboardSave={false}
                    textFileName={$activeDocument.fileName ?? ''}
                    textFilePath={$activeDocumentPath ?? ''}
                    textFileContent={$activeDocument.originalContent}
                    on:lintChange={onLintChange}
                    on:runAction={onRunActionOnActiveFile}
                    on:save={onSaveWorkspaceFile}
                    on:download={onDownloadInput}
                    on:textContentUpdated={onWorkspaceInputFileUpdated}
                  />
                </div>
              {:else if $activeDocument.type === WorkspaceContentType.Directory && $activeDocumentPath}
                {@const folderNode = workspaceTreeMap[$activeDocumentPath]}
                {@const folderFiles =
                  (folderNode?.contents || []).filter(node => node.type !== WorkspaceContentType.Directory) ?? []}
                {@const folderSubfolders =
                  (folderNode?.contents || []).filter(node => node.type === WorkspaceContentType.Directory) ?? []}
                <div class="flex w-full flex-col items-center justify-center gap-8 pt-6">
                  <Folder size={70} class="text-muted-foreground" />
                  <p class="st-typography-body max-w-prose text-center text-sm text-muted-foreground">
                    The selected folder
                    <code class="font-bold">
                      {$activeDocumentPath}
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
                  <Button variant="secondary" on:click={() => onOpenFolder($activeDocumentPath)}>Open Folder</Button>
                </div>
              {:else if !isTextOrEmpty}
                <div class="flex w-full flex-col items-center justify-center gap-8 pt-6">
                  <TriangleAlert size={70} class="text-muted-foreground" />
                  <p class="st-typography-body max-w-prose text-center text-sm text-muted-foreground">
                    The selected file
                    <code class="font-bold">
                      {$activeDocumentPath}
                    </code>
                    is not displayed in the editor because it is either binary or an unsupported extension.
                  </p>
                  <div>
                    <Button variant="secondary" on:click={() => onDownloadFile($activeDocumentPath)}>Download</Button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </Resizable.Pane>

        {#if $workspaceContentMode === WorkspaceContentMode.File}
          <Resizable.Handle class={resizableHandleClass} />

          <!-- Right panel content (collapses to 0, icon rail is outside) -->
          <Resizable.Pane
            defaultSize={PANEL_DEFAULT_SIZE}
            minSize={PANEL_MIN_SIZE}
            collapsible
            collapsedSize={0}
            onCollapse={() => (rightPanelOpen = false)}
            onExpand={() => {
              rightPanelOpen = true;
              ensurePaneDefaultSize(rightPaneApi);
            }}
            bind:pane={rightPaneApi}
          >
            <WorkspaceRightPanel
              bind:activeTab={rightPanelActiveTab}
              bind:commandNodeName={rightPanelCommandNodeName}
              editorSequenceView={activeEditorView}
              filePath={$activeDocumentPath}
              fileMetadata={activeFileMetadata}
              hasEditPermission={hasEditFilePermission}
              isSequenceFile={activeFileIsSequence}
              {phoenixContext}
              {commandInfoMapper}
              on:updateUserMetadata={onUpdateUserMetadata}
            />
          </Resizable.Pane>
        {/if}
      </Resizable.PaneGroup>

      <!-- Right icon rail (only visible in file mode) -->
      {#if $workspaceContentMode === WorkspaceContentMode.File}
        <WorkspaceRightIconRail
          bind:activeTab={rightPanelActiveTab}
          bind:panelOpen={rightPanelOpen}
          commandNodeName={rightPanelCommandNodeName}
          isSequenceFile={activeFileIsSequence}
        />
      {/if}
    </div>
  </Resizable.Pane>

  <Resizable.Handle class={resizableHandleClass} />

  <Resizable.Pane
    defaultSize={!isConsoleExpanded ? 0 : 24}
    minSize={16}
    collapsible
    collapsedSize={0}
    onCollapse={() => (isConsoleExpanded = false)}
    onExpand={() => (isConsoleExpanded = true)}
    bind:pane={consolePaneApi}
    class="h-full min-h-[36px]"
  >
    <div class="h-full min-h-6 overflow-hidden">
      <Console
        expanded={isConsoleExpanded}
        selectedTab={selectedConsoleTab}
        on:toggle={onConsoleToggle}
        on:selectTab={onSelectConsoleTab}
      >
        <svelte:fragment slot="console-actions">
          {#if isConsoleExpanded}
            <Select.Root
              multiple
              typeahead={false}
              selected={logLevels.map(l => ({ label: capitalize(l), value: l }))}
              onSelectedChange={values => {
                if (values) {
                  logLevels = values.map(v => v.value);
                }
              }}
            >
              <Select.Trigger size="xs" class="w-[120px] flex-shrink-0">{logLevelLabel}</Select.Trigger>
              <Select.Content size="xs">
                <Select.Item size="xs" value="info" label="Info">Info</Select.Item>
                <Select.Item size="xs" value="warn" label="Warning">Warning</Select.Item>
                <Select.Item size="xs" value="error" label="Error">Error</Select.Item>
              </Select.Content>
            </Select.Root>
          {/if}
          {#if isConsoleExpanded && selectedConsoleTab === 'adaptation'}
            <div class="mx-1.5 flex items-center gap-1.5 border-l border-r border-border px-2 text-xs">
              <Checkbox
                size="sm"
                name="preserveAdaptationLog"
                id="preserveAdaptationLog"
                bind:checked={preserveAdaptationLog}
              />
              <label class="select-none whitespace-nowrap text-muted-foreground" for="preserveAdaptationLog">
                Preserve logs
              </label>
            </div>
          {/if}
          {#if isConsoleExpanded && (selectedConsoleTab === 'logs' || selectedConsoleTab === 'adaptation')}
            <Button variant="ghost" size="icon" on:click={onClearConsole}>
              <ListX size={16} />
            </Button>
          {/if}
        </svelte:fragment>

        <svelte:fragment slot="console-tabs">
          <div class="flex items-center overflow-x-hidden py-0.5">
            <ConsoleTab value="actions" numberOfErrors={$workspaceActionErrors.length}>Actions</ConsoleTab>
            <ConsoleTab value="adaptation" numberOfErrors={$workspaceAdaptationErrors.length}>Adaptation</ConsoleTab>
            <ConsoleTab value="linting" numberOfErrors={$workspaceLintErrors.filter(e => e.level === 'error').length}>
              Linting
            </ConsoleTab>
            <div
              class="pointer-events-none mx-2 flex h-4 w-0 items-center justify-center border-r border-black border-opacity-20 px-0"
            />
            <ConsoleTab value="logs" numberOfErrors={$errorLogs.length}>
              Logs
              <svelte:fragment slot="badge">
                {#if $errorLogs.length}
                  <span class="flex items-center gap-0.5 px-0.5">
                    <TriangleAlert size={13} />
                    {$errorLogs.length}
                  </span>
                {/if}
              </svelte:fragment>
            </ConsoleTab>
          </div>
        </svelte:fragment>

        <ConsoleLogs
          value="actions"
          showTimestamp
          showType={false}
          logs={$workspaceActionRunMessages}
          autoScroll
          emptyStateMessage="No action runs"
        >
          <WorkspaceLogMessage slot="message" let:log {log} on:viewRun={onViewActionRun} />
        </ConsoleLogs>
        <ConsoleLogs
          value="adaptation"
          showTimestamp
          showType={false}
          logs={$workspaceAdaptationMessages}
          {logLevels}
          autoScroll
          emptyStateMessage="No adaptation errors"
        />
        <ConsoleLogs
          value="linting"
          showTimestamp={false}
          showType={false}
          logs={$workspaceLintErrors}
          {logLevels}
          emptyStateMessage="No linting errors"
        >
          <WorkspaceLogMessage slot="message" let:log {log} on:gotoLine={onGotoLine} />
        </ConsoleLogs>
        <ConsoleLogs
          value="logs"
          logs={$allLogs}
          {logLevels}
          emptyStateMessage="No logs"
          noMatchingResultsMessage="No matching logs"
          autoScroll
          showType={false}
        />
      </Console>
    </div>
  </Resizable.Pane>
</Resizable.PaneGroup>
