import { PATH_DELIMITER } from '../constants/workspaces';
import type { WorkspaceTreeMap, WorkspaceTreeNode } from '../types/workspace-tree-view';

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
  const matches = /^(?<path>.*[\\/])?(?<filename>[^\\/]*\.[^\\/]*)$/.exec(filePath);
  if (matches && matches.groups) {
    const { filename, path } = matches.groups;
    return {
      filename,
      path,
    };
  }

  return {
    filename: '',
    path: filePath,
  };
}
