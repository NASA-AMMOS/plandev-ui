<svelte:options immutable={true} />

<script lang="ts">
  import { Breadcrumb, DropdownMenu, Input } from '@nasa-jpl/stellar-svelte';
  import type { CellContextMenuEvent, ICellRendererParams, IRowNode, SortChangedEvent } from 'ag-grid-community';
  import { ChevronDown, ChevronRight, Ellipsis, Search } from 'lucide-svelte';
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
    findNodeByPath,
    flattenWorkspaceTreeWithPaths,
    getAvailableActionsForNodes,
    sortWorkspaceTree,
    type TreeSortComparator,
  } from '../../../utilities/workspaces';
  import BulkActionDataGrid from '../../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import WorkspaceContextMenuContents from '../WorkspaceContextMenuContents.svelte';
  import WorkspaceTreeViewIcon from '../WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';

  export let actions: ActionDefinition[] = [];
  export let currentRootPath: string = '';
  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
  export let workspace: Workspace | null | undefined = null;
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
    nodeMove: WorkspaceNodeEvent;
    nodeRename: WorkspaceNodeEvent;
    openInNewTab: string;
    runAction: WorkspaceNodeRunActionEvent;
  }>();

  const INDENT_SIZE = 12; // pixels per depth level

  let columnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [];
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;
  let dataGrid: DataGrid<WorkspaceTreeNodeWithFullPath> | undefined = undefined;
  let hasEditPermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasCreateActionPermission: boolean = false;
  let flattenedTree: WorkspaceTreeNodeWithFullPath[] = [];
  let expandedPaths: Set<string> = new Set();

  // Sort state - captured from AG Grid's sort UI, used to pre-sort data hierarchically
  // Supports multi-column sorting (Shift+click headers in AG Grid)
  type ColumnSort = { colId: string; direction: 'asc' | 'desc' };
  let sortState: ColumnSort[] = [{ colId: 'name', direction: 'asc' }];

  // Filter state for search bar - works alongside AG Grid's column filter
  let filterText: string = '';
  let matchingPaths: Set<string> = new Set();
  let ancestorPaths: Set<string> = new Set();

  // Breadcrumb segments derived from currentRootPath
  $: breadcrumbSegments = currentRootPath ? currentRootPath.split(PATH_DELIMITER) : [];

  // Responsive breadcrumb state
  let breadcrumbContainer: HTMLOListElement | undefined = undefined;
  let breadcrumbWrapper: HTMLDivElement | undefined = undefined;
  let maxVisibleSegments: number = Infinity;
  let resizeObserver: ResizeObserver | null = null;

  // Compute which segments to show vs collapse
  // When maxVisibleSegments is finite and less than total segments, we need to collapse some
  $: needsCollapsing = maxVisibleSegments !== Infinity && breadcrumbSegments.length > maxVisibleSegments;
  $: collapsedSegments = needsCollapsing ? breadcrumbSegments.slice(0, -maxVisibleSegments) : [];
  $: visibleSegments = needsCollapsing ? breadcrumbSegments.slice(-maxVisibleSegments) : breadcrumbSegments;
  $: visibleStartIndex = breadcrumbSegments.length - visibleSegments.length;

  function measureBreadcrumbs() {
    if (!breadcrumbWrapper) {
      return;
    }

    const containerWidth = breadcrumbWrapper.clientWidth - 12; // account for padding
    const items = breadcrumbWrapper.querySelectorAll('.breadcrumb-item-measure');

    if (items.length === 0) {
      return;
    }

    // Measure actual separator width from the DOM if available, or use default
    const separatorWidth = 22; // approximate: ">" character + gaps

    // Calculate total width needed for all items
    const itemWidths: number[] = [];
    items.forEach(item => {
      itemWidths.push((item as HTMLElement).offsetWidth);
    });

    // Total width = sum of items + separators between them
    const totalWidth = itemWidths.reduce((sum, w) => sum + w, 0) + (itemWidths.length - 1) * separatorWidth;

    // If everything fits, show all
    if (totalWidth <= containerWidth) {
      maxVisibleSegments = Infinity;
      return;
    }

    // We need to collapse some segments. Calculate how many we can show from the end.
    // Layout will be: [root] / [...] / [visible segments]
    const rootWidth = itemWidths[0];
    const ellipsisWidth = 30; // ellipsis button width

    // Available space after root + ellipsis + their separators
    const reservedWidth = rootWidth + separatorWidth + ellipsisWidth + separatorWidth;
    let availableWidth = containerWidth - reservedWidth;

    // Count how many segments from the end can fit
    let count = 0;
    for (let i = itemWidths.length - 1; i > 0; i--) {
      // Each segment needs its width + separator (except we already counted one separator in reserved)
      const segmentWidth = itemWidths[i] + (count > 0 ? separatorWidth : 0);
      if (availableWidth >= segmentWidth) {
        availableWidth -= segmentWidth;
        count++;
      } else {
        break;
      }
    }

    // Always show at least the last segment, even if it overflows (CSS will truncate with ellipsis)
    maxVisibleSegments = Math.max(1, count);
  }

  function setupResizeObserver() {
    if (breadcrumbWrapper && !resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        // Reset to measure all, then recalculate
        maxVisibleSegments = Infinity;
        tick().then(measureBreadcrumbs);
      });
      resizeObserver.observe(breadcrumbWrapper);
    }
  }

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
        container.className = 'tree-cell';
        container.style.paddingLeft = `${(params.data?.depth ?? 0) * INDENT_SIZE}px`;

        // Add expand/collapse chevron for folders with children
        const chevronContainer = document.createElement('span');
        chevronContainer.className = 'tree-chevron';

        if (params.data?.hasChildren) {
          const isExpanded = expandedPaths.has(params.data.fullPath);
          chevronContainer.style.cursor = 'pointer';

          // Create Svelte chevron component
          const ChevronComponent = isExpanded ? ChevronDown : ChevronRight;
          new ChevronComponent({
            props: { size: 14 },
            target: chevronContainer,
          });

          chevronContainer.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            if (params.data) {
              toggleExpand(params.data.fullPath);
            }
          };
        }
        container.appendChild(chevronContainer);

        // Add icon
        const iconContainer = document.createElement('div');
        iconContainer.className = 'tree-icon';
        new WorkspaceTreeViewIcon({
          props: {
            size: 14,
            toggleState: params.data?.hasChildren && expandedPaths.has(params.data?.fullPath ?? ''),
            treeNode: params.data,
          },
          target: iconContainer,
        });
        container.appendChild(iconContainer);

        // Add name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tree-name';
        nameSpan.textContent = params.data?.name ?? '';
        container.appendChild(nameSpan);

        return container;
      },
      // Use comparator that returns 0 to prevent AG Grid from reordering rows.
      // We handle sorting ourselves via sortWorkspaceTree to preserve hierarchy.
      comparator: () => 0,
      field: 'name',
      headerName: 'Name',
      resizable: true,
      sort: 'asc',
      sortable: true,
      sortingOrder: ['asc', 'desc'],
      suppressAutoSize: false,
      suppressSizeToFit: false,
    },
    // {
    //   // Use comparator that returns 0 to prevent AG Grid from reordering rows.
    //   // We handle sorting ourselves via sortWorkspaceTree to preserve hierarchy.
    //   comparator: () => 0,
    //   field: 'type',
    //   filter: 'number',
    //   headerName: 'Type',
    //   resizable: true,
    //   sortable: true,
    //   suppressAutoSize: true,
    //   suppressSizeToFit: true,
    //   width: 100,
    // },
    // {
    //   // Use comparator that returns 0 to prevent AG Grid from reordering rows.
    //   // We handle sorting ourselves via sortWorkspaceTree to preserve hierarchy.
    //   comparator: () => 0,
    //   field: 'fullPath',
    //   filter: 'number',
    //   headerName: 'Full Path',
    //   resizable: true,
    //   sortable: true,
    //   suppressAutoSize: true,
    //   suppressSizeToFit: true,
    //   width: 160,
    // },
    {
      cellClass: 'action-cell-container',
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
      width: 80,
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
          // For siblings (same parent), fullPath differs only by name, so compare by name
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
    if (!currentRootPath) {
      return treeNode.contents;
    }

    const rootNode = findNodeByPath(treeNode.contents, currentRootPath);
    return rootNode?.contents ?? [];
  })();

  // Compute flattened tree with sorting from current root
  $: sortedTree = sortWorkspaceTree(currentRootContents, createSortComparator(sortState));

  $: flattenedTree = flattenWorkspaceTreeWithPaths(
    sortedTree,
    currentRootPath ? currentRootPath.split(PATH_DELIMITER) : [],
  );

  // When flattenedTree updates (e.g., after navigation), redraw rows to update cell rendering (indentation)
  $: if (dataGrid && flattenedTree) {
    // Use tick to ensure AG Grid has received the new data before redrawing
    tick().then(() => dataGrid?.redrawRows());
  }

  // Update filter matching when filter text or tree changes
  $: {
    if (filterText && flattenedTree.length > 0) {
      const lowerFilter = filterText.toLowerCase();
      const newMatchingPaths = new Set<string>();
      const newAncestorPaths = new Set<string>();

      for (const node of flattenedTree) {
        const name = node.name?.toLowerCase() ?? '';
        if (name.includes(lowerFilter)) {
          newMatchingPaths.add(node.fullPath);

          // Add all ancestors to keep them visible
          const pathParts = node.fullPath.split(PATH_DELIMITER);
          for (let i = 1; i < pathParts.length; i++) {
            const ancestorPath = pathParts.slice(0, i).join(PATH_DELIMITER);
            newAncestorPaths.add(ancestorPath);
          }
        }
      }

      matchingPaths = newMatchingPaths;
      ancestorPaths = newAncestorPaths;

      // Auto-expand ancestors of matching nodes so they're visible
      if (newAncestorPaths.size > 0) {
        expandedPaths = new Set([...expandedPaths, ...newAncestorPaths]);
      }
    } else {
      matchingPaths = new Set();
      ancestorPaths = new Set();
    }
  }

  // Trigger AG Grid filter update when filter-related state changes
  $: if (dataGrid && (filterText !== undefined || matchingPaths || ancestorPaths || expandedPaths)) {
    dataGrid.onFilterChanged();
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
    // Expand all ancestor folders to make the target visible
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

    // If filtering is active, check if this node should be visible
    if (filterText) {
      const isMatch = matchingPaths.has(fullFilePath);
      const isAncestorOfMatch = ancestorPaths.has(fullFilePath);

      // Show only if: directly matches OR is an ancestor of a match
      if (!isMatch && !isAncestorOfMatch) {
        return false;
      }
    }

    // Root level items (depth 0) are always visible (if they pass filter)
    if (depth === 0) {
      return true;
    }

    // Check that all ancestor folders (within current view) are expanded
    // Skip checking ancestors that are part of currentRootPath since they're above the current view
    const currentRootDepth = currentRootPath ? currentRootPath.split(PATH_DELIMITER).length : 0;
    const pathParts = fullFilePath.split(PATH_DELIMITER);

    // Start checking from the first folder after currentRootPath
    for (let i = currentRootDepth + 1; i < pathParts.length; i++) {
      const ancestorPath = pathParts.slice(0, i).join(PATH_DELIMITER);
      if (!expandedPaths.has(ancestorPath)) {
        return false;
      }
    }

    return true;
  }

  function onSortChanged(event: CustomEvent<SortChangedEvent<WorkspaceTreeNodeWithFullPath>>) {
    const columnState = event.detail.api.getColumnState();

    // Get all sorted columns, ordered by sortIndex
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
    // Position the context menu below the button
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const syntheticEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: rect.right,
      clientY: rect.top,
    });
    dataGrid?.showContextMenu(syntheticEvent);
  }

  function onContextMenu(event: CustomEvent<CellContextMenuEvent<WorkspaceTreeNodeWithFullPath, any>>) {
    contextMenuNode = event.detail.data ?? null;
  }

  function onContextMenuHide() {
    contextMenuNode = null;
  }

  function onRowDoubleClicked(event: CustomEvent<DataGridRowDoubleClick<WorkspaceTreeNodeWithFullPath>>) {
    const row = event.detail;
    const node = row.data;

    if (node.type === WorkspaceContentType.Directory) {
      // Navigate into the folder (set as new root)
      navigateToFolder(node.fullPath);
    }
  }

  function navigateToFolder(path: string) {
    currentRootPath = path;
    // Reset expanded paths when navigating to a new root
    expandedPaths = new Set();
  }

  function navigateToBreadcrumb(index: number) {
    if (index < 0) {
      // Navigate to workspace root
      currentRootPath = '';
    } else {
      // Navigate to the folder at the given breadcrumb index
      const newPath = breadcrumbSegments.slice(0, index + 1).join(PATH_DELIMITER);
      currentRootPath = newPath;
    }
    expandedPaths = new Set();
  }

  function onDeleteNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeDelete', {
      toggleState: true,
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
    let targetPath = node?.fullPath ?? '';
    dispatch('openInNewTab', targetPath);
  }

  function onCopyFileLocation(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node?.fullPath ?? '';
    dispatch('copyFileLocation', targetPath);
  }

  function onCopyFullPath(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node?.fullPath ?? '';
    dispatch('copyFullPath', targetPath);
  }

  function onMoveToWorkspace(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node?.fullPath ?? '';
    dispatch('moveToWorkspace', targetPath);
  }

  function onTableMenuRenameNode() {
    if (contextMenuNode) {
      onRenameNode(contextMenuNode);
    }
  }

  function onTableMenuMoveNode() {
    if (contextMenuNode) {
      onMoveNode(contextMenuNode);
    }
  }

  function onTableNewFolder() {
    if (contextMenuNode) {
      onNewFolder(contextMenuNode);
    }
  }

  function onTableNewSequence() {
    if (contextMenuNode) {
      onNewSequence(contextMenuNode);
    }
  }

  function onTableImportFile() {
    if (contextMenuNode) {
      onImportFile(contextMenuNode);
    }
  }

  function onTableOpenInNewTab() {
    if (contextMenuNode) {
      onOpenInNewTab(contextMenuNode);
    }
  }

  function onTableCopyFileLocation() {
    if (contextMenuNode) {
      onCopyFileLocation(contextMenuNode);
    }
  }

  function onTableCopyFullPath() {
    if (contextMenuNode) {
      onCopyFullPath(contextMenuNode);
    }
  }

  function onTableMoveToWorkspace() {
    if (contextMenuNode) {
      onMoveToWorkspace(contextMenuNode);
    }
  }

  function onTableDeleteNode() {
    if (contextMenuNode) {
      onDeleteNode(contextMenuNode);
    }
  }

  function onTableRunAction(event: CustomEvent<ActionParameterPair>, filePaths: RowId[]) {
    const actionParameterPair = event.detail;
    const selectedTreeNodes: WorkspaceTreeNodeWithFullPath[] = flattenedTree.filter(({ fullPath }) =>
      filePaths.includes(fullPath),
    );
    dispatch('runAction', { actionParameterPair, treeNodes: selectedTreeNodes });
  }

  onMount(() => {
    // If a file is selected, expand to show it
    if (selectedTreeNodePath) {
      expandToPath(selectedTreeNodePath);
    }

    // Set up breadcrumb resize observer
    setupResizeObserver();

    return () => {
      // Clean up resize observer on unmount
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    };
  });

  // Re-measure breadcrumbs when segments change
  $: if (breadcrumbWrapper && breadcrumbSegments) {
    tick().then(measureBreadcrumbs);
  }
