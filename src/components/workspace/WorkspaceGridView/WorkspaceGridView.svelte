<svelte:options immutable={true} />

<script lang="ts">
  import { Button, ContextMenu, Popover, Separator } from '@nasa-jpl/stellar-svelte';
  import type { CellContextMenuEvent, ICellRendererParams, IRowNode } from 'ag-grid-community';
  import {
    ArrowUpFromLine,
    ChevronDown,
    ChevronRight,
    Copy,
    Ellipsis,
    FileOutput,
    FilePlus,
    FolderOutput,
    FolderPlus,
    PencilLine,
    Trash2,
  } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { PATH_DELIMITER } from '../../../constants/workspaces';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import { workspace } from '../../../stores/workspaces';
  import type { User } from '../../../types/app';
  import type {
    DataGridColumnDef,
    DataGridRowDoubleClick,
    DataGridRowSelection,
    RowId,
  } from '../../../types/data-grid';
  import type { WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import { featurePermissions } from '../../../utilities/permissions';
  import MenuItem from '../../menus/MenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import WorkspaceTreeViewIcon from '../WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
  export let user: User | null;

  type CellRendererParams = {
    deleteNode: (node: WorkspaceTreeNodeWithFullPath) => void;
    viewNode: (node: WorkspaceTreeNodeWithFullPath) => void;
  };
  type WorkspaceTreeNodeCellRendererParams = ICellRendererParams<WorkspaceTreeNodeWithFullPath> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    copyFileLocation: string;
    importFile: string;
    moveToWorkspace: string;
    newFolder: string;
    newSequence: string;
    nodeClicked: WorkspaceNodeEvent;
    nodeDelete: WorkspaceNodeEvent;
    nodeMove: WorkspaceNodeEvent;
    nodeRename: WorkspaceNodeEvent;
  }>();

  const baseColumnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [
    {
      cellClass: 'node-cell-container',
      cellRenderer: (params: ICellRendererParams<WorkspaceTreeNodeWithFullPath>) => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'node-icon-cell';
        new WorkspaceTreeViewIcon({
          props: {
            size: 16,
            toggleState: (params.data?.contents || []).length > 0,
            treeNode: params.data,
          },
          target: iconDiv,
        });

        return iconDiv;
      },
      field: 'type',
      headerName: '',
      lockPosition: 'left',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressMovable: true,
      suppressSizeToFit: true,
      width: 25,
    },
    {
      field: 'name',
      filter: 'text',
      headerName: 'Name',
      resizable: true,
      sortable: true,
      suppressAutoSize: false,
      suppressSizeToFit: false,
    },
  ];

  let columnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [];
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;
  let dataGrid: DataGrid<WorkspaceTreeNodeWithFullPath> | undefined = undefined;
  let treeNodeBreadcrumbs: WorkspaceTreeNodeWithFullPath[] = [];
  let treeNodeBreadcrumbDisplay: WorkspaceTreeNodeWithFullPath[] = [];
  let treeNodeBreadcrumbMenuNodes: WorkspaceTreeNodeWithFullPath[] = [];
  let treeNodeBreadcrumbPath: string = '';
  let flattenedTree: WorkspaceTreeNodeWithFullPath[] = [];
  let isBreadcrumbMenuOpen: boolean = false;
  let isBreadcrumbNavMenuOpen: boolean = false;

  $: columnDefs = [
    ...baseColumnDefs,
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
              placement: 'bottom',
            },
            hasDeletePermission: params.data && user ? hasDeletePermission(user, params.data) : false,
            rowData: params.data,
            viewCallback: data => user && params.viewNode(data),
            viewTooltip: {
              content: 'Open',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteNode: onDeleteNode,
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
  $: if (selectedTreeNodePath) {
    treeNodeBreadcrumbPath = selectedTreeNodePath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
  }
  $: if (treeNode) {
    flattenedTree = flattenWorkspaceTreeWithPaths(treeNode?.contents ?? [], []);
    treeNodeBreadcrumbs = getNodeContentsOnPath(treeNode.contents ?? [], treeNodeBreadcrumbPath);
  }

  $: if (treeNodeBreadcrumbs.length > 2) {
    treeNodeBreadcrumbDisplay = [
      {
        contents: [],
        fullPath: '',
        name: '...',
        type: WorkspaceContentType.Directory,
      },
      ...treeNodeBreadcrumbs.slice(-2),
    ];
    treeNodeBreadcrumbMenuNodes = treeNodeBreadcrumbs.slice(0, treeNodeBreadcrumbs.length - 2);
  } else {
    treeNodeBreadcrumbDisplay = treeNodeBreadcrumbs;
  }

  function hasDeletePermission(user: User | null, node: WorkspaceTreeNodeWithFullPath) {
    return featurePermissions.workspace.canDelete(user, $workspace, node);
  }

  function hasContextMenuUpdatePermission(user: User | null, selectedId: RowId | null) {
    const selectedTreeNode = flattenedTree.find(treeNode => {
      return treeNode.fullPath === selectedId;
    });

    if (selectedTreeNode) {
      return featurePermissions.workspace.canUpdate(user, $workspace, selectedTreeNode);
    }

    return false;
  }

  /**
   * Recursively traverses a WorkspaceTreeNode tree structure, flattens it into an array,
   * includes the full path to each node, and uses memoization to cache results
   * based on both the input 'nodes' array and the 'currentPath'.
   *
   * @param nodes An array of WorkspaceTreeNode objects to start the traversal from.
   * @param currentPath (Internal) The path segments leading to the current 'nodes' array.
   * Defaults to an empty array for the initial top-level call.
   * @param cache (Internal) The memoization cache. Should typically be initialized by the wrapper.
   * @returns An array containing all nodes from the tree, each with its 'fullPath'.
   */
  function flattenWorkspaceTreeWithPaths(
    nodes: WorkspaceTreeNode[],
    currentPath: string[] = [],
  ): WorkspaceTreeNodeWithFullPath[] {
    const flattenedArray: WorkspaceTreeNodeWithFullPath[] = [];

    nodes.forEach(node => {
      const nodeName = node.name || `[Unnamed ${node.type || 'Unknown'}]`;
      const nodeFullPath = [...currentPath, nodeName];

      flattenedArray.push({
        ...node,
        fullPath: nodeFullPath.join(PATH_DELIMITER),
      });

      if (node.contents && Array.isArray(node.contents) && node.contents.length > 0) {
        // Recursively call, passing the updated currentPath and the shared cache
        flattenedArray.push(...flattenWorkspaceTreeWithPaths(node.contents, nodeFullPath));
      }
    });

    return flattenedArray;
  }

  function getNodeContentsOnPath(rootNodes: WorkspaceTreeNode[], path: string): WorkspaceTreeNodeWithFullPath[] {
    const pathSegments = path.split(PATH_DELIMITER).filter(Boolean);

    let currentNodes: WorkspaceTreeNode[] = rootNodes;
    let currentPath: string[] = [];
    return pathSegments.reduce((previousSegments: WorkspaceTreeNodeWithFullPath[], segment) => {
      currentPath.push(segment);
      for (const node of currentNodes) {
        if (node.name === segment) {
          currentNodes = node.contents || [];

          return [
            ...previousSegments,
            {
              ...node,
              fullPath: currentPath.join(PATH_DELIMITER),
            },
          ];
        }
      }

      return previousSegments;
    }, []);
  }

  function getPathType(path: RowId | null) {
    const nodeAtPath = flattenedTree.find(node => node.fullPath === path);

    if (nodeAtPath) {
      return nodeAtPath.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
    }
  }

  function isRowSelectable(node: IRowNode<WorkspaceTreeNodeWithFullPath>) {
    return node.data?.type === WorkspaceContentType.Sequence || node.data?.type === WorkspaceContentType.Directory;
  }

  function doesExternalFilterPass(node: IRowNode<WorkspaceTreeNodeWithFullPath>) {
    const fullPath = node.data?.fullPath ?? '';
    const pathRegex = new RegExp(`^${treeNodeBreadcrumbPath}/?`);
    const isOnPath = pathRegex.test(fullPath);
    if (isOnPath) {
      return (fullPath.replace(pathRegex, '').split(PATH_DELIMITER).filter(Boolean).length ?? 0) === 1;
    }

    return false;
  }

  function closeBreadcrumbMenu() {
    isBreadcrumbMenuOpen = false;
  }

  function onViewNode(node: WorkspaceTreeNodeWithFullPath) {
    if (node.type === WorkspaceContentType.Directory || node.type === WorkspaceContentType.Workspace) {
      treeNodeBreadcrumbPath = node.fullPath;
      dataGrid?.onFilterChanged();
    }
  }

  function onBreadcrumbClick(node: WorkspaceTreeNodeWithFullPath) {
    onViewNode(node);
  }

  function onContextMenu(event: CustomEvent<CellContextMenuEvent<WorkspaceTreeNodeWithFullPath, any>>) {
    contextMenuNode = event.detail.data ?? null;
  }

  function onContextMenuHide() {
    contextMenuNode = null;
  }

  function onNodeClicked(event: CustomEvent<DataGridRowSelection<WorkspaceTreeNodeWithFullPath>>) {
    const row = event.detail;
    if (row.data.type === WorkspaceContentType.Sequence) {
      dispatch('nodeClicked', {
        toggleState: row.isSelected,
        treeNode: row.data,
        treeNodePath: row.data.fullPath,
      });
    }
  }

  function onRowDoubleClicked(event: CustomEvent<DataGridRowDoubleClick<WorkspaceTreeNodeWithFullPath>>) {
    const row = event.detail;
    const node = row.data;

    if (node.type === WorkspaceContentType.Directory) {
      onViewNode(row.data);
    }
  }

  function onDeleteNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeDelete', {
      toggleState: true,
      treeNode: node,
      treeNodePath: node.fullPath,
    });
    closeBreadcrumbMenu();
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

  function onNewFolder(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node.fullPath ?? '';
    if (node.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newFolder', targetPath);
  }

  function onNewSequence(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node.fullPath ?? '';
    if (node.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newSequence', targetPath);
  }

  function onImportFile(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node.fullPath ?? '';
    if (node.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('importFile', targetPath);
  }

  function onCopyFileLocation(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node?.fullPath ?? '';
    dispatch('copyFileLocation', targetPath);
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

  function onTableCopyFileLocation() {
    if (contextMenuNode) {
      onCopyFileLocation(contextMenuNode);
    }
  }

  function onTableMoveToWorkspace() {
    if (contextMenuNode) {
      onMoveToWorkspace(contextMenuNode);
    }
  }
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <div class="flex items-center gap-1">
    {#if treeNodeBreadcrumbDisplay.length === 0}
      <Button variant="ghost" class="flex items-center gap-1 font-bold">
        {treeNode?.name}
        <ChevronDown size={16} />
      </Button>
    {:else}
      <Button variant="ghost" on:click={() => treeNode && onBreadcrumbClick({ ...treeNode, fullPath: '' })}>
        {treeNode?.name}
      </Button>
      <ChevronRight size={16} />
    {/if}
    {#each treeNodeBreadcrumbDisplay as breadcrumb, index}
      {#if index === treeNodeBreadcrumbDisplay.length - 1}
        <Popover.Root bind:open={isBreadcrumbMenuOpen}>
          <Popover.Trigger asChild let:builder>
            <Button builders={[builder]} variant="ghost" class="flex items-center gap-1 font-bold">
              {breadcrumb.name}
              <ChevronDown size={16} />
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-auto p-0" align="start" role="menu" aria-label="Breadcrumb Menu">
            <MenuItem className="text-xs py-1.5" on:click={() => onRenameNode(breadcrumb)}>
              <PencilLine size={16} />
              Rename Folder
            </MenuItem>
            <MenuItem className="text-xs py-1.5" on:click={() => onMoveNode(breadcrumb)}>
              <FolderOutput size={16} />
              Move Folder
            </MenuItem>
            <MenuItem className="text-xs py-1.5" on:click={() => onDeleteNode(breadcrumb)}>
              <Trash2 size={16} />
              Delete Folder
            </MenuItem>
            <Separator />
            <MenuItem className="text-xs py-1.5" on:click={() => onCopyFileLocation(breadcrumb)}>
              <Copy size={16} /> Copy Link to {breadcrumb.type === WorkspaceContentType.Directory
                ? 'Directory'
                : 'File'}
            </MenuItem>
            <Separator />
            <MenuItem className="text-xs py-1.5" on:click={() => onMoveToWorkspace(breadcrumb)}>
              <FileOutput size={16} /> Move to Workspace
            </MenuItem>
            <Separator />
            <MenuItem className="text-xs py-1.5" on:click={() => onNewSequence(breadcrumb)}>
              <FilePlus size={16} /> New Sequence
            </MenuItem>
            <MenuItem className="text-xs py-1.5" on:click={() => onNewFolder(breadcrumb)}>
              <FolderPlus size={16} /> New Folder
            </MenuItem>
            <MenuItem className="text-xs py-1.5" on:click={() => onImportFile(breadcrumb)}>
              <ArrowUpFromLine size={16} /> Import File
            </MenuItem>
          </Popover.Content>
        </Popover.Root>
      {:else if breadcrumb.name === '...'}
        <Popover.Root bind:open={isBreadcrumbNavMenuOpen}>
          <Popover.Trigger asChild let:builder>
            <Button builders={[builder]} variant="ghost"><Ellipsis size={16} /></Button>
          </Popover.Trigger>
          <Popover.Content class="w-auto p-0" align="start" role="menu" aria-label="Breadcrumb Nav Menu">
            {#each treeNodeBreadcrumbMenuNodes as breadcrumbMenuNode}
              <MenuItem className="text-sm py-1.5" on:click={() => onBreadcrumbClick(breadcrumbMenuNode)}>
                <WorkspaceTreeViewIcon treeNode={breadcrumbMenuNode} toggleState={true} />
                {breadcrumbMenuNode.name}
              </MenuItem>
            {/each}
          </Popover.Content>
        </Popover.Root>
      {:else}
        <Button variant="ghost" on:click={() => onBreadcrumbClick(breadcrumb)}>
          {breadcrumb.name}
        </Button>
        {#if index !== treeNodeBreadcrumbDisplay.length - 1}
          <ChevronRight size={16} />
        {/if}
      {/if}
    {/each}
  </div>
  <SingleActionDataGrid
    bind:dataGrid
    {hasDeletePermission}
    getRowId={node => node.fullPath}
    {columnDefs}
    itemDisplayText="File"
    items={flattenedTree}
    {user}
    selectedItemId={selectedTreeNodePath}
    isExternalFilterPresent={() => true}
    {isRowSelectable}
    {doesExternalFilterPass}
    on:rowClicked={onNodeClicked}
    on:rowDoubleClicked={onRowDoubleClicked}
    on:cellContextMenu={onContextMenu}
    on:cellContextMenuHide={onContextMenuHide}
  >
    <svelte:fragment slot="context-menu" let:selectedItemId>
      <ContextMenu.Group>
        <ContextMenu.Item class="items-center gap-1" size="sm" on:click={onTableMenuRenameNode}>
          <PencilLine size={16} />
          Rename
        </ContextMenu.Item>
        <ContextMenu.Item
          class="items-center gap-1"
          size="sm"
          disabled={!hasContextMenuUpdatePermission(user, selectedItemId)}
          on:click={onTableMenuMoveNode}
        >
          <FolderOutput size={16} />
          Move
        </ContextMenu.Item>
      </ContextMenu.Group>
      <ContextMenu.Separator />
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onTableCopyFileLocation}>
        <Copy size={16} /> Copy Link to {getPathType(selectedItemId)}
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onTableMoveToWorkspace}>
        <FileOutput size={16} /> Move to Workspace
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.Item class="flex gap-1" size="sm" on:click={onTableNewSequence}>
          <FilePlus size={16} /> New Sequence
        </ContextMenu.Item>
        <ContextMenu.Item class="flex gap-1" size="sm" on:click={onTableNewFolder}>
          <FolderPlus size={16} /> New Folder
        </ContextMenu.Item>
        <ContextMenu.Item class="flex gap-1" size="sm" on:click={onTableImportFile}>
          <ArrowUpFromLine size={16} /> Import File
        </ContextMenu.Item>
      </ContextMenu.Group>
      <ContextMenu.Separator />
    </svelte:fragment>
  </SingleActionDataGrid>
</div>

<style>
  :global(.node-icon-cell) {
    align-items: center;
    display: flex;
    height: 100%;
    width: 16px;
  }
</style>
