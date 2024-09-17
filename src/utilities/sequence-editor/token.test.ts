/* eslint-disable no-undef */

import type { SyntaxNode, Tree } from '@lezer/common';
import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { assert, describe, it } from 'vitest';
import { SeqLanguage } from '../codemirror';

const ERROR = '⚠';
const ENUM_TOKEN = 'Enum';
const LINE_COMMENT_TOKEN = 'LineComment';
const STEM_TOKEN = 'Stem';
const STRING_TOKEN = 'String';
const METADATA_TOKEN = 'Metadata';
const METADATA_ENTRY_TOKEN = 'MetaEntry';
const ID_DECLARATION = 'IdDeclaration';
const PARAMETER_DECLARATION = 'ParameterDeclaration';
const LOCAL_DECLARATION = 'LocalDeclaration';
const ACTIVATE_NODE = 'Activate';
const LOAD_NODE = 'Load';
const GROUND_BLOCK_NODE = 'GroundBlock';
const GROUND_EVENT_NODE = 'GroundEvent';

function getMetaType(node: SyntaxNode) {
  return node?.firstChild?.nextSibling?.firstChild?.name;
}

function getMetaValue(node: SyntaxNode, input: string) {
  const mv = node?.firstChild?.nextSibling?.firstChild;
  return JSON.parse(input.slice(mv!.from, mv!.to));
}

function getNodeText(node: SyntaxNode, input: string) {
  return input.slice(node.from, node.to);
}

describe('metadata', () => {
  it('primitive types', () => {
    const input = `
@METADATA "name 1" "string val"
@METADATA "name 2" false
@METADATA "name3" 3
@METADATA "name4" 4e1
C STEM
`;
    const parseTree = SeqLanguage.parser.parse(input);
    assertNoErrorNodes(input);
    const topLevelMetaData = parseTree.topNode.getChild(METADATA_TOKEN);
    const metaEntries = topLevelMetaData!.getChildren(METADATA_ENTRY_TOKEN);
    assert.equal(metaEntries.length, 4);
    assert.equal(getMetaType(metaEntries[0]), STRING_TOKEN);
    assert.equal(getMetaType(metaEntries[1]), 'Boolean');
    assert.equal(getMetaType(metaEntries[2]), 'Number');
    assert.equal(getMetaType(metaEntries[3]), 'Number');
  });

  it('structured types', () => {
    const input = `
@METADATA "name 1" [ 1,2  , 3 ]
@METADATA "name 2" ["a",    true  ,
  2 ]

@METADATA "name 3" {
   "level1": {
     "level2": [
       false,
       1,
       "two"
     ],
     "level2 nest": {
      "level3": true
     }
   }
}

          @METADATA  "name 4"         {}

C STEM
`;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    const topLevelMetaData = parseTree.topNode.getChild(METADATA_TOKEN);
    const metaEntries = topLevelMetaData!.getChildren(METADATA_ENTRY_TOKEN);
    assert.equal(metaEntries.length, 4);
    assert.equal(getMetaType(metaEntries[0]), 'Array');
    assert.equal(getMetaType(metaEntries[1]), 'Array');
    assert.equal(getMetaType(metaEntries[2]), 'Object');
    assert.equal(getMetaType(metaEntries[3]), 'Object');
    assert.deepStrictEqual(getMetaValue(metaEntries[0], input), [1, 2, 3]);
    assert.deepStrictEqual(getMetaValue(metaEntries[1], input), ['a', true, 2]);
    assert.deepStrictEqual(getMetaValue(metaEntries[2], input), {
      level1: {
        level2: [false, 1, 'two'],
        'level2 nest': {
          level3: true,
        },
      },
    });
    assert.deepStrictEqual(getMetaValue(metaEntries[3], input), {});
  });
});

