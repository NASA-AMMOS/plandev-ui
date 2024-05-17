import type { SeqJson } from '@nasa-jpl/seq-json-schema/types';
import { describe, expect, it } from 'vitest';
import { seqJsonToSequence } from './from-seq-json';

describe('from-seq-json.ts', () => {
  it('converts a seq json id and metadata to sequence', () => {
    const seqJson: SeqJson = {
      id: 'test',
      metadata: {
        onboard_name: 'test.mod',
        onboard_path: '/eng',
        other_arbitrary_metadata: 'test_metadata',
      },
    };
    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "test"
@METADATA "onboard_name" "test.mod"
@METADATA "onboard_path" "/eng"
@METADATA "other_arbitrary_metadata" "test_metadata"
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json LGO to sequence', () => {
    const seqJson: SeqJson = {
      id: 'test',
      metadata: {
        lgo: true,
        onboard_name: 'test.mod',
        onboard_path: '/eng',
        other_arbitrary_metadata: 'test_metadata',
      },
      steps: [
        {
          args: [],
          stem: 'FSW_CMD_3',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
      ],
    };
    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "test"
@METADATA "onboard_name" "test.mod"
@METADATA "onboard_path" "/eng"
@METADATA "other_arbitrary_metadata" "test_metadata"

@LOAD_AND_GO
C FSW_CMD_3
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json variables to sequence', () => {
    const seqJson: SeqJson = {
      id: 'testVariable',

      locals: [
        {
          name: 'L00INT',
          type: 'INT',
        },
        {
          name: 'L01STR',
          type: 'STRING',
        },
        {
          name: 'L02FLT',
          type: 'FLOAT',
        },
        {
          name: 'L03UINT',
          type: 'UINT',
        },
        {
          name: 'L01ENUM',
          type: 'ENUM',
        },
      ],
      metadata: {
        lgo: false,
      },
      parameters: [
        {
          name: 'L00INT',
          type: 'INT',
        },
        {
          name: 'L01STR',
          type: 'STRING',
        },
        {
          name: 'L02FLT',
          type: 'FLOAT',
        },
        {
          name: 'L03UINT',
          type: 'UINT',
        },
        {
          name: 'L01ENUM',
          type: 'ENUM',
        },
      ],
    };
    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "testVariable"
@INPUT_PARAMS L00INT L01STR L02FLT L03UINT L01ENUM
@LOCALS L00INT L01STR L02FLT L03UINT L01ENUM
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json file to a correct sequence', () => {
    const seqJson: SeqJson = {
      id: '42',
      metadata: {},
      steps: [
        {
          args: [
            {
              type: 'boolean',
              value: true,
            },
            {
              type: 'hex',
              value: '0xFF',
            },
            {
              type: 'string',
              value: 'Hello',
            },
            {
              type: 'symbol',
              value: 'World',
            },
            {
              type: 'repeat',
              value: [
                [
                  {
                    type: 'boolean',
                    value: false,
                  },
                  {
                    type: 'hex',
                    value: '0xAA',
                  },
                  {
                    type: 'string',
                    value: 'Foo',
                  },
                  {
                    type: 'symbol',
                    value: 'BAR',
                  },
                ],
                [
                  {
                    type: 'boolean',
                    value: true,
                  },
                  {
                    type: 'hex',
                    value: '0xBB',
                  },
                  {
                    type: 'string',
                    value: 'Baz',
                  },
                  {
                    type: 'symbol',
                    value: 'BAT',
                  },
                ],
              ],
            },
          ],
          stem: 'FSW_CMD_0',
          time: {
            tag: '2024-001T00:00:00',
            type: 'ABSOLUTE',
          },
          type: 'command',
        },
        {
          args: [{ type: 'number', value: 22 }],
          stem: 'FSW_CMD_1',
          time: {
            tag: '00:01:00',
            type: 'COMMAND_RELATIVE',
          },
          type: 'command',
        },
        {
          args: [{ type: 'string', value: 'Fab' }],
          stem: 'FSW_CMD_2',
          time: {
            tag: '15:00:00',
            type: 'EPOCH_RELATIVE',
          },
          type: 'command',
        },
        {
          args: [],
          stem: 'FSW_CMD_3',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
      ],
    };
    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "42"

A2024-001T00:00:00 FSW_CMD_0 TRUE 0xFF "Hello" "World" [FALSE 0xAA "Foo" "BAR" TRUE 0xBB "Baz" "BAT"]
R00:01:00 FSW_CMD_1 22
E15:00:00 FSW_CMD_2 "Fab"
C FSW_CMD_3
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json command model and metadata to sequence', () => {
    const seqJson: SeqJson = {
      id: 'testCommandModeling',
      metadata: {
        onboard_name: 'test.mod',
      },
      steps: [
        {
          args: [
            {
              type: 'string',
              value: 'test',
            },
          ],
          metadata: {
            Key1: 'Value1',
            Key2: 'Value2',
          },
          models: [
            {
              offset: '00:00:00',
              value: 0,
              variable: 'temp',
            },
            {
              offset: '00:00:01',
              value: true,
              variable: 'temp1',
            },
            {
              offset: '00:00:02',
              value: false,
              variable: 'temp2',
            },
            {
              offset: '00:00:03',
              value: 'NULL',
              variable: 'temp4',
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
    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "testCommandModeling"
@METADATA "onboard_name" "test.mod"

C ECHO "test"
@METADATA "Key1" "Value1"
@METADATA "Key2" "Value2"
@MODEL "temp" 0 "00:00:00"
@MODEL "temp1" TRUE "00:00:01"
@MODEL "temp2" FALSE "00:00:02"
@MODEL "temp4" "NULL" "00:00:03"
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json description to sequence', () => {
    const seqJson: SeqJson = {
      id: 'testDescription',
      metadata: {},
      steps: [
        {
          args: [
            {
              type: 'string',
              value: 'TEST1',
            },
          ],
          description: 'a description',
          stem: 'ECHO',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
        {
          args: [],
          description: 'fsw command description',
          models: [
            {
              offset: '00:00:00',
              value: true,
              variable: 'cmd',
            },
          ],
          stem: 'FSW_CMD',
          time: {
            tag: '00:00:01',
            type: 'COMMAND_RELATIVE',
          },
          type: 'command',
        },
        {
          args: [],
          stem: 'FSW_CMD_1',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
        {
          args: [
            {
              type: 'number',
              value: 10,
            },
            {
              type: 'string',
              value: 'ENUM',
            },
          ],
          description: 'fsw cmd 2 description',
          stem: 'FSW_CMD_2',
          time: {
            type: 'COMMAND_COMPLETE',
          },
          type: 'command',
        },
      ],
    };

    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "testDescription"

C ECHO "TEST1" # a description
R00:00:01 FSW_CMD # fsw command description
@MODEL "cmd" TRUE "00:00:00"
C FSW_CMD_1
C FSW_CMD_2 10 "ENUM" # fsw cmd 2 description
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json immediate commands to sequence', () => {
    const seqJson: SeqJson = {
      id: 'testImmediate',
      immediate_commands: [
        {
          args: [
            { type: 'string', value: '1' },
            { type: 'number', value: 2 },
            { type: 'number', value: 3.0 },
          ],
          description: 'immediate command',
          metadata: {},
          stem: 'IC',
        },
        {
          args: [],
          description: 'noop command, no arguments',
          metadata: { processor: 'VC1A' },
          stem: 'NOOP',
        },
      ],
      metadata: {},
    };

    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "testImmediate"

@IMMEDIATE
IC "1" 2 3 # immediate command
NOOP # noop command, no arguments
@METADATA "processor" "VC1A"
`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json hardware commands to sequence', () => {
    const seqJson: SeqJson = {
      hardware_commands: [
        {
          description: 'hardware command',
          metadata: {
            foo: 'bar',
            hardware: 'HWC',
          },
          stem: 'HWC',
        },
        {
          stem: 'HWC2',
        },
      ],
      id: 'testHardware',
      metadata: {},
    };

    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "testHardware"

@HARDWARE
HWC # hardware command
@METADATA "foo" "bar"
@METADATA "hardware" "HWC"
HWC2`;
    expect(sequence).toEqual(expectedSequence);
  });

  it('converts a seq json time tags to sequence', () => {
    const seqJson: SeqJson = {
      id: 'testTime',
      metadata: {},
      steps: [
        {
          args: [],
          stem: 'FSA_CMD',
          time: {
            tag: '2020-173T20:00:00.000',
            type: 'ABSOLUTE',
          },
          type: 'command',
        },
        {
          args: [],
          stem: 'FSR_CMD',
          time: { tag: '00:00:10.000', type: 'COMMAND_RELATIVE' },
          type: 'command',
        },
        {
          args: [
            {
              type: 'number',
              value: 10,
            },
            {
              type: 'string',
              value: 'ENUM',
            },
          ],
          stem: 'FSE_CMD',
          time: { tag: '-00:00:01.000', type: 'EPOCH_RELATIVE' },
          type: 'command',
        },
      ],
    };

    const sequence = seqJsonToSequence(seqJson, [], null);
    const expectedSequence = `@ID "testTime"

A2020-173T20:00:00.000 FSA_CMD
R00:00:10.000 FSR_CMD
E-00:00:01.000 FSE_CMD 10 "ENUM"
`;
    expect(sequence).toEqual(expectedSequence);
  });
});
