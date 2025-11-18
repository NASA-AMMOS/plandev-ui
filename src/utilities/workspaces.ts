import { PATH_DELIMITER } from '../constants/workspaces';
import type { User } from '../types/app';
import type { Workspace, WorkspaceInsertInput } from '../types/workspace';
import type { WorkspaceTreeMap, WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import { filterEmpty } from './generic';
import { reqWorkspace } from './requests';

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

function createFormDataWithFile(filePath: string, fileContent: string, fileKey: string = 'file'): FormData {
  const pathParts = filePath.split(PATH_DELIMITER);
  const fileName = pathParts[pathParts.length - 1];

  const file = new File([fileContent], fileName);
  const body = new FormData();
  body.append(fileKey, file, file.name);

  return body;
}

export const WorkspaceApi = {
  async createFolder(workspaceId: number, folderPath: string, user: User | null) {
    return reqWorkspace<Workspace>(`${workspaceId}/${folderPath}?type=directory`, 'PUT', null, user, undefined, false);
  },
  async createWorkspace(
    location: string,
    parcelId: number,
    user: User | null,
    name?: string | null,
  ): Promise<Workspace> {
    const workspaceInsert: WorkspaceInsertInput | null = {
      parcelId: parcelId,
      workspaceLocation: location,
      ...(name ? { workspaceName: name } : {}),
    };

    return reqWorkspace<Workspace>(`create`, 'POST', JSON.stringify(workspaceInsert), user);
  },
  async deleteFile(workspaceId: number, filePath: string, user: User | null): Promise<void> {
    return reqWorkspace(joinPath([workspaceId, filePath]), 'DELETE', null, user, undefined, false);
  },
  async deleteWorkspace(workspaceId: number, user: User | null): Promise<void> {
    return reqWorkspace(`${workspaceId}`, 'DELETE', null, user, undefined, false);
  },
  async getFileContent(workspaceId: number, filePath: string, user: User | null): Promise<string | null> {
    return reqWorkspace<string>(joinPath([workspaceId, filePath]), 'GET', null, user, undefined, false);
  },
  async getWorkspaceContents(workspaceId: number, user: User | null): Promise<WorkspaceTreeNode[] | null> {
    return reqWorkspace<WorkspaceTreeNode[]>(`${workspaceId}`, 'GET', null, user);
  },
  async moveFile(
    workspaceId: number,
    originalPath: string,
    targetPath: string,
    shouldCopy: boolean,
    user: User | null,
  ): Promise<void> {
    return reqWorkspace<void>(
      joinPath([workspaceId, originalPath]),
      'POST',
      JSON.stringify({
        [shouldCopy ? 'copyTo' : 'moveTo']: targetPath,
      }),
      user,
      undefined,
      false,
    );
  },
  async moveFileToWorkspace(
    workspaceId: number,
    originalPath: string,
    targetWorkspaceId: number,
    targetDirectory: string,
    shouldCopy: boolean,
    user: User | null,
  ): Promise<void> {
    return reqWorkspace<void>(
      joinPath([workspaceId, originalPath]),
      'POST',
      JSON.stringify({
        [shouldCopy ? 'copyTo' : 'moveTo']: targetDirectory,
        toWorkspace: targetWorkspaceId,
      }),
      user,
      undefined,
      false,
    );
  },
  async saveFile(
    workspaceId: number,
    filePath: string,
    fileContent: string,
    shouldOverwrite: boolean,
    user: User | null,
  ) {
    const body = createFormDataWithFile(filePath, fileContent);
    return reqWorkspace<Workspace>(
      `${workspaceId}/${filePath}?type=file${shouldOverwrite ? '&overwrite=true' : ''}`,
      'PUT',
      body,
      user,
      undefined,
      false,
    );
  },
  async uploadFile(
    workspaceId: number,
    targetDirectory: string,
    filename: string,
    file: File,
    user: User | null,
  ): Promise<void> {
    const body = new FormData();
    body.append('file', file, file.name);
    return reqWorkspace<void>(
      `${joinPath([workspaceId, targetDirectory, filename])}?type=file`,
      'PUT',
      body,
      user,
      undefined,
      false,
    );
  },
};
