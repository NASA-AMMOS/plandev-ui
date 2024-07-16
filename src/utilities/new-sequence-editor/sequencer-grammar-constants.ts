import type { SyntaxNode } from '@lezer/common';

export const TOKEN_ACTIVATE = 'Activate';
export const TOKEN_GROUND_BLOCK = 'GroundBlock';
export const TOKEN_GROUND_EVENT = 'GroundEvent';
export const TOKEN_LOAD = 'Load';
export const TOKEN_COMMAND = 'Command';
export const TOKEN_REQUEST = 'Request';
export const TOKEN_REPEAT_ARG = 'RepeatArg';
export const TOKEN_ERROR = '⚠';

export function getNameNode(stepNode: SyntaxNode | null) {
  if (stepNode) {
    switch (stepNode.name) {
      case TOKEN_ACTIVATE:
      case TOKEN_LOAD:
        return stepNode.getChild('SequenceName');
      case TOKEN_GROUND_BLOCK:
      case TOKEN_GROUND_EVENT: {
        return stepNode.getChild('GroundName');
      }
      case TOKEN_COMMAND: {
        return stepNode.getChild('Stem');
      }
    }
  }

  return null;
}
