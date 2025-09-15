import { PATH_DELIMITER } from '../constants/workspaces';
import type { WorkspaceTreeMap, WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import { filterEmpty } from './generic';

export function mapWorkspaceTreePaths(nodes: WorkspaceTreeNode[], currentPath: string[] = []): WorkspaceTreeMap {
  let treeMap: WorkspaceTreeMap = {};

  nodes.forEach(node => {
    const nodeName = node.name || `[Unnamed ${node.type || 'Unknown'}]`;
    const nodeFullPath = [...currentPath, nodeName];

    treeMap[nodeFullPath.join(PATH_DELIMITER)] = node;

    if (node.contents && Array.isArray(node.contents) && node.contents.length > 0) {
      // Recursively call, passing the updated currentPath and the shared cache
      treeMap = {
        ...treeMap,
        ...mapWorkspaceTreePaths(node.contents, nodeFullPath),
      };
    }
  });

  return treeMap;
}

export function separateFilenameFromPath(filePath: string): { filename: string; path: string } {
  const matches = /^(?<path>.*[\\/])?(?<filename>[^\\/]*(\.[^\\/]*)?)$/.exec(filePath);
  if (matches && matches.groups) {
    const { filename, path } = matches.groups;
    return {
      filename,
      path: cleanPath(path),
    };
  }

  return {
    filename: '',
    path: filePath,
  };
}

export function cleanPath(path: string | null = '') {
  return (path ?? '').replace(/^\.{0,2}\//, '').replace(/\/$/, '');
}

export function joinPath(pathParts: (string | number | boolean)[]) {
  return pathParts.filter(filterEmpty).join(PATH_DELIMITER);
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
export function flattenWorkspaceTreeWithPaths(
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
