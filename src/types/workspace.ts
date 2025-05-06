import type { UserId } from './app';
import type { WorkspaceTreeNode } from './workspace-tree-view';

export type Workspace = {
  created_at: string;
  disk_location: string;
  id: number;
  name: string;
  owner: UserId;
  parcel_id: number;
  updated_at: string;
};

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
