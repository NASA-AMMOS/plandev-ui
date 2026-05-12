import type { WorkspaceContentType } from '../enums/workspace';

export type WorkspaceFileMetadataStatus = 'malformed' | 'missing' | 'ok';

export type WorkspaceFileMetadata = {
  createdAt?: string;
  createdBy?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
  readOnly?: boolean;
  user?: Record<string, unknown>;
  version?: string;
};

export type WorkspaceTreeNode = {
  contents?: WorkspaceTreeNode[];
  metadata?: WorkspaceFileMetadata | null;
  metadataStatus?: WorkspaceFileMetadataStatus;
  name?: string;
  type: WorkspaceContentType;
};

export type WorkspaceTreeNodeWithFullPath = WorkspaceTreeNode & {
  depth?: number;
  fullPath: string;
  hasChildren?: boolean;
};

export type WorkspaceTreeMap = Record<string, WorkspaceTreeNode>;
