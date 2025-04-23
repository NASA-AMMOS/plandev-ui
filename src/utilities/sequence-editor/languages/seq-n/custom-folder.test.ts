import { EditorState } from '@codemirror/state';
import { SeqnParser } from '@nasa-jpl/aerie-sequence-languages';
import { describe, expect, test } from 'vitest';
import { foldRequest, foldSteps, foldVariables } from './custom-folder';

const COMMANDS = [
  'Command',
  'Command 0 10',
  'Command 0 10 # Description',
  'C Command 0 10 # Description',
  'R10:00:00 Command 0 false',
];
const LOAD_ACTIVATES = [
  'R1 @LOAD("load1") false #Description',
  'C @LOAD("load.name")',
  'R1 @ACTIVATE("activate.name") false #Description',
  'E-10:00:00 @ACTIVATE("seq1")',
];
const GROUND_ACTIVITIES = [
  'R1 @GROUND_BLOCK("GROUND") false [] #Description',
  'A2024-001T00:00:01 @GROUND_BLOCK("load.name")',
  'R1 @GROUND_EVENT("event") false #Description',
  'E-00:00:00.001 @GROUND_EVENT("event1")',
];

const PARAMETERS = [
  `@INPUT_PARAMS_BEGIN
VARIABLE INT "MIN...MAX | ...MAX | MIN..." "VALUE_1, VALUE_2, ..."
@INPUT_PARAMS_END`,
  `@INPUT_PARAMS_BEGIN
@INPUT_PARAMS_END`,
];

const LOCALS = [
  `@LOCALS_BEGIN
VARIABLE INT
TEST FLOAT
@LOCALS_END`,
];

const REQUEST_ACTIVITIES = [
  `G+00:00:00 "Name" @REQUEST_BEGIN("request.name")
  C SEQ_ECHO ""
  @METADATA "Key" "Value"
  @METADATA "Key1" "Value"
  @METADATA "Key2" "Value"
  @METADATA "Key3" "Value"
  C @GROUND_BLOCK("ground_block.name")
  C @LOAD("load.name")
  @ENGINE 1
  @MODEL "Variable" 0 "Offset"
  @MODEL "Variable" 0 "Offset"
  @MODEL "Variable" 0 "Offset"
@REQUEST_END`,
  `C @REQUEST_BEGIN("request.name") 1 3 false # Description
  C SEQ_ECHO ""
  @METADATA "Key" "Value"
  @METADATA "Key1" "Value"
  @METADATA "Key2" "Value"
  @METADATA "Key3" "Value"
  C @GROUND_BLOCK("ground_block.name")
  C @LOAD("load.name")
  @ENGINE 1
  @MODEL "Variable" 0 "Offset"
  @MODEL "Variable" 0 "Offset"
  @MODEL "Variable" 0 "Offset"
@REQUEST_END`,
];

describe('foldCommand', () => {
  test('nothing to fold should return same from and to', () => {
    COMMANDS.forEach(command => {
      const doc = `${command}`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const commandNode = tree.topNode.getChild('Commands')?.getChild('Command');
      if (!commandNode) {
        throw new Error('Command node not found');
      } else {
        expect(commandNode).not.toBeNull();
        expect(foldSteps(commandNode, 'Stem', state)).toStrictEqual({
          from: doc.indexOf(command) + command.length,
          to: doc.length,
        });
      }
    });
  });
  test('returns correct range when Metadata is present', () => {
    COMMANDS.forEach(command => {
      const doc = `${command}
      @METADATA "Key" "Value"`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const commandNode = tree.topNode.getChild('Commands')?.getChild('Command');
      if (!commandNode) {
        throw new Error('Command node not found');
      } else {
        expect(commandNode).not.toBeNull();
        expect(foldSteps(commandNode, 'Stem', state)).toStrictEqual({
          from: doc.indexOf(command) + command.length,
          to: doc.length,
        });
      }
    });
  });

  test('returns correct range when Metadata and model is present and multiple white spaces', () => {
    COMMANDS.forEach(command => {
      const doc = `${command}
      @METADATA "Key" "Value"
      @METADATA "Key" "Value"
      @METADATA "Key" "Value"
      @MODEL "Variable" 0 "Offset"
      @MODEL "Variable" 0 "Offset"
      @MODEL "Variable" 0 "Offset"
      @MODEL "Variable" 0 "Offset"


      `;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const commandNode = tree.topNode.getChild('Commands')?.getChild('Command');
      if (!commandNode) {
        throw new Error('Command node not found');
      } else {
        expect(commandNode).not.toBeNull();
        expect(foldSteps(commandNode, 'Stem', state)).toStrictEqual({
          from: doc.indexOf(command) + command.length,
          to: doc.trim().length,
        });
      }
    });
  });
});