</script>

<div class="workspace-grid-container">
  <div class="breadcrumb-wrapper" bind:this={breadcrumbWrapper}>
    <!-- Hidden measurement container - renders all items to measure their widths -->
    <div class="breadcrumb-measure-container text-xs" aria-hidden="true">
      <span class="breadcrumb-item-measure px-1">{workspace ? workspace.name : 'Loading...'}</span>
      {#each breadcrumbSegments as segment}
        <span class="breadcrumb-item-measure px-1">{segment}</span>
      {/each}
    </div>

    <Breadcrumb.Root>
      <Breadcrumb.List class="breadcrumbs gap-1 text-xs sm:gap-1" bind:el={breadcrumbContainer}>
        <!-- Root workspace item - always visible -->
        <Breadcrumb.Item>
          {#if currentRootPath === ''}
            <Breadcrumb.Page>
              <div class="px-1 py-0.5">
                {workspace ? workspace.name : 'Loading...'}
              </div>
            </Breadcrumb.Page>
          {:else}
            <Breadcrumb.Link asChild let:attrs>
              <button {...attrs} on:click={() => navigateToBreadcrumb(-1)} title="Workspace root">
                {workspace ? workspace.name : 'Loading...'}
              </button>
            </Breadcrumb.Link>
          {/if}
        </Breadcrumb.Item>

        <!-- Ellipsis with dropdown for collapsed segments -->
        {#if needsCollapsing}
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild let:builder>
                <button use:builder.action {...builder} class="breadcrumb-ellipsis-btn" title="Show hidden folders">
                  <Ellipsis size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                {#each collapsedSegments as segment, index}
                  <DropdownMenu.Item size="sm" on:click={() => navigateToBreadcrumb(index)}>
                    {segment}
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Breadcrumb.Item>
        {/if}

        <!-- Visible segments -->
        {#each visibleSegments as segment, index}
          {@const actualIndex = visibleStartIndex + index}
          <Breadcrumb.Separator />
          <Breadcrumb.Item class="overflow-hidden">
            {#if actualIndex === breadcrumbSegments.length - 1}
              <Breadcrumb.Page class="overflow-hidden">
                <div class="overflow-hidden overflow-ellipsis whitespace-nowrap px-1">{segment}</div>
              </Breadcrumb.Page>
            {:else}
              <Breadcrumb.Link asChild let:attrs>
                <button {...attrs} on:click={() => navigateToBreadcrumb(actualIndex)}>
                  {segment}
                </button>
              </Breadcrumb.Link>
            {/if}
          </Breadcrumb.Item>
        {/each}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </div>
  <div class="search-bar">
    <Search size={14} />
    <Input
      type="text"
      placeholder="Search files..."
      value={filterText}
      on:input={onSearchInput}
      sizeVariant="xs"
      class="search-input"
    />
  </div>
  <BulkActionDataGrid
    bind:dataGrid
    bind:selectedItemId={selectedTreeNodePath}
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
    <svelte:fragment slot="context-menu" let:selectedItemIds>
      {@const isContextNodeInSelection = contextMenuNode && selectedItemIds?.includes(contextMenuNode.fullPath)}
      {@const effectiveNodes = isContextNodeInSelection
        ? flattenedTree.filter(node => selectedItemIds.includes(node.fullPath))
        : contextMenuNode
          ? [contextMenuNode]
          : []}
      {@const actionsForSelection = getAvailableActionsForNodes(actions, effectiveNodes)}
      {@const effectiveFilePaths = effectiveNodes.map(n => n.fullPath)}
      <WorkspaceContextMenuContents
        {actionsForSelection}
        selectedWorkspaceNodes={effectiveNodes}
        {hasEditPermission}
        {hasDeletePermission}
        {hasCreateActionPermission}
        on:rename={onTableMenuRenameNode}
        on:move={onTableMenuMoveNode}
        on:delete={onTableDeleteNode}
        on:copyFileLocation={onTableCopyFileLocation}
        on:copyFullPath={onTableCopyFullPath}
        on:moveToWorkspace={onTableMoveToWorkspace}
        on:runAction={event => onTableRunAction(event, effectiveFilePaths)}
        on:newFile={onTableNewSequence}
        on:newFolder={onTableNewFolder}
        on:importFile={onTableImportFile}
        on:openInNewTab={onTableOpenInNewTab}
      />
    </svelte:fragment>
  </BulkActionDataGrid>
</div>

<style>
  .workspace-grid-container {
    display: grid;
    grid-template-rows: auto auto 1fr;
    height: 100%;
  }

  .breadcrumb-wrapper {
    overflow: hidden;
    position: relative;
  }

  :global(.breadcrumbs) {
    background: var(--st-gray-10, #f5f5f5);
    border-bottom: 1px solid var(--st-gray-20, #e0e0e0);
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 4px;
    overflow: hidden;
    padding: 3px 4px;
    position: relative;
  }

  /* Ensure all breadcrumb items stay on one line */
  :global(.breadcrumbs li) {
    display: inline-flex;
    flex-shrink: 0;
    min-width: 0;
    white-space: nowrap;
  }

  /* Last breadcrumb item can shrink and truncate */
  :global(.breadcrumbs li:last-child) {
    flex-shrink: 1;
    min-width: 40px;
    overflow: hidden;
  }

  /* Ensure separators don't wrap */
  :global(.breadcrumbs [data-slot='breadcrumb-separator']) {
    flex-shrink: 0;
  }

  :global(.breadcrumbs button) {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    max-width: 100%;
    overflow: hidden;
    padding: 2px 4px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Breadcrumb page content (non-clickable current page) */
  :global(.breadcrumbs [data-slot='breadcrumb-page']) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.breadcrumbs [data-slot='breadcrumb-page'] > div) {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.breadcrumbs button:hover) {
    background: var(--st-gray-20, #e0e0e0);
  }

  :global(.breadcrumb-home) {
    display: inline-flex;
  }

  /* Hidden container for measuring breadcrumb item widths */
  .breadcrumb-measure-container {
    height: 0;
    left: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    top: 0;
    visibility: hidden;
    white-space: nowrap;
  }

  .breadcrumb-item-measure {
    display: inline-block;
  }

  :global(.breadcrumb-ellipsis-btn) {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    justify-content: center;
    padding: 2px 4px;
  }

  :global(.breadcrumb-ellipsis-btn:hover) {
    background: var(--st-gray-20, #e0e0e0);
  }

  .search-bar {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20, #e0e0e0);
    display: flex;
    gap: 8px;
    padding: 8px;
  }

  .search-bar :global(.search-input) {
    flex: 1;
  }

  :global(.tree-cell) {
    align-items: center;
    display: flex;
    gap: 1px;
    height: 100%;
  }

  :global(.tree-chevron) {
    align-items: center;
    display: flex;
    height: 14px;
    justify-content: center;
    width: 14px;
  }

  :global(.tree-icon) {
    align-items: center;
    display: flex;
    height: 14px;
    margin-right: 3px;
    width: 14px;
  }

  :global(.tree-name) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.workspace-file-browser .ag-root-wrapper) {
    --ag-borders: none;
    --ag-wrapper-border-radius: 0;
  }
</style>
