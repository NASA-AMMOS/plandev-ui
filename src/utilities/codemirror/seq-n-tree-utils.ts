import type { SyntaxNode } from '@lezer/common';
import {
  TOKEN_ACTIVATE,
  TOKEN_COMMAND,
  TOKEN_GROUND_BLOCK,
  TOKEN_GROUND_EVENT,
  TOKEN_LOAD,
  TOKEN_REQUEST,
} from '../../constants/seq-n-grammar-constants';
import { getNearestAncestorNodeOfType } from '../sequence-editor/tree-utils';

export function getNameNode(stepNode: SyntaxNode | null) {
  if (stepNode) {
    switch (stepNode.name) {
      case TOKEN_ACTIVATE:
      case TOKEN_LOAD:
        return stepNode.getChild('SequenceName');
      case TOKEN_GROUND_BLOCK:
      case TOKEN_GROUND_EVENT:
        return stepNode.getChild('GroundName');
      case TOKEN_COMMAND:
        return stepNode.getChild('Stem');
      case TOKEN_REQUEST:
        return stepNode.getChild('RequestName');
    }
  }

  return null;
}

export function getAncestorStepOrRequest(node: SyntaxNode | null) {
  return getNearestAncestorNodeOfType(node, [
    TOKEN_COMMAND,
    TOKEN_ACTIVATE,
    TOKEN_GROUND_BLOCK,
    TOKEN_GROUND_EVENT,
    TOKEN_LOAD,
    TOKEN_REQUEST,
  ]);
}
