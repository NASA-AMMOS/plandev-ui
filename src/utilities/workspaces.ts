import type { ActionValueSchema } from '@nasa-jpl/aerie-actions';
import JSZip from 'jszip';
import { PATH_DELIMITER } from '../constants/workspaces';
import { WorkspaceContentType } from '../enums/workspace';
import type { ActionDefinition } from '../types/actions';
import type { User } from '../types/app';
import type { ActionParameterPair, Workspace, WorkspaceInsertInput } from '../types/workspace';
import type {
  WorkspaceFileMetadata,
  WorkspaceTreeMap,
  WorkspaceTreeNode,
  WorkspaceTreeNodeWithFullPath,
} from '../types/workspace-tree-view';
import { filterEmpty } from './generic';
import { pathMatchesExtensionPattern } from './parameters';
import { reqWorkspace, reqWorkspaceMetadata } from './requests';
import { pluralize } from './text';

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
 * Removes the first path segment (typically the workspace name) from a full path.
 * Use this when converting UI paths (which include workspace name) to API paths (which are relative to workspace root).
 *
 * @param fullPath - Path with workspace name as first segment (e.g., "My Workspace (1)/folder/file.txt")
 * @returns Path without the first segment (e.g., "folder/file.txt")
 */
export function removeFirstPathSegment(fullPath: string): string {
  const parts = fullPath.split(PATH_DELIMITER);
  parts.shift();
  return parts.join(PATH_DELIMITER);
}

export type TreeSortComparator = (a: WorkspaceTreeNode, b: WorkspaceTreeNode) => number;

/**
 * Default comparator that sorts directories first, then by name alphabetically.
 */
export const defaultTreeSortComparator: TreeSortComparator = (a, b) => {
  // Directories first
  const aIsDir = a.type === WorkspaceContentType.Directory;
  const bIsDir = b.type === WorkspaceContentType.Directory;
  if (aIsDir && !bIsDir) {
    return -1;
  }
  if (!aIsDir && bIsDir) {
    return 1;
  }

  // Then alphabetically by name
  const aName = a.name?.toLowerCase() ?? '';
  const bName = b.name?.toLowerCase() ?? '';
  return aName.localeCompare(bName);
};

/**
 * Recursively sorts a workspace tree at each level using the provided comparator.
 * This preserves the tree hierarchy while sorting siblings together.
 *
 * @param nodes Array of WorkspaceTreeNode objects to sort
 * @param comparator Sort comparator function (defaults to directories first, then alphabetical)
 * @returns A new sorted array with sorted children (does not mutate original)
 */
export function sortWorkspaceTree(
  nodes: WorkspaceTreeNode[],
  comparator: TreeSortComparator = defaultTreeSortComparator,
): WorkspaceTreeNode[] {
  return [...nodes].sort(comparator).map(node => {
    if (node.contents && node.contents.length > 0) {
      return {
        ...node,
        contents: sortWorkspaceTree(node.contents, comparator),
      };
    }
    return node;
  });
}

export function getWorkspaceFileFolderDisplay(nodes: WorkspaceTreeNodeWithFullPath[]) {
  const breakdown = nodes.reduce(
    (previousBreakdown: { files: WorkspaceTreeNodeWithFullPath[]; folders: WorkspaceTreeNodeWithFullPath[] }, node) => {
      if (node.type === WorkspaceContentType.Directory) {
        return {
          ...previousBreakdown,
          folders: [...previousBreakdown.folders, node],
        };
      }

      return {
        ...previousBreakdown,
        files: [...previousBreakdown.files, node],
      };
    },
    {
      files: [],
      folders: [],
    },
  );

  return [
    `${breakdown.files.length ? `File${pluralize(breakdown.files.length)}` : ''}`,
    `${breakdown.folders.length ? `Folder${pluralize(breakdown.folders.length)}` : ''}`,
  ]
    .filter(Boolean)
    .join('/');
}