describe('foldGroundBlockAndEvent', () => {
  test('nothing to fold should return same from and to', () => {
    LOAD_ACTIVATES.forEach(step => {
      const doc = `${step}`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node =
        tree.topNode.getChild('Commands')?.getChild('Activate') ?? tree.topNode.getChild('Commands')?.getChild('Load');
      if (!node) {
        throw new Error('node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldSteps(node, 'SequenceName', state)).toStrictEqual({
          from: doc.indexOf(step) + step.length,
          to: doc.length,
        });
      }
    });
  });
  test('returns correct range when engine and epoch', () => {
    LOAD_ACTIVATES.forEach(step => {
      const doc = `${step}
      @ENGINE 1
      @EPOCH ""`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node =
        tree.topNode.getChild('Commands')?.getChild('Activate') ?? tree.topNode.getChild('Commands')?.getChild('Load');

      if (!node) {
        throw new Error('Node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldSteps(node, 'SequenceName', state)).toStrictEqual({
          from: doc.indexOf(step) + step.length,
          to: doc.length,
        });
      }
    });
  });

  test('returns correct range with multiple white spaces', () => {
    LOAD_ACTIVATES.forEach(step => {
      const doc = `${step}
      @ENGINE 1
      @EPOCH ""
      @METADATA "Key" "Value"
      @METADATA "Key" "Value"
      @METADATA "Key" "Value"
      @MODEL "Variable" 0 "Offset"
      @MODEL "Variable" 0 "Offset"
      @MODEL "Variable" 0 "Offset"
      @MODEL "Variable" 0 "Offset"


      `;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node =
        tree.topNode.getChild('Commands')?.getChild('Activate') ?? tree.topNode.getChild('Commands')?.getChild('Load');

      if (!node) {
        throw new Error('Node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldSteps(node, 'SequenceName', state)).toStrictEqual({
          from: doc.indexOf(step) + step.length,
          to: doc.trim().length,
        });
      }
    });
  });
});

describe('foldGroundBlockAndEvent', () => {
  test('nothing to fold should return same from and to', () => {
    GROUND_ACTIVITIES.forEach(step => {
      const doc = `${step}`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node =
        tree.topNode.getChild('Commands')?.getChild('GroundBlock') ??
        tree.topNode.getChild('Commands')?.getChild('GroundEvent');
      if (!node) {
        throw new Error('node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldSteps(node, 'GroundName', state)).toStrictEqual({
          from: doc.indexOf(step) + step.length,
          to: doc.length,
        });
      }
    });
  });
  test('returns correct range when model', () => {
    GROUND_ACTIVITIES.forEach(step => {
      const doc = `${step}
    @MODEL "Variable" 0 "Offset"
    @MODEL "Variable" 0 "Offset"
    @MODEL "Variable" 0 "Offset"
    @MODEL "Variable" 0 "Offset"`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node =
        tree.topNode.getChild('Commands')?.getChild('GroundBlock') ??
        tree.topNode.getChild('Commands')?.getChild('GroundEvent');

      if (!node) {
        throw new Error('Node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldSteps(node, 'GroundName', state)).toStrictEqual({
          from: doc.indexOf(step) + step.length,
          to: doc.length,
        });
      }
    });
  });

  test('returns correct range with multiple white spaces', () => {
    GROUND_ACTIVITIES.forEach(step => {
      const doc = `${step}
    @METADATA "Key" "Value"
    @METADATA "Key" "Value"
    @METADATA "Key" "Value"
    @MODEL "Variable" 0 "Offset"
    @MODEL "Variable" 0 "Offset"
    @MODEL "Variable" 0 "Offset"
    @MODEL "Variable" 0 "Offset"


      `;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node =
        tree.topNode.getChild('Commands')?.getChild('GroundBlock') ??
        tree.topNode.getChild('Commands')?.getChild('GroundEvent');

      if (!node) {
        throw new Error('Node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldSteps(node, 'GroundName', state)).toStrictEqual({
          from: doc.indexOf(step) + step.length,
          to: doc.trim().length,
        });
      }
    });
  });
});

describe('foldRequest', () => {
  test('fold with no metadata', () => {
    REQUEST_ACTIVITIES.forEach(step => {
      const doc = `${step}`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node = tree.topNode.getChild('Commands')?.getChild('Request');
      if (!node) {
        throw new Error('node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldRequest(node, state)).toStrictEqual({
          from: doc.split('\n')[0].trimEnd().length,
          to: doc.trimEnd().length,
        });
      }
    });
  });
  test('returns correct range when metadata', () => {
    REQUEST_ACTIVITIES.forEach(step => {
      const doc = `${step}
    @METADATA "Key" "Value"
    @METADATA "Key" "Value"
    @METADATA "Key" "Value"`;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node = tree.topNode.getChild('Commands')?.getChild('Request');

      if (!node) {
        throw new Error('Node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldRequest(node, state)).toStrictEqual({
          from: doc.split('\n')[0].trimEnd().length,
          to: doc.trimEnd().length,
        });
      }
    });
  });

  test('returns correct range with multiple white spaces', () => {
    REQUEST_ACTIVITIES.forEach(step => {
      const doc = `${step}
    @METADATA "Key" "Value"
    @METADATA "Key" "Value"
    @METADATA "Key" "Value"

      `;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node = tree.topNode.getChild('Commands')?.getChild('Request');

      if (!node) {
        throw new Error('Node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldRequest(node, state)).toStrictEqual({
          from: doc.split('\n')[0].trimEnd().length,
          to: doc.trimEnd().length,
        });
      }
    });
  });
});

describe('foldVariables', () => {
  test('Parameters should return the correct from and to', () => {
    PARAMETERS.forEach((parameter: string) => {
      const doc = parameter;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node = tree.topNode.getChild('ParameterDeclaration');
      if (!node) {
        throw new Error('node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldVariables(node, state)).toStrictEqual({
          from: '@INPUT_PARAMS_BEGIN'.length,
          to: doc.length,
        });
      }
    });
  });
  test('Locals should return the correct from and to', () => {
    LOCALS.forEach((local: string) => {
      const doc = local;
      const tree = SeqnParser.parse(doc);
      const state = EditorState.create({ doc });

      const node = tree.topNode.getChild('LocalDeclaration');
      if (!node) {
        throw new Error('node not found');
      } else {
        expect(node).not.toBeNull();
        expect(foldVariables(node, state)).toStrictEqual({
          from: '@LOCALS_BEGIN'.length,
          to: doc.length,
        });
      }
    });
  });
});
