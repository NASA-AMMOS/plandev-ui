<svelte:options immutable={true} />

<script lang="ts">
  import { Input } from '@nasa-jpl/stellar-svelte';
  import type {
    CellContextMenuEvent,
    ColumnResizedEvent,
    ColumnState,
    ICellRendererParams,
    IRowNode,
  } from 'ag-grid-community';
  import { Search } from 'lucide-svelte';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { COLUMN_STATE_COOKIE_NAME } from '../../../constants/cookies';
  import { PATH_DELIMITER } from '../../../constants/workspaces';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { ActionDefinition } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef, DataGridRowDoubleClick, RowId } from '../../../types/data-grid';
  import type {
    ActionParameterPair,
    Workspace,
    WorkspaceNodeEvent,
    WorkspaceNodeRunActionEvent,
    WorkspaceNodesEvent,
  } from '../../../types/workspace';
  import type {
    WorkspaceFileMetadata,
    WorkspaceTreeNode,
    WorkspaceTreeNodeWithFullPath,
  } from '../../../types/workspace-tree-view';
  import { deleteCookie, getJsonCookie, setJsonCookie } from '../../../utilities/cookies';
  import { featurePermissions } from '../../../utilities/permissions';
  import {
    computeTreeFilter,
    findNodeByPath,
    flattenWorkspaceTreeWithPaths,
    getAvailableActionsForNodes,
    hasReadonlyInTree,
    shouldNodeBeVisible,
    sortWorkspaceTree,
    type TreeSortComparator,
  } from '../../../utilities/workspaces';
  import ActivityTableMenu from '../../activity/ActivityTableMenu.svelte';
  import BulkActionDataGrid from '../../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import WorkspaceContextMenuContents from '../WorkspaceContextMenuContents.svelte';
  import ResponsiveBreadcrumb from './ResponsiveBreadcrumb.svelte';
  import TreeCell from './TreeCell.svelte';

  export let actions: ActionDefinition[] = [];
  export let currentBreadcrumbPath: string = '';
  /** The currently selected tree node path. Use `null` to indicate no selection. */
  export let selectedTreeNodePath: string | null = null;
  export let treeNode: WorkspaceTreeNode | null = null;
  export let workspace: Workspace | null = null;
  export let user: User | null;

  type CellRendererParams = {
    showMenu: (node: WorkspaceTreeNodeWithFullPath, event: MouseEvent) => void;
    viewNode: (node: WorkspaceTreeNodeWithFullPath) => void;
  };
  type WorkspaceTreeNodeCellRendererParams = ICellRendererParams<WorkspaceTreeNodeWithFullPath> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    copyFileLocation: string;
    copyFullPath: string;
    deleteNodes: WorkspaceNodesEvent;
    download: WorkspaceNodesEvent;
    importFile: string;
    moveNodes: WorkspaceNodesEvent;
    moveNodesToWorkspace: WorkspaceNodesEvent;
    newFile: string;
    newFolder: string;
    openInNewTab: string;
    renameNode: WorkspaceNodeEvent;
    runAction: WorkspaceNodeRunActionEvent;
  }>();

  const savedColumnStates = getJsonCookie<ColumnState[]>(COLUMN_STATE_COOKIE_NAME) ?? [];

  let actionsMenuFocused: boolean = false;
  let columnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [];
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;
  let dataGrid: DataGrid<WorkspaceTreeNodeWithFullPath> | undefined = undefined;
  let hasEditPermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasCreateActionPermission: boolean = false;
  let hasReadOnlyNodes: boolean = false;
  let flattenedTree: WorkspaceTreeNodeWithFullPath[] = [];
  let expandedPaths: Set<string> = new Set();
  let nameColumnUserWidth: number | null = savedColumnStates.find(s => s.colId === 'name')?.width ?? null;
  let selectedItemIds: RowId[] = [];

  // Initialize column states from cookie, applying special processing for Name column to preserve user width if manually resized
  let columnStates: ColumnState[] = processNameColumnState(savedColumnStates);

  // Sort state - captured from AG Grid's sort UI, used to pre-sort data hierarchically
  type ColumnSort = { colId: string; direction: 'asc' | 'desc' };
  let sortState: ColumnSort[] = [{ colId: 'name', direction: 'asc' }];

  // Filter state for search bar
  let filterText: string = '';
  let matchingPaths: Set<string> = new Set();
  let ancestorPaths: Set<string> = new Set();

  // Breadcrumb segments derived from currentBreadcrumbPath
  $: breadcrumbSegments = currentBreadcrumbPath ? currentBreadcrumbPath.split(PATH_DELIMITER) : [];

  $: if (workspace) {
    hasEditPermission = featurePermissions.workspace.canUpdate(user, workspace);
    hasDeletePermission = featurePermissions.workspace.canDelete(user, workspace);
    hasCreateActionPermission = featurePermissions.actionRun.canCreate(user, workspace);
  }

  function formatTimeAgo(isoString: string | undefined): string {
    if (!isoString) {
      return '';
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) {
      return 'just now';
    }
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
      return `${diffHr}h ago`;
    }
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 30) {
      return `${diffDays}d ago`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}mo ago`;
    }
    return `${Math.floor(diffMonths / 12)}y ago`;
  }

  // Process Name column state: if the user has manually resized it, persist the
  // width (and clear flex); otherwise strip width & flex so the column def's flex:1 applies.
  function processNameColumnState(states: ColumnState[]): ColumnState[] {
    return states.map(state => {
      if (state.colId === 'name') {
        if (nameColumnUserWidth != null) {
          const { flex: _f, width: _w, ...rest } = state;
          return { ...rest, width: nameColumnUserWidth };
        }
        const { flex: _f, width: _w, ...rest } = state;
        return rest;
      }
      return state;
    });
  }

  function dateTimeCellRenderer(params: ICellRendererParams<WorkspaceTreeNodeWithFullPath>) {
    const value = params.valueFormatted ?? params.value;
    if (!value) {
      return '';
    }
    const span = document.createElement('span');
    span.textContent = formatTimeAgo(value);
    span.title = value;
    return span;
  }

  // Metadata column definitions (reusable for column picker)
  const metadataColumnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [
    {
      colId: 'lastEditedBy',
      comparator: () => 0,
      field: 'metadata.lastEditedBy',
      headerName: 'Last Editor',
      hide: false,
      minWidth: 60,
      resizable: true,
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressSizeToFit: true,
      valueGetter: params => params.data?.metadata?.lastEditedBy ?? '',
      width: 80,
    },
    {
      cellRenderer: dateTimeCellRenderer,
      colId: 'lastEditedAt',
      comparator: () => 0,
      field: 'metadata.lastEditedAt',
      headerName: 'Last Edited',
      hide: false,
      minWidth: 70,
      resizable: true,
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressSizeToFit: true,
      valueGetter: params => params.data?.metadata?.lastEditedAt ?? '',
      width: 84,
    },
    {
      colId: 'createdBy',
      comparator: () => 0,
      field: 'metadata.createdBy',
      headerName: 'Created By',
      hide: true,
      minWidth: 70,
      resizable: true,
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressSizeToFit: true,
      valueGetter: params => params.data?.metadata?.createdBy ?? '',
      width: 100,
    },
    {
      cellRenderer: dateTimeCellRenderer,
      colId: 'createdAt',
      comparator: () => 0,
      field: 'metadata.createdAt',
      headerName: 'Created',
      hide: true,
      minWidth: 70,
      resizable: true,
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressSizeToFit: true,
      valueGetter: params => params.data?.metadata?.createdAt ?? '',
      width: 80,
    },
    {
      cellDataType: 'boolean',
      colId: 'readOnly',
      comparator: () => 0,
      field: 'metadata.readOnly',
      headerName: 'Read-Only',
      hide: true,
      minWidth: 40,
      resizable: true,
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressSizeToFit: true,
      valueGetter: params => params.data?.metadata?.readOnly ?? '',
      width: 80,
    },
    {
      colId: 'user',
      comparator: () => 0,
      field: 'metadata.user',
      headerName: 'User Metadata',
      hide: true,
      minWidth: 70,
      resizable: true,
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressSizeToFit: true,
      valueGetter: params => {
        const userMeta = params.data?.metadata?.user;
        return userMeta ? JSON.stringify(userMeta) : '';
      },
      width: 120,
    },
  ];

  // Initialize column states — include Name first to preserve column order when applyOrder is true
  $: if (columnStates.length === 0 && metadataColumnDefs.length > 0) {
    columnStates = [
      { colId: 'name', hide: false },
      ...metadataColumnDefs.map(col => ({
        colId: (col.colId ?? col.field) as string,
        hide: col.hide ?? false,
      })),
    ];
  }

  $: columnDefs = [
    {
      cellClass: 'tree-cell-container',
      cellRenderer: (params: ICellRendererParams<WorkspaceTreeNodeWithFullPath>) => {
        const container = document.createElement('div');
        new TreeCell({
          props: {
            data: params.data,
            isExpanded: expandedPaths.has(params.data?.fullPath ?? ''),
            onToggleExpand: toggleExpand,
          },
          target: container,
        });
        return container;
      },
      // Use comparator that returns 0 to prevent AG Grid from reordering rows.
      // We handle sorting ourselves via sortWorkspaceTree to preserve hierarchy.
      comparator: () => 0,
      field: 'name',
      flex: 1,
      headerName: 'Name',
      minWidth: 150,
      resizable: true,
      sort: 'asc',
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressAutoSize: false,
    },
    ...metadataColumnDefs,
    {
      cellClass: 'action-cell-container action-cell-container-compact',
      cellRenderer: (params: WorkspaceTreeNodeCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            menuCallback: params.showMenu,
            menuTooltip: {
              content: 'More actions',
              placement: 'top',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        showMenu: onShowMenu,
        viewNode: onViewNode,
      } as CellRendererParams,
      headerName: '',
      minWidth: 28,
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 28,
    },
  ];

  // Get the contents to display based on current root path
  $: currentRootContents = (() => {
    if (!treeNode?.contents) {
      return [];
    }
    if (!currentBreadcrumbPath) {
      return treeNode.contents;
    }

    const rootNode = findNodeByPath(treeNode.contents, currentBreadcrumbPath);
    return rootNode?.contents ?? [];
  })();

  // Compute flattened tree with sorting from current root
  $: sortedTree = sortWorkspaceTree(currentRootContents, createSortComparator(sortState));

  $: flattenedTree = flattenWorkspaceTreeWithPaths(
    sortedTree,
    currentBreadcrumbPath ? currentBreadcrumbPath.split(PATH_DELIMITER) : [],
  );

  // When flattenedTree updates, redraw rows to update cell rendering
  $: if (dataGrid && flattenedTree) {
    scheduleRedraw();
  }

  // Update filter matching when filter text or tree changes
  $: {
    const result = computeTreeFilter(flattenedTree, filterText);
    matchingPaths = result.matchingPaths;
    ancestorPaths = result.ancestorPaths;

    // Auto-expand ancestors of matching nodes so they're visible
    if (result.ancestorPaths.size > 0) {
      expandedPaths = new Set([...expandedPaths, ...result.ancestorPaths]);
      scheduleRedraw();
    }
  }

  // Trigger AG Grid filter update when filter-related state changes
  $: if (dataGrid && (filterText !== undefined || matchingPaths || ancestorPaths || expandedPaths)) {
    dataGrid.onFilterChanged();
  }

  // Context menu computed values
  $: isContextNodeInSelection = contextMenuNode && selectedItemIds?.includes(contextMenuNode.fullPath);
  $: effectiveSelectedNodes = isContextNodeInSelection
    ? flattenedTree.filter(node => selectedItemIds.includes(node.fullPath))
    : contextMenuNode
      ? [contextMenuNode]
      : [];
  $: actionsForSelection = getAvailableActionsForNodes(actions, effectiveSelectedNodes);

  // Check if any of the effective selected nodes are read-only
  $: hasReadOnlyNodes = effectiveSelectedNodes.some(node => {
    // First check if the node itself is readonly
    if (node.metadata?.readOnly) {
      return true;
    }

    // If it's a folder, recursively check its contents
    if (node.type === WorkspaceContentType.Directory && treeNode) {
      const fullNode = findNodeByPath(treeNode?.contents ?? [], node.fullPath);

      if (fullNode) {
        return hasReadonlyInTree(fullNode);
      }
    }

    return false;
  });

  // Get all non-directory nodes that are either directly selected or descendants of selected directories
  $: nonDirectorySelectedNodes = flattenedTree.filter(node => {
    if (node.type === WorkspaceContentType.Directory) {
      return false;
    }
    return effectiveSelectedNodes.some(
      selected => node.fullPath === selected.fullPath || node.fullPath.startsWith(selected.fullPath + PATH_DELIMITER),
    );
  });
  $: effectiveActionFilePaths = nonDirectorySelectedNodes.map(n => n.fullPath);
  $: tertiaryHighlightPaths = actionsForSelection.length > 0 ? nonDirectorySelectedNodes.map(n => n.fullPath) : [];

  // Debounced redraw to avoid multiple redraws in same tick
  let redrawScheduled = false;
  async function scheduleRedraw() {
    if (redrawScheduled) {
      return;
    }
    redrawScheduled = true;
    await tick();
    dataGrid?.redrawRows();
    redrawScheduled = false;
  }

  // Create hierarchy-preserving sort comparator based on current sort state
  function createSortComparator(sorts: ColumnSort[]): TreeSortComparator {
    return (a: WorkspaceTreeNode, b: WorkspaceTreeNode) => {
      // Always sort directories first
      const aIsDir = a.type === WorkspaceContentType.Directory;
      const bIsDir = b.type === WorkspaceContentType.Directory;
      if (aIsDir && !bIsDir) {
        return -1;
      }
      if (!aIsDir && bIsDir) {
        return 1;
      }

      // Apply each sort criterion in order
      for (const { colId, direction } of sorts) {
        const multiplier = direction === 'desc' ? -1 : 1;
        let comparison = 0;

        if (colId === 'name') {
          const aName = a.name?.toLowerCase() ?? '';
          const bName = b.name?.toLowerCase() ?? '';
          comparison = aName.localeCompare(bName);
        } else if (colId === 'fullPath') {
          const aPath = a.name?.toLowerCase() ?? '';
          const bPath = b.name?.toLowerCase() ?? '';
          comparison = aPath.localeCompare(bPath);
        } else if (colId === 'type') {
          comparison = (a.type ?? '').localeCompare(b.type ?? '');
        } else if (colId === 'user') {
          const aVal = a.metadata?.user ? JSON.stringify(a.metadata.user) : '';
          const bVal = b.metadata?.user ? JSON.stringify(b.metadata.user) : '';
          comparison = aVal.localeCompare(bVal);
        } else {
          // Generic metadata field sorting (lastEditedBy, lastEditedAt, createdBy, etc.)
          const metadataKey = colId as keyof WorkspaceFileMetadata;
          const aVal = String(a.metadata?.[metadataKey] ?? '');
          const bVal = String(b.metadata?.[metadataKey] ?? '');
          comparison = aVal.localeCompare(bVal);
        }
        if (comparison !== 0) {
          return multiplier * comparison;
        }
      }

      return 0;
    };
  }

  function toggleExpand(path: string) {
    if (expandedPaths.has(path)) {
      // Collapse: remove this path and all descendant paths
      const newExpanded = new Set<string>();
      for (const p of expandedPaths) {
        if (p !== path && !p.startsWith(path + PATH_DELIMITER)) {
          newExpanded.add(p);
        }
      }
      expandedPaths = newExpanded;
    } else {
      // Expand: add this path
      expandedPaths = new Set([...expandedPaths, path]);
    }
    // Trigger redraw to update chevron icons
    dataGrid?.redrawRows();
  }

  function expandToPath(targetPath: string) {
    const pathParts = targetPath.split(PATH_DELIMITER);
    const newExpanded = new Set(expandedPaths);

    for (let i = 1; i < pathParts.length; i++) {
      const ancestorPath = pathParts.slice(0, i).join(PATH_DELIMITER);
      newExpanded.add(ancestorPath);
    }

    expandedPaths = newExpanded;
    dataGrid?.redrawRows();
  }

  function doesExternalFilterPass(node: IRowNode<WorkspaceTreeNodeWithFullPath>) {
    const fullFilePath = node.data?.fullPath ?? '';
    const depth = node.data?.depth ?? 0;

    return shouldNodeBeVisible(
      fullFilePath,
      depth,
      filterText,
      matchingPaths,
      ancestorPaths,
      expandedPaths,
      currentBreadcrumbPath,
    );
  }

  function onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    filterText = target.value;
  }

  function onViewNode(node: WorkspaceTreeNodeWithFullPath) {
    if (node.type === WorkspaceContentType.Directory || node.type === WorkspaceContentType.Workspace) {
      navigateToFolder(node.fullPath);
    }
  }

  function onShowMenu(node: WorkspaceTreeNodeWithFullPath, event: MouseEvent) {
    contextMenuNode = node;
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const syntheticEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: rect.right,
      clientY: rect.top,
    });
    dataGrid?.showContextMenu(syntheticEvent, node.fullPath);
  }

  function onContextMenu(event: CustomEvent<CellContextMenuEvent<WorkspaceTreeNodeWithFullPath, unknown>>) {
    contextMenuNode = event.detail.data ?? null;
  }

  function onContextMenuHide() {
    contextMenuNode = null;
  }

  function onRowDoubleClicked(event: CustomEvent<DataGridRowDoubleClick<WorkspaceTreeNodeWithFullPath>>) {
    const row = event.detail;
    const node = row.data;

    if (node.type === WorkspaceContentType.Directory) {
      navigateToFolder(node.fullPath);
    }
  }

  function navigateToFolder(path: string) {
    currentBreadcrumbPath = path;
    expandedPaths = new Set();
  }

  function navigateToBreadcrumb(index: number) {
    if (index < 0) {
      currentBreadcrumbPath = '';
    } else {
      const newPath = breadcrumbSegments.slice(0, index + 1).join(PATH_DELIMITER);
      currentBreadcrumbPath = newPath;
    }
    expandedPaths = new Set();
  }

  function handleNavigateToRoot() {
    navigateToBreadcrumb(-1);
  }

  function onDeleteNodes(nodes: WorkspaceTreeNodeWithFullPath[]) {
    dispatch('deleteNodes', { treeNodes: nodes });
  }

  function onDownload(nodes: WorkspaceTreeNodeWithFullPath[]) {
    dispatch('download', { treeNodes: nodes });
  }

  function onMoveNodes(nodes: WorkspaceTreeNodeWithFullPath[]) {
    dispatch('moveNodes', { hasReadOnlyNodes, treeNodes: nodes });
  }

  function onRenameNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('renameNode', { treeNode: node, treeNodePath: node.fullPath });
  }

  function onNewFolder(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath)?.fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newFolder', targetPath);
  }

  function onNewFile(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath)?.fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newFile', targetPath);
  }

  function onImportFile(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath)?.fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('importFile', targetPath);
  }

  function onOpenInNewTab(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('openInNewTab', node?.fullPath ?? '');
  }

  function onCopyFileLocation(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('copyFileLocation', node?.fullPath ?? '');
  }

  function onCopyFullPath(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('copyFullPath', node?.fullPath ?? '');
  }

  function onMoveNodesToWorkspace(nodes: WorkspaceTreeNodeWithFullPath[]) {
    dispatch('moveNodesToWorkspace', { hasReadOnlyNodes, treeNodes: nodes });
  }

  function onContextMenuRunAction(event: CustomEvent<ActionParameterPair>, filePaths: RowId[]) {
    const actionParameterPair = event.detail;
    const selectedTreeNodes: WorkspaceTreeNodeWithFullPath[] = flattenedTree.filter(({ fullPath }) =>
      filePaths.includes(fullPath),
    );
    dispatch('runAction', { actionParameterPair, treeNodes: selectedTreeNodes });
  }

  function onActionsMenuFocused(event: CustomEvent<boolean>) {
    actionsMenuFocused = event.detail;
  }

  function saveColumnStateToCookie() {
    if (columnStates && columnStates.length > 0) {
      setJsonCookie(COLUMN_STATE_COOKIE_NAME, columnStates);
    }
  }

  function updateColumnState(updatedColumnStates?: ColumnState[]) {
    const columnStatesToUpdate = updatedColumnStates ?? dataGrid?.getColumnState();
    if (columnStatesToUpdate) {
      columnStates = processNameColumnState(columnStatesToUpdate);
      saveColumnStateToCookie();
    }
  }

  function onColumnMoved() {
    updateColumnState();
  }

  function onColumnPinned() {
    updateColumnState();
  }

  function onColumnResized(event: CustomEvent<ColumnResizedEvent>) {
    const { columns, finished, source } = event.detail;
    if ((source === 'uiColumnResized' || source === 'sizeColumnsToFit') && finished) {
      if (source === 'uiColumnResized' && columns) {
        const nameColumn = columns.find(col => col.getColId() === 'name');
        if (nameColumn) {
          nameColumnUserWidth = nameColumn.getActualWidth();
        }
      }
      updateColumnState();
    }
  }

  async function onColumnsChanged({
    detail: { columns },
  }: CustomEvent<{ columns: { field: any; isHidden: boolean; name: string }[] }>) {
    const currentColumnStates = dataGrid?.getColumnState() ?? [];
    const updatedColumnStates = currentColumnStates.map(state => ({
      ...state,
      hide: columns.find(col => col.field === state.colId)?.isHidden ?? state.hide,
    }));
    updateColumnState(updatedColumnStates);

    await tick();
    dataGrid?.sizeColumnsToFit();
  }

  function onSortChanged() {
    updateColumnState();

    const sortedColumns = columnStates
      .filter(col => col.sort != null)
      .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      .map(col => ({ colId: col.colId, direction: col.sort as 'asc' | 'desc' }));

    if (sortedColumns.length > 0) {
      sortState = sortedColumns;
    }
  }

  async function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    const currentColumnStates = dataGrid?.getColumnState() ?? [];
    const updatedColumnStates = currentColumnStates.map(state => (state.colId === 'name' ? state : { ...state, hide }));

    updateColumnState(updatedColumnStates);

    await tick();
    dataGrid?.sizeColumnsToFit();
  }

  function onResetColumns() {
    nameColumnUserWidth = null;
    deleteCookie(COLUMN_STATE_COOKIE_NAME);
    columnStates = [
      { colId: 'name', hide: false },
      ...metadataColumnDefs.map(col => ({
        colId: (col.colId ?? col.field) as string,
        hide: col.hide ?? false,
      })),
    ];
    sortState = [{ colId: 'name', direction: 'asc' }];
  }

  function onResetColumnsFromMenu() {
    dataGrid?.resetColumns();
  }

  $: if (selectedTreeNodePath) {
    expandToPath(selectedTreeNodePath);
  }

  onMount(() => {
    if (selectedTreeNodePath) {
      expandToPath(selectedTreeNodePath);
    }
  });
</script>

<div class="grid h-full grid-rows-[auto_auto_1fr]">
  <ResponsiveBreadcrumb
    rootLabel={workspace ? workspace.name : 'Loading...'}
    currentPath={currentBreadcrumbPath}
    isAtRoot={currentBreadcrumbPath === ''}
    onNavigateToRoot={handleNavigateToRoot}
    onNavigateToSegment={navigateToBreadcrumb}
  />
  <div class="flex items-center gap-2 border-b border-border p-2">
    <Search size={14} />
    <Input
      type="text"
      placeholder="Search files and folders..."
      value={filterText}
      on:input={onSearchInput}
      sizeVariant="xs"
      class="flex-1"
    />
    <ActivityTableMenu
      columnDefs={metadataColumnDefs}
      {columnStates}
      on:columns-changed={onColumnsChanged}
      on:reset-columns={onResetColumnsFromMenu}
      on:show-hide-all-columns={onShowHideAllColumns}
    />
  </div>
  <BulkActionDataGrid
    autoSizeColumnsToFit={false}
    bind:dataGrid
    bind:selectedItemId={selectedTreeNodePath}
    bind:selectedItemIds
    tertiaryHighlightIds={actionsMenuFocused ? tertiaryHighlightPaths : null}
    noRowsOverlayText={(treeNode?.contents || []).length < 1 && !currentBreadcrumbPath
      ? 'Workspace is Empty'
      : currentRootContents.length < 1
        ? 'Folder is Empty'
        : 'No Matching Files or Folders'}
    headerHeight={26}
    rowHeight={26}
    class="workspace-file-browser"
    {columnDefs}
    {columnStates}
    columnShiftResize
    getRowId={node => node.fullPath}
    {hasDeletePermission}
    singleItemDisplayText="File"
    pluralItemDisplayText="Files"
    items={flattenedTree}
    {user}
    suppressContextMenuSelection={true}
    suppressRowClickSelection={false}
    isExternalFilterPresent={() => true}
    showDeleteMenu={false}
    {doesExternalFilterPass}
    on:columnMoved={onColumnMoved}
    on:columnPinned={onColumnPinned}
    on:columnResized={onColumnResized}
    on:resetColumns={onResetColumns}
    on:rowDoubleClicked={onRowDoubleClicked}
    on:cellContextMenu={onContextMenu}
    on:cellContextMenuHide={onContextMenuHide}
    on:sortChanged={onSortChanged}
  >
    <svelte:fragment slot="context-menu">
      <WorkspaceContextMenuContents
        {actionsForSelection}
        selectedWorkspaceNodes={effectiveSelectedNodes}
        {hasEditPermission}
        {hasDeletePermission}
        {hasCreateActionPermission}
        {hasReadOnlyNodes}
        on:actionsMenuFocused={onActionsMenuFocused}
        on:rename={() => contextMenuNode && onRenameNode(contextMenuNode)}
        on:move={() => onMoveNodes(effectiveSelectedNodes)}
        on:delete={() => onDeleteNodes(effectiveSelectedNodes)}
        on:download={() => onDownload(effectiveSelectedNodes)}
        on:copyFileLocation={() => contextMenuNode && onCopyFileLocation(contextMenuNode)}
        on:copyFullPath={() => contextMenuNode && onCopyFullPath(contextMenuNode)}
        on:moveToWorkspace={() => onMoveNodesToWorkspace(effectiveSelectedNodes)}
        on:runAction={event => onContextMenuRunAction(event, effectiveActionFilePaths)}
        on:newFile={() => contextMenuNode && onNewFile(contextMenuNode)}
        on:newFolder={() => contextMenuNode && onNewFolder(contextMenuNode)}
        on:importFile={() => contextMenuNode && onImportFile(contextMenuNode)}
        on:openFolder={() => contextMenuNode && navigateToFolder(contextMenuNode.fullPath)}
        on:openInNewTab={() => contextMenuNode && onOpenInNewTab(contextMenuNode)}
      />
    </svelte:fragment>
  </BulkActionDataGrid>
</div>

<style>
  :global(.workspace-file-browser .ag-root-wrapper) {
    --ag-borders: none;
    --ag-wrapper-border-radius: 0;
    --ag-cell-horizontal-padding: calc(var(--ag-grid-size) * 2);
    --ag-icon-size: 14px;
  }
</style>
