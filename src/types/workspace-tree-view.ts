import type { WorkspaceContentType } from '../enums/workspace';

export type WorkspaceTreeNode = {
  contents?: WorkspaceTreeNode[];
  name?: string;
  type: WorkspaceContentType;
};

export type WorkspaceTreeNodeWithFullPath = WorkspaceTreeNode & {
  fullPath: string;
};

export type WorkspaceTreeMap = Record<string, WorkspaceTreeNode>;
