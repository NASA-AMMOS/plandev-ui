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
  /** Whether a single-file download should be named with its matching revision's letter, if any. */
  withRevision?: boolean;
};

export type ActionParameterPair = { action: ActionDefinition; parameter: string };

export type WorkspaceNodeRunActionEvent = WorkspaceNodesEvent & {
  actionParameterPair: ActionParameterPair;
};

/** An explicit, immutable checkpoint of one file ("a", "b", ...). Never created by a save. */
export type WorkspaceFileRevision = {
  createdAt: string;
  createdBy: string | null;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
  message: string;
  name: string;
  pathAtRevision: string;
};

/** A revision plus its versioned metadata as it was then (no readOnly or lastEdited*). */
export type WorkspaceFileRevisionDetail = {
  fileMetadata: Record<string, unknown>;
  versionMetadata: WorkspaceFileRevision;
};

/** A file's revisions, oldest first, plus which of them (if any) holds the saved copy. */
export type WorkspaceFileRevisionList = {
  matchingRevision: string | null;
  revisions: WorkspaceFileRevision[];
};
