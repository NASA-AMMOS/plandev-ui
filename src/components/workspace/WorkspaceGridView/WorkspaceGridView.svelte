<svelte:options immutable={true} />

<script lang="ts">
  import { Button, ContextMenu, DropdownMenu } from '@nasa-jpl/stellar-svelte';
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
  import type { User } from '../../../types/app';
  import type {
    DataGridColumnDef,
    DataGridRowDoubleClick,
    DataGridRowSelection,
    RowId,
  } from '../../../types/data-grid';
  import type { Workspace, WorkspaceNodeEvent } from '../../../types/workspace';
  import type {
    WorkspaceTreeMap,
    WorkspaceTreeNode,
    WorkspaceTreeNodeWithFullPath,
  } from '../../../types/workspace-tree-view';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import { flattenWorkspaceTreeWithPaths, mapWorkspaceTreePaths } from '../../../utilities/workspaces';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import WorkspaceTreeViewIcon from '../WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';

  export let isRowSelectable: (node: Pick<IRowNode<WorkspaceTreeNodeWithFullPath>, 'data'>) => boolean = (
    _node: Pick<IRowNode<WorkspaceTreeNodeWithFullPath>, 'data'>,
  ) => {
    return true;
  };
  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
  export let workspace: Workspace | null | undefined = null;
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
            size: 14,
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
  let workspaceTreeMap: WorkspaceTreeMap = {};
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
    workspaceTreeMap = mapWorkspaceTreePaths(treeNode.contents ?? []);
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
    if (workspace) {
      return featurePermissions.workspace.canDelete(user, workspace, node);
    }
    return false;
  }

  function hasContextMenuUpdatePermission(user: User | null, selectedId: RowId | null) {
    const selectedTreeNode = selectedId ? workspaceTreeMap[selectedId] : undefined;
    if (workspace) {
      return featurePermissions.workspace.canUpdate(user, workspace, selectedTreeNode);
    }

    return false;
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
    const nodeAtPath = path ? workspaceTreeMap[path] : null;
    if (nodeAtPath) {
      return nodeAtPath.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
    }
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

    if (isRowSelectable(row)) {
      dispatch('nodeClicked', {
        toggleState: true,
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
    closeBreadcrumbMenu();
  }

  function onRenameNode(node: WorkspaceTreeNodeWithFullPath) {
    dispatch('nodeRename', {
      toggleState: true,
      treeNode: node,
      treeNodePath: node.fullPath,
    });
    closeBreadcrumbMenu();
  }

  function onNewFolder(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath).fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newFolder', targetPath);
    closeBreadcrumbMenu();
  }

  function onNewSequence(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath).fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newSequence', targetPath);
    closeBreadcrumbMenu();
  }

  function onImportFile(node?: WorkspaceTreeNode | WorkspaceTreeNodeWithFullPath | null) {
    let targetPath = (node as WorkspaceTreeNodeWithFullPath).fullPath ?? '';
    if (node?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('importFile', targetPath);
    closeBreadcrumbMenu();
  }

  function onCopyFileLocation(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node?.fullPath ?? '';
    dispatch('copyFileLocation', targetPath);
    closeBreadcrumbMenu();
  }

  function onMoveToWorkspace(node: WorkspaceTreeNodeWithFullPath) {
    let targetPath = node?.fullPath ?? '';
    dispatch('moveToWorkspace', targetPath);
    closeBreadcrumbMenu();
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
      <DropdownMenu.Root bind:open={isBreadcrumbMenuOpen}>
        <DropdownMenu.Trigger asChild let:builder>
          <Button builders={[builder]} variant="ghost" class="flex items-center gap-1 rounded-none font-bold">
            {treeNode?.name}
            <ChevronDown size={14} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" role="menu" aria-label="Breadcrumb Menu">
          <DropdownMenu.Item size="sm" on:click={() => onNewSequence(treeNode)}>
            <div
              class="flex items-center gap-2"
              use:permissionHandler={{
                hasPermission: hasContextMenuUpdatePermission(user, null),
                permissionError: 'You do not have permission to create a new file in this folder.',
              }}
              aria-label="New File"
            >
              <FilePlus size={14} /> New File
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item size="sm" on:click={() => onNewFolder(treeNode)}>
            <div
              class="flex items-center gap-2"
              use:permissionHandler={{
                hasPermission: hasContextMenuUpdatePermission(user, null),
                permissionError: 'You do not have permission to create a new folder in this folder.',
              }}
              aria-label="New Folder"
            >
              <FolderPlus size={14} /> New Folder
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item size="sm" on:click={() => onImportFile(treeNode)}>
            <div
              class="flex items-center gap-2"
              use:permissionHandler={{
                hasPermission: hasContextMenuUpdatePermission(user, null),
                permissionError: 'You do not have permission to upload a file into this folder.',
              }}
              aria-label="Upload File"
            >
              <ArrowUpFromLine size={14} /> Upload File
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else}
      <Button
        variant="ghost"
        on:click={() => treeNode && onBreadcrumbClick({ ...treeNode, fullPath: '' })}
        class="rounded-none"
      >
        {treeNode?.name}
      </Button>
      <ChevronRight size={14} />
    {/if}
    {#each treeNodeBreadcrumbDisplay as breadcrumb, index}
      {#if index === treeNodeBreadcrumbDisplay.length - 1}
        <DropdownMenu.Root bind:open={isBreadcrumbMenuOpen}>
          <DropdownMenu.Trigger asChild let:builder>
            <Button builders={[builder]} variant="ghost" class="flex items-center gap-1 rounded-none font-bold">
              {breadcrumb.name}
              <ChevronDown size={14} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start" role="menu" aria-label="Breadcrumb Menu">
            <DropdownMenu.Item size="sm" on:click={() => onRenameNode(breadcrumb)}>
              <div
                class="flex items-center gap-2"
                use:permissionHandler={{
                  hasPermission: hasContextMenuUpdatePermission(user, breadcrumb.fullPath),
                  permissionError: 'You do not have permission to rename this folder.',
                }}
                aria-label="Rename"
              >
                <PencilLine size={14} />
                Rename Folder
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item size="sm" on:click={() => onMoveNode(breadcrumb)}>
              <div
                class="flex items-center gap-2"
                use:permissionHandler={{
                  hasPermission: hasContextMenuUpdatePermission(user, breadcrumb.fullPath),
                  permissionError: 'You do not have permission to move this folder.',
                }}
                aria-label="Move Folder"
              >
                <FolderOutput size={14} />
                Move Folder
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item size="sm" on:click={() => onDeleteNode(breadcrumb)}>
              <div
                class="flex items-center gap-2"
                use:permissionHandler={{
                  hasPermission: hasContextMenuUpdatePermission(user, breadcrumb.fullPath),
                  permissionError: 'You do not have permission to delete this folder.',
                }}
                aria-label="Delete Folder"
              >
                <Trash2 size={14} />
                Delete Folder
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item size="sm" on:click={() => onCopyFileLocation(breadcrumb)}>
              <div class="flex items-center gap-2" aria-label="Copy Link to">
                <Copy size={14} /> Copy {breadcrumb.type === WorkspaceContentType.Directory
                  ? 'Link to Directory'
                  : 'Download Link to File'}
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item size="sm" on:click={() => onMoveToWorkspace(breadcrumb)}>
              <div class="flex items-center gap-2" aria-label="Move to Workspace">
                <FileOutput size={14} /> Move to Workspace
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item size="sm" on:click={() => onNewSequence(breadcrumb)}>
              <div
                class="flex items-center gap-2"
                use:permissionHandler={{
                  hasPermission: hasContextMenuUpdatePermission(user, breadcrumb.fullPath),
                  permissionError: 'You do not have permission to create a new file in this folder.',
                }}
                aria-label="New File"
              >
                <FilePlus size={14} /> New File
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item size="sm" on:click={() => onNewFolder(breadcrumb)}>
              <div
                class="flex items-center gap-2"
                use:permissionHandler={{
                  hasPermission: hasContextMenuUpdatePermission(user, breadcrumb.fullPath),
                  permissionError: 'You do not have permission to create a new folder in this folder.',
                }}
              >
                <FolderPlus size={14} /> New Folder
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item size="sm" on:click={() => onImportFile(breadcrumb)}>
              <div
                class="flex items-center gap-2"
                use:permissionHandler={{
                  hasPermission: hasContextMenuUpdatePermission(user, breadcrumb.fullPath),
                  permissionError: 'You do not have permission to upload a file into this folder.',
                }}
                aria-label="Upload File"
              >
                <ArrowUpFromLine size={14} /> Upload File
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else if breadcrumb.name === '...'}
        <DropdownMenu.Root bind:open={isBreadcrumbNavMenuOpen}>
          <DropdownMenu.Trigger asChild let:builder>
            <Button builders={[builder]} variant="ghost"><Ellipsis size={14} /></Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start" role="menu" aria-label="Breadcrumb Nav Menu">
            {#each treeNodeBreadcrumbMenuNodes as breadcrumbMenuNode}
              <DropdownMenu.Item size="sm" on:click={() => onBreadcrumbClick(breadcrumbMenuNode)}>
                <WorkspaceTreeViewIcon treeNode={breadcrumbMenuNode} toggleState={true} />
                {breadcrumbMenuNode.name}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <Button variant="ghost" on:click={() => onBreadcrumbClick(breadcrumb)}>
          {breadcrumb.name}
        </Button>
        {#if index !== treeNodeBreadcrumbDisplay.length - 1}
          <ChevronRight size={14} />
        {/if}
      {/if}
    {/each}
  </div>
  <SingleActionDataGrid
    bind:dataGrid
    class="workspace-grid-view"
    {hasDeletePermission}
    getRowId={node => node.fullPath}
    {columnDefs}
    itemDisplayText="File"
    items={flattenedTree}
    {user}
    selectedItemId={selectedTreeNodePath}
    isExternalFilterPresent={() => true}
    suppressRowClickSelection={true}
    {doesExternalFilterPass}
    on:rowClicked={onNodeClicked}
    on:rowDoubleClicked={onRowDoubleClicked}
    on:cellContextMenu={onContextMenu}
    on:cellContextMenuHide={onContextMenuHide}
  >
    <svelte:fragment slot="context-menu" let:selectedItemId>
      <ContextMenu.Group>
        <ContextMenu.Item size="sm" on:click={onTableMenuRenameNode} aria-label="Rename">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasContextMenuUpdatePermission(user, selectedItemId),
              permissionError: `You do not have permission to rename this ${getPathType(selectedItemId) === 'File' ? 'file' : 'folder'}.`,
            }}
          >
            <PencilLine size={14} />
            Rename
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onTableMenuMoveNode} aria-label="Move/Copy">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasContextMenuUpdatePermission(user, selectedItemId),
              permissionError: `You do not have permission to move this ${getPathType(selectedItemId) === 'File' ? 'file' : 'folder'}.`,
            }}
          >
            <FolderOutput size={14} />
            Move/Copy
          </div>
        </ContextMenu.Item>
      </ContextMenu.Group>
      <ContextMenu.Separator />
      <ContextMenu.Item size="sm" on:click={onTableCopyFileLocation} aria-label="Copy Link to">
        <div class="flex items-center gap-2">
          <Copy size={14} /> Copy {getPathType(contextMenuNode?.fullPath ?? null) === 'File'
            ? 'Download Link to File'
            : 'Link to Directory'}
        </div>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item size="sm" on:click={onTableMoveToWorkspace} aria-label="Move to Workspace">
        <div class="flex items-center gap-2">
          <FileOutput size={14} /> Move to Workspace
        </div>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.Item size="sm" on:click={onTableNewSequence} aria-label="New File">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasContextMenuUpdatePermission(user, selectedItemId),
              permissionError: 'You do not have permission to create a new file in this folder.',
            }}
          >
            <FilePlus size={14} /> New File
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onTableNewFolder} aria-label="New Folder">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasContextMenuUpdatePermission(user, selectedItemId),
              permissionError: 'You do not have permission to create a new folder in this folder.',
            }}
          >
            <FolderPlus size={14} /> New Folder
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onTableImportFile} aria-label="Upload File">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasContextMenuUpdatePermission(user, selectedItemId),
              permissionError: 'You do not have permission to upload a file into this folder.',
            }}
          >
            <ArrowUpFromLine size={14} /> Upload File
          </div>
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
    width: 14px;
  }

  :global(.workspace-grid-view .ag-root-wrapper) {
    --ag-borders: none;
    --ag-wrapper-border-radius: 0;
    border-top: 1px solid var(--ag-border-color);
  }
</style>
