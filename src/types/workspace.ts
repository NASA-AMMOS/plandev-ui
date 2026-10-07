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

/** An explicit, immutable checkpoint of one file ("a", "b", ...). Never created by a save. */
export type WorkspaceFileRevision = {
  createdAt: string;
  createdBy: string | null;
  id: string;
  name: string;
  ordinal: number;
  pathAtRevision: string;
};

/** A revision plus its versioned metadata as it was then (no readOnly or lastEdited*). */
export type WorkspaceFileRevisionDetail = WorkspaceFileRevision & { metadata: Record<string, unknown> };

/** A file's revisions, oldest first, plus which of them (if any) holds the saved copy. */
export type WorkspaceFileRevisionList = {
  fileId: string | null;
  latestRevision: WorkspaceFileRevision | null;
  /** Newest revision whose content and versioned metadata equal the saved copy's; null if none does. */
  matchingRevision: WorkspaceFileRevision | null;
  revisions: WorkspaceFileRevision[];
  /** Covers content plus versioned metadata; restore's If-Match. Not the editor's save ETag. */
  workingCopyETag: string;
};
