export type TreeNode = {
  children?: TreeNode[];
  id: string | number;
  label?: string;
  type?: string;
};
