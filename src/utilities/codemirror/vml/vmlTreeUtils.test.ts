import type { SyntaxNode } from '@lezer/common';
import { describe, expect, test } from 'vitest';
import { filterNodes, nodeContents } from '../../sequence-editor/tree-utils';
import { VmlLanguage } from './vml';
import { RULE_CALL_PARAMETERS, RULE_FUNCTION_NAME, RULE_TIME_TAGGED_STATEMENT } from './vmlConstants';
import { getArgumentPosition, VmlCommandInfoMapper } from './vmlTreeUtils';

describe('vml command info mapper', () => {
  const input = `MODULE

RELATIVE_SEQUENCE vnv
FLAGS AUTOEXECUTE AUTOUNLOAD
BODY
;initialize variables
R00:00:01.00 ISSUE CMD_001 "ENUM_B",FALSE_VM_CONST
R00:00:01.00 ISSUE CMD_002 1,2,3,4


;TEST CASE 1
R00:01:00 CALL pay_spawn "seis_pwr_on_r01_1"

END_BODY
END_MODULE
`;
  const parsed = VmlLanguage.parser.parse(input);
  const vmlCommandInfoMapper = new VmlCommandInfoMapper();
  const timeTaggedNodes: SyntaxNode[] = Array.from(
    filterNodes(parsed.cursor(), (node: SyntaxNode) => node.name === RULE_TIME_TAGGED_STATEMENT),
  );

  test('time tagged count', () => {
    expect(timeTaggedNodes.length).toBe(3);
  });

  test.each([
    [0, 'CMD_001'],
    [1, 'CMD_002'],
    [2, null],
  ])('command %i name %s', (statementIndex: number, expectedStem: string | null) => {
    const nameNode = vmlCommandInfoMapper.getNameNode(timeTaggedNodes[statementIndex]);
    if (expectedStem) {
      expect(nameNode).toBeDefined();
      expect(nameNode!.name).toBe(RULE_FUNCTION_NAME);
      expect(nodeContents(input, nameNode!)).toBe(expectedStem);
    }
  });

  test.each([
    [0, 2],
    [1, 4],
    [2, 1],
  ])('command %i argument count %s', (statementIndex: number, argCount: number) => {
    const argContainer = vmlCommandInfoMapper.getArgumentNodeContainer(timeTaggedNodes[statementIndex]);
    expect(argContainer).toBeDefined();
    expect(argContainer!.name).toBe(RULE_CALL_PARAMETERS);
    expect(vmlCommandInfoMapper.getArgumentsFromContainer(argContainer!).length).toBe(argCount);
  });

  test.each([
    ['"ENUM_B"', 0],
    ['FALSE_VM_CONST', 1],
    ['1', 0],
    ['2', 1],
    ['3', 2],
    ['4', 3],
  ])("argument value '%s' index %i", (argumentValue: string, argIndexInCommand: number) => {
    const argValueFilter = (node: SyntaxNode) => nodeContents(input, node) === argumentValue;
    const argNode = filterNodes(parsed.cursor(), argValueFilter).next().value as SyntaxNode;
    expect(argNode).toBeDefined();
    expect(getArgumentPosition(argNode)).toBe(argIndexInCommand);
  });

  test('arg insert position', () => {
    const uniqArgValue = 'FALSE_VM_CONST';
    const inputPosition = input.indexOf(uniqArgValue) + uniqArgValue.length;
    const argValueFilter = (node: SyntaxNode) => nodeContents(input, node) === uniqArgValue;
    const argNode = filterNodes(parsed.cursor(), argValueFilter).next().value as SyntaxNode;
    const cmdNode = vmlCommandInfoMapper.getContainingCommand(argNode);
    expect(vmlCommandInfoMapper.getArgumentAppendPosition(cmdNode)).toBe(inputPosition);
  });
});