export function getSelectedFilesDisplay(filenames: string[], maxLength: number = 8) {
  const displayedNames = filenames.slice(0, maxLength);
  const remainingFiles = filenames.slice(maxLength);

  const mainText = displayedNames.join(', ');
  if (remainingFiles.length > 0) {
    return `${mainText}... and ${remainingFiles.length} more file${pluralize(remainingFiles.length)}`;
  }

  return mainText;
}

/**
 * Increments the trailing number in a filename (before the extension).
 *
 * @param filename - The full filename (e.g., "image.png" or "data(1).json")
 * @returns The new filename with the incremented number
 */
export function incrementFilename(filename: string): string {
  // 1. Identify the position of the last dot to separate name and extension.
  // We use lastIndexOf because filenames can have multiple dots (e.g. .min.js)
  const lastDotIndex = filename.indexOf('.');

  let baseName = filename;
  let extension = '';

  // We only split if a dot exists AND it isn't the first character
  // (to handle hidden files like .gitignore correctly as having no extension)
  if (lastDotIndex > 0) {
    baseName = filename.substring(0, lastDotIndex);
    extension = filename.substring(lastDotIndex);
  }

  // 2. Regex checks the END of the baseName for (number)
  const regex = /\((\d+)\)$/;
  const match = baseName.match(regex);

  if (match) {
    // Increment existing number
    const currentNumber = parseInt(match[1], 10);
    const nextNumber = currentNumber + 1;
    baseName = baseName.replace(regex, `(${nextNumber})`);
  } else {
    // Append (1) if no number exists
    baseName = `${baseName} (1)`;
  }

  // 3. Rejoin base and extension
  return baseName + extension;
}

/**
 * Recursively traverses a WorkspaceTreeNode tree structure, flattens it into an array,
 * includes the full path to each node, and uses memoization to cache results
 * based on both the input 'nodes' array and the 'currentPath'.
 *
 * @param nodes An array of WorkspaceTreeNode objects to start the traversal from.
 * @param currentPath (Internal) The path segments leading to the current 'nodes' array.
 * Defaults to an empty array for the initial top-level call.
 * @param depth (Internal) The current depth level in the tree. Defaults to 0 for root level.
 * @returns An array containing all nodes from the tree, each with its 'fullPath', 'depth', and 'hasChildren'.
 */
export function flattenWorkspaceTreeWithPaths(
  nodes: WorkspaceTreeNode[],
  currentPath: string[] = [],
  depth: number = 0,
): WorkspaceTreeNodeWithFullPath[] {
  const flattenedArray: WorkspaceTreeNodeWithFullPath[] = [];

  nodes.forEach(node => {
    const nodeName = node.name || `[Unnamed ${node.type || 'Unknown'}]`;
    const nodeFullPath = [...currentPath, nodeName];
    const hasChildren = !!(node.contents && Array.isArray(node.contents) && node.contents.length > 0);

    flattenedArray.push({
      ...node,
      depth,
      fullPath: nodeFullPath.join(PATH_DELIMITER),
      hasChildren,
    });

    if (hasChildren) {
      // Recursively call, passing the updated currentPath and incremented depth
      flattenedArray.push(...flattenWorkspaceTreeWithPaths(node.contents!, nodeFullPath, depth + 1));
    }
  });

  return flattenedArray;
}

