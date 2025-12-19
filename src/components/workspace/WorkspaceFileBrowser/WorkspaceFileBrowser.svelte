<svelte:options immutable={true} />

<script lang="ts">
  import { Input } from '@nasa-jpl/stellar-svelte';
  import type { CellContextMenuEvent, ICellRendererParams, IRowNode, SortChangedEvent } from 'ag-grid-community';
  import { Search } from 'lucide-svelte';
  import { createEventDispatcher, onMount, tick } from 'svelte';
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
  } from '../../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import { featurePermissions } from '../../../utilities/permissions';
  import {
    computeTreeFilter,
    findNodeByPath,
    flattenWorkspaceTreeWithPaths,
    getAvailableActionsForNodes,
    shouldNodeBeVisible,
    sortWorkspaceTree,
    type TreeSortComparator,
  } from '../../../utilities/workspaces';
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
    deleteNode: (node: WorkspaceTreeNodeWithFullPath) => void;
    showMenu: (node: WorkspaceTreeNodeWithFullPath, event: MouseEvent) => void;
    viewNode: (node: WorkspaceTreeNodeWithFullPath) => void;
  };
  type WorkspaceTreeNodeCellRendererParams = ICellRendererParams<WorkspaceTreeNodeWithFullPath> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    copyFileLocation: string;
    copyFullPath: string;
    importFile: string;
    moveToWorkspace: string;
    newFolder: string;
    newSequence: string;
    nodeDelete: WorkspaceNodeEvent;
    nodeDownload: WorkspaceNodeEvent;
    nodeMove: WorkspaceNodeEvent;
    nodeRename: WorkspaceNodeEvent;
    openInNewTab: string;
    runAction: WorkspaceNodeRunActionEvent;
  }>();

  let actionsMenuFocused: boolean = false;
  let columnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [];
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;
  let dataGrid: DataGrid<WorkspaceTreeNodeWithFullPath> | undefined = undefined;
  let hasEditPermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasCreateActionPermission: boolean = false;
  let flattenedTree: WorkspaceTreeNodeWithFullPath[] = [];
  let expandedPaths: Set<string> = new Set();
  let selectedItemIds: RowId[] = [];

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
      headerName: 'Name',
      minWidth: 200,
      resizable: true,
      sort: 'asc',
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressAutoSize: false,
      suppressSizeToFit: false,
    },
    {
      cellClass: 'action-cell-container action-cell-container-compact',
      cellRenderer: (params: WorkspaceTreeNodeCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteNode,
            deleteTooltip: {
              content: 'Delete',
              placement: 'top',
            },
            hasDeletePermission,
            menuCallback: params.showMenu,
            menuTooltip: {
              content: 'More actions',
              placement: 'top',
            },
            rowData: params.data,
            viewCallback:
              params.data?.type === WorkspaceContentType.Directory ||
              params.data?.type === WorkspaceContentType.Workspace
                ? data => user && params.viewNode(data)
                : undefined,
            viewTooltip: {
              content: 'Open',
              placement: 'top',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteNode: onDeleteNode,
        showMenu: onShowMenu,
        viewNode: onViewNode,
      } as CellRendererParams,
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 74,
    },
  ];

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
        }
        if (comparison !== 0) {
          return multiplier * comparison;
        }
      }

      return 0;
    };
  }

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

  function onSortChanged(event: CustomEvent<SortChangedEvent<WorkspaceTreeNodeWithFullPath>>) {
    const columnState = event.detail.api.getColumnState();

    const sortedColumns = columnState
      .filter(col => col.sort != null)
      .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      .map(col => ({ colId: col.colId, direction: col.sort as 'asc' | 'desc' }));

    if (sortedColumns.length > 0) {
      sortState = sortedColumns;
    }
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
    selectedTreeNodePath = node.fullPath;
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const syntheticEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: rect.right,
      clientY: rect.top,
    });
    dataGrid?.showContextMenu(syntheticEvent);
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

  function onDeleteNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeDelete', {
      toggleState: true,
      treeNode: node,
      treeNodePath: node.fullPath,
    });
  }

  function onDownloadNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeDownload', {
      treeNode: node,
      treeNodePath: node.fullPath,
    });
  }

  function onMoveNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeMove', {
      toggleState: true,
      treeNode: node,
      treeNodePath: node.fullPath,
    });
  }

  function onRenameNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeRename', {
      toggleState: true,
      treeNode: node,
      treeNodePath: node.fullPath,
    });
  }

  function onNewFolder(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath)?.fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newFolder', targetPath);
  }

  function onNewSequence(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath)?.fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newSequence', targetPath);
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

  function onMoveToWorkspace(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('moveToWorkspace', node?.fullPath ?? '');
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
  <div class="flex items-center gap-2 border-b border-[color:var(--st-gray-20,#e0e0e0)] p-2">
    <Search size={14} />
    <Input
      type="text"
      placeholder="Search files and folders..."
      value={filterText}
      on:input={onSearchInput}
      sizeVariant="xs"
      class="flex-1"
    />
  </div>
  <BulkActionDataGrid
    bind:dataGrid
    bind:selectedItemId={selectedTreeNodePath}
    bind:selectedItemIds
    tertiaryHighlightIds={actionsMenuFocused ? tertiaryHighlightPaths : null}
    noRowsOverlayText={flattenedTree.length < 1 ? 'Workspace is Empty' : 'No Matching Files or Folders'}
    headerHeight={26}
    rowHeight={26}
    class="workspace-file-browser"
    {columnDefs}
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
        on:actionsMenuFocused={onActionsMenuFocused}
        on:rename={() => contextMenuNode && onRenameNode(contextMenuNode)}
        on:move={() => contextMenuNode && onMoveNode(contextMenuNode)}
        on:delete={() => contextMenuNode && onDeleteNode(contextMenuNode)}
        on:download={() => contextMenuNode && onDownloadNode(contextMenuNode)}
        on:copyFileLocation={() => contextMenuNode && onCopyFileLocation(contextMenuNode)}
        on:copyFullPath={() => contextMenuNode && onCopyFullPath(contextMenuNode)}
        on:moveToWorkspace={() => contextMenuNode && onMoveToWorkspace(contextMenuNode)}
        on:runAction={event => onContextMenuRunAction(event, effectiveActionFilePaths)}
        on:newFile={() => contextMenuNode && onNewSequence(contextMenuNode)}
        on:newFolder={() => contextMenuNode && onNewFolder(contextMenuNode)}
        on:importFile={() => contextMenuNode && onImportFile(contextMenuNode)}
        on:openInNewTab={() => contextMenuNode && onOpenInNewTab(contextMenuNode)}
      />
    </svelte:fragment>
  </BulkActionDataGrid>
</div>

<style>
  :global(.workspace-file-browser .ag-root-wrapper) {
    --ag-borders: none;
    --ag-wrapper-border-radius: 0;
  }
</style>
