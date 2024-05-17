import {
  parse,
  type CommandDictionary,
  type FswCommand,
  type FswCommandArgument,
  type FswCommandArgumentFloat,
  type FswCommandArgumentMap,
  type HwCommand,
} from '@nasa-jpl/aerie-ampcs';
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { SeqLanguage } from '../codemirror';
import { sequenceToSeqJson } from './to-seq-json';

function argArrToMap(cmdArgs: FswCommandArgument[]): FswCommandArgumentMap {
  return cmdArgs.reduce((argMap, arg) => ({ ...argMap, [arg.name]: arg }), {});
}

function floatArg(name: string, units: string = ''): FswCommandArgumentFloat {
  return {
    arg_type: 'float',
    bit_length: 64,
    default_value: 0,
    description: '',
    name,
    range: { max: 5, min: -5 },
    units,
  };
}

const fswCommands: FswCommand[] = [
  {
    arguments: [floatArg('float_arg_1', ''), floatArg('float_arg_2', '')] as FswCommandArgument[],
    stem: 'FSW_CMD_1',
  },
].map(stub => ({ ...stub, argumentMap: argArrToMap(stub.arguments), description: '', type: 'fsw_command' }));

const fswCommandMap = fswCommands.reduce((cmdMap, hwCmd) => ({ ...cmdMap, [hwCmd.stem]: hwCmd }), {});

const hwCommands = [
  {
    stem: 'HDW_CMD_1',
  },
  {
    stem: 'HDW_CMD_2',
  },
].map((stub): HwCommand => ({ ...stub, description: '', type: 'hw_command' }));

const hwCommandMap = hwCommands.reduce((cmdMap, hwCmd) => ({ ...cmdMap, [hwCmd.stem]: hwCmd }), {});

const commandDictionary: CommandDictionary = {
  enumMap: {},
  enums: [],
  fswCommandMap,
  fswCommands,
  header: {
    mission_name: 'unittest',
    schema_version: '1',
    spacecraft_ids: [1],
    version: '1',
  },
  hwCommandMap,
  hwCommands,
  id: 'command_dictionary',
  path: '/file/path',
};

const commandBanana = parse(readFileSync('src/tests/mocks/sequencing/dictionaries/command_banananation.xml', 'utf-8'));

