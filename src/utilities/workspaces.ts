import { PATH_DELIMITER } from '../constants/workspaces';
import { WorkspaceContentType } from '../enums/workspace';
import type { ActionDefinition } from '../types/actions';
import type { User } from '../types/app';
import type { ActionParameterPair, Workspace, WorkspaceInsertInput } from '../types/workspace';
import type { WorkspaceTreeMap, WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import { filterEmpty } from './generic';
import { reqWorkspace } from './requests';
import type { ActionValueSchema } from '@nasa-jpl/aerie-actions';
import { pathMatchesExtensionPattern } from './parameters';

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

/**
 * Given the list of all actions, and a list of selected nodes (files) in the workspace,
 * find all actions which can be run on the selected nodes (by passing them in as a primary file/sequence/list param),
 * and return pairs of the action definitions + the key of their primary param to pass the nodes to.
 * @param actions
 * @param nodes
 */
export function getAvailableActionsForNodes(
  actions: ActionDefinition[],
  nodes: (WorkspaceTreeNodeWithFullPath | WorkspaceTreeNode)[],
): ActionParameterPair[] {
  const areAllNodesSequences = nodes.every(node => node.type === WorkspaceContentType.Sequence);

  // any # of any type of files can be passed to a 'fileList' type param
  let allowedParamTypes = ['fileList'];
  // if they are ALL sequences, they can safely be passed to a 'sequenceList' param
  if (areAllNodesSequences) {
    allowedParamTypes.push('sequenceList');
  }
  // if only one file is selected, it can be passed to single file/sequence params
  if (nodes.length === 1) {
    allowedParamTypes.push('file');
  }
  if (nodes.length === 1 && areAllNodesSequences) {
    allowedParamTypes.push('sequence');
  }
  // when we pick a primary param, prefer more-specific types over less-specific ones (reversed)
  allowedParamTypes = allowedParamTypes.reverse();

  const availableActions: ActionParameterPair[] = [];

  for (const action of actions) {
    // params where the user has set a "primary: true" flag to be used as primary input for files/sequences
    const userPrimaryParams = Object.entries(action.parameter_schema)
      // @ts-expect-error only some types in the schema tagged union have `primary` :-/
      .filter(([_k, schema]) => schema.primary === true);

    if (userPrimaryParams.length) {
      // action specifies a "primary" param to use (should be only one but check to be safe)
      // pick the first param with `primary: true` and a valid parameter type for our nodes
      const primaryParam = userPrimaryParams.find(([_key, schema]) => {
        return allowedParamTypes.includes(schema.type) && nodesMatchParamSchema(nodes, schema);
      });
      if (primaryParam) {
        availableActions.push({ action, parameter: primaryParam[0] });
      }
    } else {
      // no user-specified primary, pick the best one if possible
      const allowedParams = allowedParamTypes
        .map(allowedType => {
          return Object.entries(action.parameter_schema).find(([_k, schema]) => {
            return schema.type === allowedType && nodesMatchParamSchema(nodes, schema);
          });
        })
        .filter(v => v !== undefined)
        .map(([paramKey]) => ({ action, parameter: paramKey }));
      if (allowedParams.length) {
        availableActions.push(allowedParams[0]);
      }
    }
  }

  return availableActions;
}

/**
 * Given a list of selected nodes (files) in the workspace, and an action parameter schema,
 * validate that all nodes match whatever restrictions (eg. file patterns) are present in the parameter schema,
 * return true if so, else false
 */
function nodesMatchParamSchema(
  nodes: (WorkspaceTreeNodeWithFullPath | WorkspaceTreeNode)[],
  schema: ActionValueSchema,
): boolean {
  if ((schema.type === 'file' || schema.type === 'fileList') && schema.pattern) {
    return nodes.every(node => {
      return pathMatchesExtensionPattern(node.name || '', schema.pattern || '');
    });
  }
  return true;
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
