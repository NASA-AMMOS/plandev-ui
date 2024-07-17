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

describe('convert a sequence to seq json', async () => {
  it('hardware command', async () => {
    const seq = `@HARDWARE
HDW_CMD`;
    const id = 'test';
    const expectedJson = `{
  "id": "test",
  "metadata": {},
  "hardware_commands": [
    {
      "stem": "HDW_CMD"
    }
  ]
}`;
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandDictionary, id);
    expect(actual).toEqual(expectedJson);
  });

  it('multiple hardware commands', async () => {
    const seq = `@HARDWARE
HDW_CMD_1
# comment
HDW_CMD_2
`;
    const id = 'test';
    const expectedJson = `{
  "id": "test",
  "metadata": {},
  "hardware_commands": [
    {
      "stem": "HDW_CMD_1"
    },
    {
      "stem": "HDW_CMD_2"
    }
  ]
}`;
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandDictionary, id);
    expect(actual).toEqual(expectedJson);
  });

  it('load and go with commands', async () => {
    const seq = `@LOAD_AND_GO
C FSW_CMD_1 1e3 2.34
# comment
C FSW_CMD_1 0.123 -2.34 # inline description
`;
    const id = 'test';
    const expectedJson = `{
  "id": "test",
  "metadata": {
    "lgo": true
  },
  "steps": [
    {
      "args": [
        {
          "type": "number",
          "value": 1000,
          "name": "float_arg_1"
        },
        {
          "type": "number",
          "value": 2.34,
          "name": "float_arg_2"
        }
      ],
      "stem": "FSW_CMD_1",
      "time": {
        "type": "COMMAND_COMPLETE"
      },
      "type": "command"
    },
    {
      "args": [
        {
          "type": "number",
          "value": 0.123,
          "name": "float_arg_1"
        },
        {
          "type": "number",
          "value": -2.34,
          "name": "float_arg_2"
        }
      ],
      "stem": "FSW_CMD_1",
      "time": {
        "type": "COMMAND_COMPLETE"
      },
      "type": "command",
      "description": "inline description"
    }
  ]
}`;
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandDictionary, id);
    expect(actual).toEqual(expectedJson);
  });

  it('command dictionary file', async () => {
    const id = 'test.sequence';
    const seq = `
@ID "test.inline"

@INPUT_PARAMS L00INT L01INT L02STR

# comment
R10 ECHO    "string arg"
R71 ECHO    L02STR
    `;
    const expectedJson = `{
  "id": "test.inline",
  "metadata": {},
  "parameters": [
    {
      "name": "L00INT",
      "type": "INT"
    },
    {
      "name": "L01INT",
      "type": "INT"
    },
    {
      "name": "L02STR",
      "type": "STRING"
    }
  ],
  "steps": [
    {
      "args": [
        {
          "type": "string",
          "value": "string arg",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "tag": "00:00:10",
        "type": "COMMAND_RELATIVE"
      },
      "type": "command"
    },
    {
      "args": [
        {
          "type": "symbol",
          "value": "L02STR",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "tag": "00:01:11",
        "type": "COMMAND_RELATIVE"
      },
      "type": "command"
    }
  ]
}`;
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, id);
    expect(actual).toEqual(expectedJson);
  });

  it('repeat args', async () => {
    const id = 'test.sequence';
    const seq = `@ID "test.inline"

# comment
R10 PACKAGE_BANANA     2      [    "bundle1"    5 "bundle2" 10]
    `;
    const expectedJson = `{
  "id": "test.inline",
  "metadata": {},
  "steps": [
    {
      "args": [
        {
          "type": "number",
          "value": 2,
          "name": "lot_number"
        },
        {
          "name": "bundle",
          "type": "repeat",
          "value": [
            [
              {
                "type": "string",
                "value": "bundle1",
                "name": "bundle_name"
              },
              {
                "type": "number",
                "value": 5,
                "name": "number_of_bananas"
              }
            ],
            [
              {
                "type": "string",
                "value": "bundle2",
                "name": "bundle_name"
              },
              {
                "type": "number",
                "value": 10,
                "name": "number_of_bananas"
              }
            ]
          ]
        }
      ],
      "stem": "PACKAGE_BANANA",
      "time": {
        "tag": "00:00:10",
        "type": "COMMAND_RELATIVE"
      },
      "type": "command"
    }
  ]
}`;
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, id);
    expect(actual).toEqual(expectedJson);
  });

  it('local variables', async () => {
    const id = 'test.sequence';
    const seq = `@ID "test.inline"
@LOCALS L00STR
C ECHO L00STR
C ECHO "L00STR"
C ECHO L01STR
    `;
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, id);
    const expectedJson = `{
  "id": "test.inline",
  "metadata": {},
  "locals": [
    {
      "name": "L00STR",
      "type": "STRING"
    }
  ],
  "steps": [
    {
      "args": [
        {
          "type": "symbol",
          "value": "L00STR",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "type": "COMMAND_COMPLETE"
      },
      "type": "command"
    },
    {
      "args": [
        {
          "type": "string",
          "value": "L00STR",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "type": "COMMAND_COMPLETE"
      },
      "type": "command"
    },
    {
      "args": [
        {
          "type": "symbol",
          "value": "L01STR",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "type": "COMMAND_COMPLETE"
      },
      "type": "command"
    }
  ]
}`;
    expect(actual).toEqual(expectedJson);
  });

  it('header ordering', async () => {
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
    permutations.forEach(async (ordering: string[]) => {
      const input = ordering.join('\n\n');
      const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(input), input, commandBanana, 'id');
      const expected = `{
  "id": "test.seq",
  "metadata": {},
  "locals": [
    {
      "name": "L01INT",
      "type": "INT"
    },
    {
      "name": "L02INT",
      "type": "INT"
    },
    {
      "name": "L01UINT",
      "type": "UINT"
    },
    {
      "name": "L02UINT",
      "type": "UINT"
    }
  ],
  "parameters": [
    {
      "name": "L01STR",
      "type": "STRING"
    },
    {
      "name": "L02STR",
      "type": "STRING"
    }
  ]
}`;
      expect(actual).toEqual(expected);
    });
  });

  it('Convert quoted strings', async () => {
    const seq = `@ID "escaped_quotes"

    R1 ECHO "Can this handle \\"Escaped\\" quotes??" # and this "too"`;
    const id = 'escaped_quotes';
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, id);
    const expected = `{
  "id": "escaped_quotes",
  "metadata": {},
  "steps": [
    {
      "args": [
        {
          "type": "string",
          "value": "Can this handle \\"Escaped\\" quotes??",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "tag": "00:00:01",
        "type": "COMMAND_RELATIVE"
      },
      "type": "command",
      "description": "and this \\"too\\""
    }
  ]
}`;
    expect(actual).toEqual(expected);
  });

  it('Convert quoted metadata and models', async () => {
    const seq = `@ID "escaped_metadata"

R00:00:01 ECHO "Can this handle \\"Escaped\\" quotes??" # and this "too"
@METADATA "key" "value"
@METADATA "home" " \\"world\\""
@METADATA "array" [ "\\" quoted ", 1, true, null, "seq" ]
@METADATA "object" { "\\"earth\\"" : "green", "array" : [ "\\" quoted ", 1, true, null, "seq" ]}
@METADATA "this_\\"is\\"_my_key" "This is the value"
@MODEL "Variable" 0 "Offset"
@MODEL "Variable \\"Escaped\\"" 0 "Offset \\" \\" \\"\\""`;
    const id = 'escaped_metadata';
    const actual = await sequenceToSeqJson(SeqLanguage.parser.parse(seq), seq, commandBanana, id);
    const expected = `{
  "id": "escaped_metadata",
  "metadata": {},
  "steps": [
    {
      "args": [
        {
          "type": "string",
          "value": "Can this handle \\"Escaped\\" quotes??",
          "name": "echo_string"
        }
      ],
      "stem": "ECHO",
      "time": {
        "tag": "00:00:01",
        "type": "COMMAND_RELATIVE"
      },
      "type": "command",
      "description": "and this \\"too\\"",
      "models": [
        {
          "offset": "Offset",
          "value": 0,
          "variable": "Variable"
        },
        {
          "offset": "Offset \\" \\" \\"\\"",
          "value": 0,
          "variable": "Variable \\"Escaped\\""
        }
      ],
      "metadata": {
        "key": "value",
        "home": " \\"world\\"",
        "array": [
          "\\" quoted ",
          1,
          true,
          null,
          "seq"
        ],
        "object": {
          "\\"earth\\"": "green",
          "array": [
            "\\" quoted ",
            1,
            true,
            null,
            "seq"
          ]
        },
        "this_\\"is\\"_my_key": "This is the value"
      }
    }
  ]
}`;
    expect(actual).toEqual(expected);
  });
});
