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
  toggleState?: boolean;
  treeNode: WorkspaceTreeNode;
  treeNodePath: string;
};

export type ActionParameterPair = { action: ActionDefinition; parameter: string };

export type WorkspaceNodeRunActionEvent = {
  actionParameterPair: ActionParameterPair;
  treeNodes: WorkspaceTreeNodeWithFullPath[];
};
