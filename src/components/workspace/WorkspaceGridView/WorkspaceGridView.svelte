<svelte:options immutable={true} />

<script lang="ts">
  import type { CellContextMenuEvent, ICellRendererParams, IRowNode } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection } from '../../../types/data-grid';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import WorkspaceTreeViewIcon from '../WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
  export let user: User | null;

  type RowClickEvent = {
    toggleState?: boolean;
    treeNode: WorkspaceTreeNode;
    treeNodePath: string;
  };
  type WorkspaceTreeNodeWithFullPath = WorkspaceTreeNode & {
    fullPath: string;
  };

  const dispatch = createEventDispatcher<{
    nodeClicked: RowClickEvent;
    nodeRightClicked: RowClickEvent;
  }>();

  const columnDefs: DataGridColumnDef<WorkspaceTreeNodeWithFullPath>[] = [
    {
      cellClass: 'node-cell-container',
      cellRenderer: (params: ICellRendererParams<WorkspaceTreeNodeWithFullPath>) => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'node-icon-cell';
        new WorkspaceTreeViewIcon({
          props: {
            size: 16,
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
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 80,
    },
    { field: 'fullPath', filter: 'text', headerName: 'Path', minWidth: 80, resizable: true, sortable: true },
  ];
  let flattenedTree: WorkspaceTreeNodeWithFullPath[] = [];

  $: if (treeNode) {
    flattenedTree = flattenWorkspaceTreeWithPathsMemoized(treeNode?.contents ?? [], []);
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
  function flattenWorkspaceTreeWithPathsMemoized(
    nodes: WorkspaceTreeNode[],
    currentPath: string[] = [],
  ): WorkspaceTreeNodeWithFullPath[] {
    const flattenedArray: WorkspaceTreeNodeWithFullPath[] = [];

    nodes.forEach(node => {
      const nodeName = node.name || `[Unnamed ${node.type || 'Unknown'}]`;
      const nodeFullPath = [...currentPath, nodeName];

      flattenedArray.push({
        ...node,
        fullPath: nodeFullPath.join('/'),
      });

      if (node.contents && Array.isArray(node.contents) && node.contents.length > 0) {
        // Recursively call, passing the updated currentPath and the shared cache
        flattenedArray.push(...flattenWorkspaceTreeWithPathsMemoized(node.contents, nodeFullPath));
      }
    });

    return flattenedArray;
  }

  function isRowSelectable(node: IRowNode<WorkspaceTreeNodeWithFullPath>) {
    return node.data?.type === WorkspaceContentType.Sequence;
  }

  function onNodeClicked(event: CustomEvent<DataGridRowSelection<WorkspaceTreeNodeWithFullPath>>) {
    const row = event.detail;
    dispatch('nodeClicked', {
      toggleState: row.isSelected,
      treeNode: row.data,
      treeNodePath: row.data.fullPath,
    });
  }

  function onNodeRightClicked(event: CustomEvent<CellContextMenuEvent<WorkspaceTreeNodeWithFullPath>>) {
    const row = event.detail;
    if (row.data) {
      dispatch('nodeClicked', {
        treeNode: row.data,
        treeNodePath: row.data.fullPath,
      });
    }
  }
</script>

<div class="h-96">
  <SingleActionDataGrid
    hasDeletePermission={false}
    getRowId={node => node.fullPath}
    {columnDefs}
    itemDisplayText="File"
    items={flattenedTree}
    {user}
    {isRowSelectable}
    on:rowSelected={onNodeClicked}
    on:cellContextMenu={onNodeRightClicked}
  />
</div>

<style>
  :global(.node-icon-cell) {
    align-items: center;
    display: flex;
    height: 100%;
    width: 16px;
  }
</style>
