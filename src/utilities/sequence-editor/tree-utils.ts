import type { SyntaxNode } from '@lezer/common';

export function numberOfChildren(node: SyntaxNode): number {
  let count = 0;
  let child = node.firstChild;
  while (child) {
    count++;
    child = child.nextSibling;
  }
  return count;
}

export function getChildrenNode(node: SyntaxNode): SyntaxNode[] {
  const children = [];
  let child = node.firstChild;
  while (child) {
    children.push(child);
    child = child.nextSibling;
  }
  return children;
}

export function getDeepestNode(node: SyntaxNode): SyntaxNode {
  let currentNode = node;
  while (currentNode.firstChild) {
    currentNode = currentNode.firstChild;
  }
  while (currentNode.nextSibling) {
    currentNode = currentNode.nextSibling;
  }
  return currentNode;
}

export function getFromAndTo(nodes: (SyntaxNode | null)[]): { from: number; to: number } {
  return nodes.reduce(
    (acc, node) => {
      if (node === null) {
        return acc;
      }
      return {
        from: Math.min(acc.from, node.from),
        to: Math.max(acc.to, node.to),
      };
    },
    { from: Number.MAX_VALUE, to: Number.MIN_VALUE },
  );
}

export function getNearestAncestorNodeOfType(node: SyntaxNode | null, ancestorTypes: string[]) {
  let ancestorNode: SyntaxNode | null = node;

  while (ancestorNode && !ancestorTypes.includes(ancestorNode.name)) {
    ancestorNode = ancestorNode.parent;
  }
  return ancestorNode;
}
