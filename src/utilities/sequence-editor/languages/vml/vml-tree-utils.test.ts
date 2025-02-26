import type { SyntaxNode } from '@lezer/common';
import { describe, expect, test } from 'vitest';
import { filterNodes, nodeContents } from '../../tree-utils';
import { VmlLanguage } from './vml';
import { RULE_CALL_PARAMETERS, RULE_FUNCTION_NAME, RULE_TIME_TAGGED_STATEMENT } from './vml-constants';
import { getArgumentPosition, VmlCommandInfoMapper } from './vml-tree-utils';

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

  test('filterNodes finds time tagged statements', () => {
    expect(timeTaggedNodes.length).toBe(3);
  });

  test.each([
    [0, 'CMD_001'],
    [1, 'CMD_002'],
    [2, null],
  ])('command[%i] has stem %s', (statementIndex: number, expectedStem: string | null) => {
    const nameNode = vmlCommandInfoMapper.getNameNode(timeTaggedNodes[statementIndex]);
    if (expectedStem) {
      expect(nameNode).toBeDefined();
      expect(nameNode?.name).toBe(RULE_FUNCTION_NAME);
      expect(nodeContents(input, nameNode!)).toBe(expectedStem);
    } else {
      expect(nameNode).toBeNull();
    }
  });

  test.each([
    [0, 2],
    [1, 4],
    [2, 1],
  ])('command[%i] has %s argument(s)', (statementIndex: number, argCount: number) => {
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
  ])("argument value '%s' is at index %i of its command", (argumentValue: string, argIndexInCommand: number) => {
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

// TODO: reword this description
describe('vml command info mapper', () => {
  test('getVariables returns module variables and sequence/block parameters and variables', () => {
    const input = `MODULE

VARIABLES
  DECLARE DOUBLE partial_product := 0.0
  DECLARE STRING file_base := "d:/cfg/instrument_"
END_VARIABLES


BLOCK special_watch
INPUT delay_time
INPUT INT mode := 3 VALUES 1..6, 8..9
DECLARE INT i := 0
DECLARE INT value := 0
DECLARE UINT mask := 0xffff
DECLARE STRING file_name := ""
DECLARE STRING str := ""
FLAGS AUTOEXECUTE AUTOUNLOAD
BODY
;initialize variables
R00:00:01.00 ISSUE CMD_001 "ENUM_B",FALSE_VM_CONST
R00:00:01.00 ISSUE CMD_002 1,2,3,4


;TEST CASE 1
R00:01:00 CALL pay_spawn "seis_pwr_on_r01_1"

END_BODY

BLOCK another_block
INPUT cant_see_me
; these parameters should be unseen as they're out of scope of cursor position in test
BODY
END_BODY
END_MODULE
    `;

    const moduleVariables = ['partial_product', 'file_base'];
    const parsed = VmlLanguage.parser.parse(input);
    const vmlCommandInfoMapper = new VmlCommandInfoMapper();
    const variableNames = vmlCommandInfoMapper.getVariables(input, parsed, input.indexOf('CMD_002'));
    expect(variableNames).toEqual([...moduleVariables, 'delay_time', 'mode', 'i', 'value', 'mask', 'file_name', 'str']);

    // 2nd block has different scope
    const variableNames2 = vmlCommandInfoMapper.getVariables(
      input,
      parsed,
      input.indexOf('another_block') + 'another_block'.length,
    );
    expect(variableNames2).toEqual([...moduleVariables, 'cant_see_me']);
  });
});