describe('convert a sequence to seq json', () => {
  it('hardware command', () => {
    const seq = `@HARDWARE
HDW_CMD`;
    const id = 'test';
    const expectedJson = {
      hardware_commands: [
        {
          stem: 'HDW_CMD',
        },
      ],
      id: 'test',
      metadata: {},
    };
    const actual = sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandDictionary, [], null, id);
    expect(actual).toEqual(expectedJson);
  });

  it('multiple hardware commands', () => {
    const seq = `@HARDWARE
HDW_CMD_1
# comment
HDW_CMD_2
`;
    const id = 'test';
    const expectedJson = {
      hardware_commands: [{ stem: 'HDW_CMD_1' }, { stem: 'HDW_CMD_2' }],
      id: 'test',
      metadata: {},
    };
    const actual = sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandDictionary, [], null, id);
    expect(actual).toEqual(expectedJson);
  });

  it('load and go with commands', () => {
    const seq = `@LOAD_AND_GO
C FSW_CMD_1 1e3 2.34
# comment
C FSW_CMD_1 0.123 -2.34 # inline description
`;
    const id = 'test';
    const expectedJson = {
      id: 'test',
      metadata: {
        lgo: true,
      },
      steps: [
        {
          args: [
            {
              name: 'float_arg_1',
              type: 'number',
              value: 1e3,
            },
            {
              name: 'float_arg_2',
              type: 'number',
              value: 2.34,
            },
          ],
          stem: 'FSW_CMD_1',
          time: { type: 'COMMAND_COMPLETE' },
          type: 'command',
        },
        {
          args: [
            {
              name: 'float_arg_1',
              type: 'number',
              value: 0.123,
            },
            {
              name: 'float_arg_2',
              type: 'number',
              value: -2.34,
            },
          ],
          description: 'inline description',
          stem: 'FSW_CMD_1',
          time: { type: 'COMMAND_COMPLETE' },
          type: 'command',
        },
      ],
    };
    const actual = sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandDictionary, [], null, id);
    expect(actual).toEqual(expectedJson);
  });

  it('command dictionary file', () => {
    const id = 'test.sequence';
    const seq = `
@ID "test.inline"

@INPUT_PARAMS L00INT L01INT L02STR

# comment
R10 ECHO    "string arg"
R71 ECHO    L02STR
    `;
    const expectedJson = {
      id: 'test.inline',
      metadata: {},
      parameters: [
        {
          name: 'L00INT',
          type: 'INT',
        },
        {
          name: 'L01INT',
          type: 'INT',
        },
        {
          name: 'L02STR',
          type: 'STRING',
        },
      ],
      steps: [
        {
          args: [
            {
              name: 'echo_string',
              type: 'string',
              value: 'string arg',
            },
          ],
          stem: 'ECHO',
          time: { tag: '00:00:10', type: 'COMMAND_RELATIVE' },
          type: 'command',
        },
        {
          args: [
            {
              name: 'echo_string',
              type: 'symbol',
              value: 'L02STR',
            },
          ],
          stem: 'ECHO',
          time: { tag: '00:01:11', type: 'COMMAND_RELATIVE' },
          type: 'command',
        },
      ],
    };
    const actual = sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, [], null, id);
    expect(actual).toEqual(expectedJson);
  });

  it('repeat args', () => {
    const id = 'test.sequence';
    const seq = `@ID "test.inline"

# comment
R10 PACKAGE_BANANA     2      [    "bundle1"    5 "bundle2" 10]
    `;
    const expectedJson = {
      id: 'test.inline',
      metadata: {},
      steps: [
        {
          args: [
            {
              name: 'lot_number',
              type: 'number',
              value: 2,
            },
            {
              name: 'bundle',
              type: 'repeat',
              value: [
                [
                  {
                    name: 'bundle_name',
                    type: 'string',
                    value: 'bundle1',
                  },
                  {
                    name: 'number_of_bananas',
                    type: 'number',
                    value: 5,
                  },
                ],
                [
                  {
                    name: 'bundle_name',
                    type: 'string',
                    value: 'bundle2',
                  },
                  {
                    name: 'number_of_bananas',
                    type: 'number',
                    value: 10,
                  },
                ],
              ],
            },
          ],
          stem: 'PACKAGE_BANANA',
          time: { tag: '00:00:10', type: 'COMMAND_RELATIVE' },
          type: 'command',
        },
      ],
    };
    const actual = sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, [], null, id);
    expect(actual).toEqual(expectedJson);
  });

  it('local variables', () => {
    const id = 'test.sequence';
    const seq = `@ID "test.inline"
@LOCALS L00STR
C ECHO L00STR
C ECHO "L00STR"
C ECHO L01STR
    `;
    const actual = sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, [], null, id);
    const expectedJson = {
      id: 'test.inline',
      locals: [
        {
          name: 'L00STR',
          type: 'STRING',
        },
      ],
      metadata: {},
      steps: [
        {
          args: [
            {
              name: 'echo_string',
              type: 'symbol',
              value: 'L00STR',
            },
          ],
          stem: 'ECHO',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
        {
          args: [
            {
              name: 'echo_string',
              type: 'string',
              value: 'L00STR',
            },
          ],
          stem: 'ECHO',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
        {
          args: [
            {
              name: 'echo_string',
              type: 'symbol',
              value: 'L01STR',
            },
          ],
          stem: 'ECHO',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
      ],
    };
    expect(actual).toEqual(expectedJson);
  });

  it('header ordering', () => {
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

    const permutations = allPermutations([
      `@ID "test.seq"`,
      `@INPUT_PARAMS L01STR L02STR`,
      `@LOCALS L01INT L02INT L01UINT L02UINT`,
    ]);
    permutations.forEach((ordering: string[]) => {
      const input = ordering.join('\n\n');
      const actual = sequenceToSeqJson(SeqLanguage.parser.parse(input), input, commandBanana, [], null, 'id');
      const expected = {
        id: 'test.seq',
        locals: [
          {
            name: 'L01INT',
            type: 'INT',
          },
          {
            name: 'L02INT',
            type: 'INT',
          },
          {
            name: 'L01UINT',
            type: 'UINT',
          },
          {
            name: 'L02UINT',
            type: 'UINT',
          },
        ],
        metadata: {},
        parameters: [
          {
            name: 'L01STR',
            type: 'STRING',
          },
          {
            name: 'L02STR',
            type: 'STRING',
          },
        ],
      };
      expect(actual).toEqual(expected);
    });
  });
});