describe('header directives', () => {
  function getIdValue(parseTree: Tree, input: string) {
    const idToken = parseTree.topNode.getChild(ID_DECLARATION)?.firstChild;
    if (idToken) {
      return input.slice(idToken.from, idToken.to);
    }
    return null;
  }

  function allPermutations(inputArr: string[]) {
    const result: string[][] = [];
    function permute(arr: string[], m: string[] = []) {
      if (arr.length === 0) {
        result.push(m);
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    }
    permute(inputArr);
    return result;
  }

  it('expected id', () => {
    const input = `
  @ID "test.name"

  C CMD_NO_ARGS
    `;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    assert.equal(getIdValue(parseTree, input), '"test.name"');
  });

  it('enum id type', () => {
    // This is an error in the linter, but an easy mistake to mistake
    const input = `
  @ID test_name

  C CMD_NO_ARGS
    `;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    assert.equal(getIdValue(parseTree, input), 'test_name');
  });

  it('number id type', () => {
    // This is an error in the linter, but an easy mistake to mistake
    const input = `
  @ID 21

  C CMD_NO_ARGS
    `;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    assert.equal(getIdValue(parseTree, input), '21');
  });

  it('all permutations', () => {
    const permutations = allPermutations([
      `@ID "test.seq"`,
      `@INPUT_PARAMS L01STR L02STR`,
      `@LOCALS L01INT L02INT L01UINT L02UINT`,
    ]);
    permutations.forEach((ordering: string[]) => {
      const input = ordering.join('\n\n');
      assertNoErrorNodes(input);
      const parseTree = SeqLanguage.parser.parse(input);
      assert.equal(getIdValue(parseTree, input), `"test.seq"`);
      assert.deepEqual(
        parseTree.topNode
          .getChild(LOCAL_DECLARATION)
          ?.getChildren(ENUM_TOKEN)
          .map(node => getNodeText(node, input)),
        ['L01INT', 'L02INT', 'L01UINT', 'L02UINT'],
      );
      assert.deepEqual(
        parseTree.topNode
          .getChild(PARAMETER_DECLARATION)
          ?.getChildren(ENUM_TOKEN)
          .map(node => getNodeText(node, input)),
        ['L01STR', 'L02STR'],
      );
    });
  });
});

describe('seqgen directives', () => {
  it('activates', () => {
    const input = `
A2024-123T12:34:56 @ACTIVATE("activate.name") # No Args
@ENGINE 10
@EPOCH "epoch string"
R123T12:34:56 @ACTIVATE("act2.name") "foo" 1 2 3  # Comment text
@ENGINE -1
  `;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    const activates = parseTree.topNode.firstChild?.getChildren(ACTIVATE_NODE);
    assert.equal(activates?.length, 2);
  });

  it('loads', () => {
    const input = `
  A2024-123T12:34:56 @LOAD("load.name") # No Args
  @ENGINE 10
  @EPOCH "epoch string"
  R123T12:34:56 @LOAD("load2.name") "foo" 1 2 3  # No Args
  @ENGINE -1
    `;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    const activates = parseTree.topNode.firstChild?.getChildren(LOAD_NODE);
    assert.equal(activates?.length, 2);
  });

  it('ground', () => {
    const input = `
A2024-123T12:34:56 @GROUND_BLOCK("ground_block.name") # No Args
R123T12:34:56 @GROUND_EVENT("ground_event.name") "foo" 1 2 3  # No Args
  `;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    assert.isNotNull(parseTree.topNode.firstChild);
    const groundBlocks = parseTree.topNode.firstChild!.getChildren(GROUND_BLOCK_NODE);
    assert.equal(groundBlocks.length, 1);
    assert.equal(getNodeText(groundBlocks[0].getChild('GroundName')!, input), '"ground_block.name"');
    const groundEvents = parseTree.topNode.firstChild!.getChildren(GROUND_EVENT_NODE);
    assert.equal(groundEvents.length, 1);
    assert.equal(getNodeText(groundEvents[0].getChild('GroundName')!, input), '"ground_event.name"');
  });

  it('request', () => {
    const input = `G3 "Name" @REQUEST_BEGIN("request.name") # Description Text
  C CMD_0 1 2 3
  @METADATA "foo" "bar"
  @MODEL "a" 1 "00:00:00"
  R100 CMD_1 "1 2 3"
  C CMD_2 1 2 3
  R100 CMD_3 "1 2 3"
@REQUEST_END
@METADATA "sub_object" {
  "boolean": true
}
A2024-123T12:34:56 @REQUEST_BEGIN("request2.name")
  C CMD_0 1 2 3
  @METADATA "foo" "bar"
  @MODEL "a" 1 "00:00:00"
  R100 CMD_1 "1 2 3"
  C CMD_2 1 2 3
  R100 CMD_3 "1 2 3"
  C CMD_4 1 2 3
  R100 CMD_5 "1 2 3"
@REQUEST_END
@METADATA "foo" "bar"
`;
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    assert.isNotNull(parseTree.topNode.firstChild);
    const requests = parseTree.topNode.firstChild!.getChildren('Request');
    assert.equal(requests.length, 2);

    assert.equal(getNodeText(requests[0].getChild('RequestName')!, input), '"request.name"');
    assert.equal(getNodeText(requests[0].getChild('LineComment')!, input), '# Description Text');
    const request0GrondEpoch = requests[0].getChild('TimeTag');
    assert.equal(getNodeText(request0GrondEpoch!.getChild('Name')!, input), '"Name"');
    assert.equal(getNodeText(request0GrondEpoch!.getChild('TimeGroundEpoch')!, input), 'G3 ');
    assert.equal(requests[0].getChild('Steps')?.getChildren('Command').length, 4);
    const request0Meta0 = requests[0].getChild('Metadata')!.getChild('MetaEntry')!;
    assert.deepEqual(JSON.parse(getNodeText(request0Meta0.getChild('Value')!, input)), {
      boolean: true,
    });

    assert.equal(getNodeText(requests[1].getChild('RequestName')!, input), '"request2.name"');
    assert.equal(getNodeText(requests[1].getChild('TimeTag')!, input), 'A2024-123T12:34:56 ');
    assert.equal(requests[1].getChild('Steps')?.getChildren('Command').length, 6);
  });
});

describe('error positions', () => {
  for (const { testname, input, first_error } of [
    {
      first_error: 7,
      input: 'FSW_CMD%',
      testname: 'bad stem ending',
    },
    {
      first_error: 3,
      input: 'FOO$BAR^BAZ',
      testname: 'bad stem',
    },
    {
      first_error: 4,
      input: 'FOO "',
      testname: 'bad string arg',
    },
    {
      first_error: 6,
      input: 'CMD 12,34',
      testname: 'bad number arg',
    },
    {
      first_error: 24,
      input: `COM 12345
  COM "dsa"
  @UNKNOWN DIRECTIVE`,
      testname: 'good and bad commands',
    },
  ]) {
    it(testname, () => {
      const cursor = SeqLanguage.parser.parse(input).cursor();
      do {
        const { node } = cursor;
        if (node.type.name === ERROR) {
          assert.strictEqual(cursor.from, first_error);
          break;
        }
      } while (cursor.next());
    });
  }
});

describe('seqfiles', () => {
  const seqDir = path.dirname(fileURLToPath(import.meta.url)) + '/../../tests/mocks/sequencing/sequences';
  for (const file of readdirSync(seqDir)) {
    if (!/\.txt$/.test(file)) {
      continue;
    }

    const name = /^[^.]*/.exec(file)![0];
    it(name, () => {
      const input = readFileSync(path.join(seqDir, file), 'utf8');
      // printNodes(input, (ttype) => ttype === ERROR);
      assertNoErrorNodes(input);
    });
  }
});

describe('token positions', () => {
  it('comment indentation', () => {
    const input = `#COMMENT01
# COMMENT2

CMD0


    COMMAND_01   ARG3       "ARG4" 5


  # COMMENT3


      COMMAND___002      "str_arg_2_0"    "str_arg_2_1"

@METADATA "md3" "foobar"`;
    const nodeLocation = (input: string, nodeText: string, position?: number) => {
      const from = input.indexOf(nodeText, position);
      return {
        from,
        to: from + nodeText.length,
      };
    };
    const expectedCommentLocations = {
      [LINE_COMMENT_TOKEN]: [
        nodeLocation(input, '#COMMENT01'),
        nodeLocation(input, '# COMMENT2'),
        nodeLocation(input, '# COMMENT3'),
      ],
      [STEM_TOKEN]: [
        nodeLocation(input, 'CMD0'),
        nodeLocation(input, 'COMMAND_01'),
        nodeLocation(input, 'COMMAND___002'),
      ],
    };
    const actualCommentLocations: { [name: string]: { from: number; to: number }[] } = {};
    assertNoErrorNodes(input);
    const parseTree = SeqLanguage.parser.parse(input);
    const cursor = parseTree.cursor();
    do {
      const { node } = cursor;
      // printNode(input, node);
      if ([LINE_COMMENT_TOKEN, STEM_TOKEN].includes(node.type.name)) {
        const { to, from } = node;
        if (actualCommentLocations[node.type.name] === undefined) {
          actualCommentLocations[node.type.name] = [];
        }
        actualCommentLocations[node.type.name].push({ from, to });
      }
    } while (cursor.next());
    assert.deepStrictEqual(expectedCommentLocations, actualCommentLocations);

    const cmd2 = parseTree.topNode.getChild('Commands')!.getChildren('Command')[2];
    const cmd2args = cmd2.getChild('Args');
    assert.strictEqual('"str_arg_2_0"', nodeContents(input, cmd2args!.getChildren('String')[0]));
    assert.strictEqual('"str_arg_2_1"', nodeContents(input, cmd2args!.getChildren('String')[1]));
    assert.strictEqual('"str_arg_2_1"', nodeContents(input, cmd2args!.firstChild!.nextSibling!));
    assert.strictEqual(null, cmd2args!.firstChild!.nextSibling!.nextSibling); // only 2 arguments

    const cmd2meta = cmd2.getChild(METADATA_TOKEN)!.getChild(METADATA_ENTRY_TOKEN);
    assert.strictEqual('"md3"', nodeContents(input, cmd2meta!.getChild('Key')!));
    assert.strictEqual('"foobar"', nodeContents(input, cmd2meta!.getChild('Value')!));
  });
});

function assertNoErrorNodes(input: string, verbose?: boolean) {
  const cursor = SeqLanguage.parser.parse(input).cursor();
  do {
    const { node } = cursor;
    if (verbose) {
      console.log(node.type.name);
    }
    assert.notStrictEqual(node.type.name, ERROR);
  } while (cursor.next());
}

function nodeContents(input: string, node: SyntaxNode) {
  return input.substring(node.from, node.to);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printNode(input: string, node: SyntaxNode) {
  console.log(`${node.type.name}[${node.from}.${node.to}] --> '${nodeContents(input, node)}'`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printNodes(input: string, filter?: (name: string) => boolean) {
  const cursor = SeqLanguage.parser.parse(input).cursor();
  do {
    const { node } = cursor;
    if (!filter || filter(node.type.name)) {
      printNode(input, node);
    }
  } while (cursor.next());
}
