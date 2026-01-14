import type { WorkspaceContentType } from '../enums/workspace';

export type WorkspaceTreeNode = {
  contents?: WorkspaceTreeNode[];
  name?: string;
  type: WorkspaceContentType;
};

export type WorkspaceTreeNodeWithFullPath = WorkspaceTreeNode & {
  depth?: number;
  fullPath: string;
  hasChildren?: boolean;
};

export type WorkspaceTreeMap = Record<string, WorkspaceTreeNode>;
