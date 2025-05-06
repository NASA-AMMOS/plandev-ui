export type WorkspaceTreeNode = {
  children?: WorkspaceTreeNode[];
  id: string | number;
  label?: string;
  type?: string;
};
