import type { ActionDefinition } from './actions';
import type { UserId } from './app';
import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from './workspace-tree-view';

export type WorkspaceCollaborator = {
  collaborator: UserId;
  workspace_id: number;
};

export type Workspace = {
  collaborators: WorkspaceCollaborator[];
  created_at: string;
  disk_location: string;
  id: number;
  name: string;
  owner: UserId;
  parcel_id: number;
  updated_at: string;
};

export type WorkspaceMetadata = Pick<Workspace, 'name' | 'owner' | 'parcel_id'>;

export type WorkspaceInsertInput = {
  parcelId: number;
  workspaceLocation: string;
  workspaceName?: string;
};

export type WorkspaceNodeEvent = {
  treeNode: WorkspaceTreeNode;
  treeNodePath: string;
};

export type WorkspaceNodesEvent = {
  hasReadOnlyNodes?: boolean;
  treeNodes: WorkspaceTreeNodeWithFullPath[];
};

export type ActionParameterPair = { action: ActionDefinition; parameter: string };

export type WorkspaceNodeRunActionEvent = WorkspaceNodesEvent & {
  actionParameterPair: ActionParameterPair;
};

/** One immutable revision of a single workspace file (returned by the file-versioning API). */
export type WorkspaceFileRevision = {
  author: string;
  commitSha: string;
  contentHash: string;
  createdAt: string;
  fileId: string;
  message: string;
  name: string;
  number: number;
  path: string;
};

/** Result of restoring a file's working copy to a revision. */
export type WorkspaceRevisionRestoreResult = {
  etag: string;
  name: string;
  number: number;
};