export function findNodeInDirectory(nodeName: string, workspaceTreeNode: WorkspaceTreeNode[] = []) {
  const { filename } = separateFilenameFromPath(nodeName);
  return workspaceTreeNode.find(node => {
    return filename === node.name;
  });
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
  const allNodes = flattenWorkspaceTreeWithPaths(nodes);
  const nonDirectoryNodes = allNodes.filter(node => node.type !== WorkspaceContentType.Directory);

  const areAllNodesSequences = nonDirectoryNodes.every(node => node.type === WorkspaceContentType.Sequence);

  // any # of any type of files can be passed to a 'fileList' type param
  let allowedParamTypes = ['fileList'];
  // if they are ALL sequences, they can safely be passed to a 'sequenceList' param
  if (areAllNodesSequences) {
    allowedParamTypes.push('sequenceList');
  }
  // if only one file is selected, it can be passed to single file/sequence params
  if (nonDirectoryNodes.length === 1) {
    allowedParamTypes.push('file');
  }
  if (nonDirectoryNodes.length === 1 && areAllNodesSequences) {
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
            return schema.type === allowedType && nodesMatchParamSchema(nonDirectoryNodes, schema);
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

export type MoveFileOperation = {
  path: string;
  renameTo?: string;
};

type BulkOperationResponse = {
  item: string;
  response: string;
  status: number;
};
export type BulkOperationResponses = BulkOperationResponse[];

export function isBulkOperationSuccess(response: BulkOperationResponse) {
  // Check if status is between 200 and 299 (inclusive)
  return response.status >= 200 && response.status <= 299;
}

export function isFileConflictResponse(response: BulkOperationResponse) {
  // Check if status is between 200 and 299 (inclusive)
  return response.status === 409;
}

export const WorkspaceApi = {
  async createFolder(workspaceId: number, folderPath: string, user: User | null) {
    return reqWorkspace<Workspace>(`${workspaceId}/${folderPath}?type=directory`, 'PUT', null, user, undefined, false);
  },
  async createWorkspace(location: string, parcelId: number, user: User | null, name?: string | null): Promise<number> {
    const workspaceInsert: WorkspaceInsertInput | null = {
      parcelId: parcelId,
      workspaceLocation: location,
      ...(name ? { workspaceName: name } : {}),
    };

    return reqWorkspace<number>(`create`, 'POST', JSON.stringify(workspaceInsert), user);
  },
  async deleteFile(workspaceId: number, filePath: string, user: User | null): Promise<void> {
    return reqWorkspace(joinPath([workspaceId, filePath]), 'DELETE', null, user, undefined, true);
  },
  async deleteFileMetadata(workspaceId: number, filePath: string, user: User | null): Promise<void> {
    return reqWorkspaceMetadata<void>(joinPath([workspaceId, filePath]), 'DELETE', null, user, undefined, false);
  },
  async deleteFiles(workspaceId: number, filePaths: string[], user: User | null): Promise<BulkOperationResponses> {
    return reqWorkspace(
      joinPath(['bulk', workspaceId]),
      'DELETE',
      JSON.stringify(filePaths),
      user,
      undefined,
      true,
      false,
      {
        'Content-Type': 'application/json',
      },
    );
  },
  async deleteWorkspace(workspaceId: number, user: User | null): Promise<void> {
    return reqWorkspace(`${workspaceId}`, 'DELETE', null, user, undefined, false);
  },
  async getFileContent(workspaceId: number, filePath: string, user: User | null): Promise<string | null> {
    return reqWorkspace<string>(joinPath([workspaceId, filePath]), 'GET', null, user, undefined, false);
  },
  async getFileContentBlob(workspaceId: number, filePath: string, user: User | null): Promise<Blob | null> {
    return reqWorkspace<Blob>(joinPath([workspaceId, filePath]), 'GET', null, user, undefined, false, true);
  },
  async getFileMetadata(
    workspaceId: number,
    filePath: string,
    user: User | null,
  ): Promise<WorkspaceFileMetadata | null> {
    return reqWorkspaceMetadata<WorkspaceFileMetadata>(joinPath([workspaceId, filePath]), 'GET', null, user);
  },
  async getWorkspaceContents(
    workspaceId: number,
    path: string = '',
    user: User | null,
    withMetadata: boolean = false,
  ): Promise<WorkspaceTreeNode[] | null> {
    const url = `${joinPath([workspaceId, path])}${withMetadata ? '?withMetadata=true' : ''}`;
    return reqWorkspace<WorkspaceTreeNode[]>(url, 'GET', null, user);
  },
  async moveFile(
    workspaceId: number,
    originalPath: string,
    targetPath: string,
    shouldCopy: boolean,
    shouldOverwrite: boolean,
    user: User | null,
  ): Promise<void> {
    return reqWorkspace<void>(
      joinPath([workspaceId, originalPath]),
      'POST',
      JSON.stringify({
        [shouldCopy ? 'copyTo' : 'moveTo']: targetPath,
        overwrite: shouldOverwrite,
      }),
      user,
      undefined,
      false,
      false,
      { 'Content-Type': 'application/json' },
    );
  },
  async moveFileToWorkspace(
    workspaceId: number,
    originalPath: string,
    targetWorkspaceId: number,
    targetDirectory: string,
    shouldCopy: boolean,
    shouldOverwrite: boolean,
    user: User | null,
  ): Promise<void> {
    return reqWorkspace<void>(
      joinPath([workspaceId, originalPath]),
      'POST',
      JSON.stringify({
        [shouldCopy ? 'copyTo' : 'moveTo']: targetDirectory,
        overwrite: shouldOverwrite,
        toWorkspace: targetWorkspaceId,
      }),
      user,
      undefined,
      false,
      false,
      { 'Content-Type': 'application/json' },
    );
  },
  async moveFiles(
    workspaceId: number,
    items: MoveFileOperation[],
    targetDirectory: string,
    shouldCopy: boolean,
    shouldOverwrite: boolean,
    user: User | null,
  ): Promise<BulkOperationResponses> {
    return reqWorkspace<BulkOperationResponses>(
      joinPath(['bulk', workspaceId]),
      'POST',
      JSON.stringify({
        [shouldCopy ? 'copyTo' : 'moveTo']: targetDirectory,
        items,
        overwrite: shouldOverwrite,
      }),
      user,
      undefined,
      true,
      false,
      { 'Content-Type': 'application/json' },
    );
  },
  async moveFilesToWorkspace(
    workspaceId: number,
    items: MoveFileOperation[],
    targetWorkspaceId: number,
    targetDirectory: string,
    shouldCopy: boolean,
    shouldOverwrite: boolean,
    user: User | null,
  ): Promise<BulkOperationResponses> {
    return reqWorkspace<BulkOperationResponses>(
      joinPath(['bulk', workspaceId]),
      'POST',
      JSON.stringify({
        [shouldCopy ? 'copyTo' : 'moveTo']: targetDirectory,
        items,
        overwrite: shouldOverwrite,
        toWorkspace: targetWorkspaceId,
      }),
      user,
      undefined,
      true,
      false,
      { 'Content-Type': 'application/json' },
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
  async setFileMetadata(
    workspaceId: number,
    filePath: string,
    metadata: Partial<Pick<WorkspaceFileMetadata, 'readOnly' | 'user'>>,
    user: User | null,
  ): Promise<void> {
    return reqWorkspaceMetadata<void>(
      joinPath([workspaceId, filePath]),
      'POST',
      JSON.stringify(metadata),
      user,
      undefined,
      false,
    );
  },
  async unsetFileMetadataKeys(workspaceId: number, filePath: string, keys: string[], user: User | null): Promise<void> {
    return reqWorkspaceMetadata<void>(
      joinPath(['unset', workspaceId, filePath]),
      'POST',
      JSON.stringify(keys),
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
    shouldOverwrite: boolean,
    user: User | null,
  ): Promise<void> {
    const body = new FormData();
    body.append('file', file, file.name);
    return reqWorkspace<void>(
      `${joinPath([workspaceId, targetDirectory, filename])}?type=file&overwrite=${shouldOverwrite}`,
      'PUT',
      body,
      user,
      undefined,
      false,
    );
  },
  async uploadFiles(
    workspaceId: number,
    targetDirectory: string,
    files: File[],
    shouldOverwrite: boolean,
    user: User | null,
  ): Promise<BulkOperationResponses> {
    const body = JSON.stringify(
      files.map(file => ({
        overwrite: shouldOverwrite,
        path: `${joinPath([targetDirectory, file.name])}`,
        type: 'file',
      })),
    );
    const form = new FormData();
    form.append('body', body);
    files.forEach(file => {
      form.append('files', file);
    });
    return reqWorkspace<BulkOperationResponses>(
      `${joinPath(['bulk', workspaceId])}`,
      'PUT',
      form,
      user,
      undefined,
      true,
    );
  },
};

/**
 * Finds a node in the list that matches or contains the given path.
 * A node "affects" a path if it is the path itself, or if it is a parent directory of the path.
 */
export function findNodeAffectingPath(
  nodes: WorkspaceTreeNodeWithFullPath[],
  path: string | null,
): WorkspaceTreeNodeWithFullPath | undefined {
  if (!path) {
    return undefined;
  }
  return nodes.find(
    node =>
      node.fullPath === path || (node.type === WorkspaceContentType.Directory && path.startsWith(node.fullPath + '/')),
  );
}

// Find a node in the tree by its path
export function findNodeByPath(nodes: WorkspaceTreeNode[], targetPath: string): WorkspaceTreeNode | null {
  const pathParts = targetPath.split(PATH_DELIMITER);

  let currentNodes = nodes;
  let currentNode: WorkspaceTreeNode | null = null;
  console.log('currentNodes :>> ', currentNodes, pathParts);
  for (const part of pathParts) {
    currentNode = currentNodes.find(n => n.name === part) ?? null;
    if (!currentNode) {
      return null;
    }
    currentNodes = currentNode.contents ?? [];
  }

  return currentNode;
}

export interface TreeFilterResult {
  /** Paths of ancestors that should remain visible to show matching descendants */
  ancestorPaths: Set<string>;
  /** Paths that directly match the filter text */
  matchingPaths: Set<string>;
}

/**
 * Computes which tree nodes match a filter and which ancestors should be visible.
 */
export function computeTreeFilter(nodes: WorkspaceTreeNodeWithFullPath[], filterText: string): TreeFilterResult {
  if (!filterText) {
    return {
      ancestorPaths: new Set(),
      matchingPaths: new Set(),
    };
  }

  const lowerFilter = filterText.toLowerCase();
  const matchingPaths = new Set<string>();
  const ancestorPaths = new Set<string>();

  for (const node of nodes) {
    const name = node.name?.toLowerCase() ?? '';
    const metadata = node.metadata;
    const matchesName = name.includes(lowerFilter);
    const matchesMetadata =
      metadata &&
      ((metadata.lastEditedBy?.toLowerCase().includes(lowerFilter) ?? false) ||
        (metadata.createdBy?.toLowerCase().includes(lowerFilter) ?? false) ||
        (metadata.version?.toLowerCase().includes(lowerFilter) ?? false) ||
        (metadata.user ? JSON.stringify(metadata.user).toLowerCase().includes(lowerFilter) : false));

    if (matchesName || matchesMetadata) {
      matchingPaths.add(node.fullPath);

      // Add all ancestors to keep them visible
      const pathParts = node.fullPath.split(PATH_DELIMITER);
      for (let i = 1; i < pathParts.length; i++) {
        const ancestorPath = pathParts.slice(0, i).join(PATH_DELIMITER);
        ancestorPaths.add(ancestorPath);
      }
    }
  }

  return { ancestorPaths, matchingPaths };
}

/**
 * Determines if a tree node should be visible based on filter and expansion state.
 */
export function shouldNodeBeVisible(
  fullPath: string,
  depth: number,
  filterText: string,
  matchingPaths: Set<string>,
  ancestorPaths: Set<string>,
  expandedPaths: Set<string>,
  currentRootPath: string,
): boolean {
  // If filtering is active, check if this node should be visible
  if (filterText) {
    const isMatch = matchingPaths.has(fullPath);
    const isAncestorOfMatch = ancestorPaths.has(fullPath);

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
  const pathParts = fullPath.split(PATH_DELIMITER);

  // Start checking from the first folder after currentRootPath
  for (let i = currentRootDepth + 1; i < pathParts.length; i++) {
    const ancestorPath = pathParts.slice(0, i).join(PATH_DELIMITER);
    if (!expandedPaths.has(ancestorPath)) {
      return false;
    }
  }

  return true;
}

/**
 * Removes nodes whose paths are already covered by a selected parent directory.
 * For example, if `/foo` and `/foo/bar.txt` are both selected, `/foo/bar.txt` is redundant.
 */
export function removeRedundantNodes(nodes: WorkspaceTreeNodeWithFullPath[]): WorkspaceTreeNodeWithFullPath[] {
  // Sort by path length so parents come before children
  const sorted = [...nodes].sort((a, b) => a.fullPath.length - b.fullPath.length);
  const keptPaths: string[] = [];

  return sorted.filter(node => {
    // Check if any already-kept path is a parent of this node
    const isRedundant = keptPaths.some(parentPath => node.fullPath.startsWith(parentPath + '/'));
    if (!isRedundant) {
      keptPaths.push(node.fullPath);
    }
    return !isRedundant;
  });
}

/**
 * Computes the new file path after a move operation, accounting for when the file
 * was moved as part of a parent folder rather than directly.
 *
 * @param originalFilePath - The original full path of the file being tracked
 * @param movedNodes - The nodes that were actually moved (after removing redundant children)
 * @param targetDirectoryPath - The target directory where nodes were moved to
 * @returns The new full path where the file now resides
 */
export function computeMovedFilePath(
  originalFilePath: string,
  movedNodes: { fullPath: string }[],
  targetDirectoryPath: string,
  renamedFiles: Record<string, string> = {},
): string {
  // Find if the file was moved as part of a parent folder
  const parentNode = movedNodes.find(
    node => node.fullPath !== originalFilePath && originalFilePath.startsWith(node.fullPath + '/'),
  );

  if (parentNode) {
    // File was inside a moved parent folder
    // Get the relative path from the parent folder to the file
    const relativePath = originalFilePath.slice(parentNode.fullPath.length + 1);
    // Get the parent folder name
    const { filename: parentFolderName } = separateFilenameFromPath(parentNode.fullPath);
    // Construct: targetDir/parentFolder/relativePath
    return targetDirectoryPath
      ? `${targetDirectoryPath}/${parentFolderName}/${relativePath}`
      : `${parentFolderName}/${relativePath}`;
  }

  // File was moved directly (not via parent)
  // Check if the file was renamed due to "keep both" conflict resolution
  const renamedFilename = renamedFiles[originalFilePath];
  const { filename } = separateFilenameFromPath(originalFilePath);
  const finalFilename = renamedFilename ?? filename;
  return targetDirectoryPath ? `${targetDirectoryPath}/${finalFilename}` : (finalFilename ?? '');
}

/**
 * Gets the common directory prefix from a list of paths.
 */
export function getCommonPathPrefix(paths: string[]): string {
  if (paths.length === 0) {
    return '';
  }
  if (paths.length === 1) {
    // For a single path, return its parent directory
    const parts = paths[0].split('/');
    return parts.slice(0, -1).join('/');
  }

  const splitPaths = paths.map(p => p.split('/'));
  const minLength = Math.min(...splitPaths.map(p => p.length));
  const commonParts: string[] = [];

  for (let i = 0; i < minLength; i++) {
    const segment = splitPaths[0][i];
    if (splitPaths.every(p => p[i] === segment)) {
      commonParts.push(segment);
    } else {
      break;
    }
  }

  return commonParts.join('/');
}

/**
 * Recursively checks if a node or any of its descendants have readonly files
 * @param node The WorkspaceTreeNode to check
 * @returns true if the node or any descendant has readOnly metadata set to true
 */
export function hasReadonlyInTree(node: WorkspaceTreeNode): boolean {
  // Check if the current node itself is readonly
  if (node.metadata?.readOnly) {
    return true;
  }

  // If it's a directory, recursively check all contents
  if (node.type === WorkspaceContentType.Directory && node.contents) {
    return node.contents.some(childNode => hasReadonlyInTree(childNode));
  }

  return false;
}

/**
 * Downloads multiple workspace nodes as a zip file, preserving folder structure.
 * Removes redundant nodes (children of selected parents) before downloading.
 */
export async function downloadWorkspaceNodesAsZip(options: {
  allFiles: WorkspaceTreeNodeWithFullPath[];
  nodes: WorkspaceTreeNodeWithFullPath[];
  onError?: (message: string) => void;
  user: User | null;
  workspaceId: number;
  workspaceName?: string;
}): Promise<void> {
  const { allFiles, nodes, onError, user, workspaceId, workspaceName } = options;

  // Compute the minimal set of nodes to zip
  const minimalNodes = removeRedundantNodes(nodes);

  // Collect all file paths to include in the zip
  const filesToZip: string[] = [];
  for (const node of minimalNodes) {
    if (node.type === WorkspaceContentType.Directory) {
      // Add all files under this directory
      const filesUnderDir = allFiles.filter(
        file => file.fullPath.startsWith(node.fullPath + '/') && file.type !== WorkspaceContentType.Directory,
      );
      filesToZip.push(...filesUnderDir.map(f => f.fullPath));
    } else {
      filesToZip.push(node.fullPath);
    }
  }

  if (filesToZip.length === 0) {
    return;
  }

  // Determine common prefix to strip from paths in the zip
  const commonPrefix = getCommonPathPrefix(minimalNodes.map(n => n.fullPath));

  // Create zip and add files
  const zip = new JSZip();
  let failedFiles = 0;

  const fetchPromises = filesToZip.map(async filePath => {
    try {
      const blob = await WorkspaceApi.getFileContentBlob(workspaceId, filePath, user);
      if (blob) {
        // Strip common prefix to get relative path in zip, preserving folder structure
        let relativePath: string;
        if (commonPrefix && filePath.startsWith(commonPrefix + '/')) {
          relativePath = filePath.slice(commonPrefix.length + 1);
        } else if (!commonPrefix) {
          // No common prefix (root-level selection), keep the full path
          relativePath = filePath;
        } else {
          // Fallback for edge cases
          relativePath = filePath;
        }
        zip.file(relativePath, blob);
      } else {
        failedFiles++;
      }
    } catch {
      failedFiles++;
    }
  });

  await Promise.all(fetchPromises);

  // Check if we have any files to download
  if (Object.keys(zip.files).length === 0) {
    onError?.('Failed to download files');
    return;
  }

  if (failedFiles > 0) {
    onError?.(`${failedFiles} file${failedFiles > 1 ? 's' : ''} could not be included in the download`);
  }

  // Generate and download the zip
  const zippedContent = await zip.generateAsync({ type: 'blob' });

  // Determine zip file name
  let zipName: string;
  if (minimalNodes.length === 1) {
    // Single item: use the item's name (without extension for files)
    const nodeName = minimalNodes[0].fullPath.split('/').pop() || 'download';
    zipName =
      minimalNodes[0].type === WorkspaceContentType.Directory ? nodeName : nodeName.replace(/\.[^.]+$/, '') || nodeName;
  } else if (commonPrefix) {
    // Multiple items with common parent: use the common parent folder name
    zipName = commonPrefix.split('/').pop() || 'download';
  } else {
    // Multiple items with no common parent: use workspace name + selected_files
    zipName = workspaceName ? `${workspaceName}_selected_files` : 'selected_files';
  }

  const link = document.createElement('a');
  link.href = URL.createObjectURL(zippedContent);
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
