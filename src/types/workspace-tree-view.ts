import type { WorkspaceContentType } from '../enums/workspace';

export type WorkspaceTreeNode = {
  contents?: WorkspaceTreeNode[];
  name?: string;
  type?: WorkspaceContentType;
};
