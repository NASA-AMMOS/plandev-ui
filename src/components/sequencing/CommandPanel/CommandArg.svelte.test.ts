import type {
  FswCommandArgument,
  FswCommandArgumentBoolean,
  FswCommandArgumentEnum,
  FswCommandArgumentFloat,
  FswCommandArgumentInteger,
  FswCommandArgumentNumeric,
  FswCommandArgumentRepeat,
  FswCommandArgumentUnsigned,
  FswCommandArgumentVarString,
} from '@nasa-jpl/aerie-ampcs';
import { cleanup, render } from '@testing-library/svelte';
import { keyBy } from 'lodash-es';
import { afterEach, describe, expect, it } from 'vitest';
import CommandArg from './CommandArg.svelte';

describe('CommandArg component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render a boolean command argument', () => {
    const booleanArgument: FswCommandArgumentBoolean = {
      arg_type: 'boolean',
      bit_length: 1,
      default_value: 'Foo true',
      description: 'test boolean arg',
      format: {
        false_str: 'Foo false',
        true_str: 'Foo true',
      },
      name: 'Foo Boolean',
    };
    const { getByText } = render(CommandArg, { commandArgumentDefinition: booleanArgument });
    expect(getByText(/Foo false/)).toBeDefined();
    expect(getByText(/Foo true/)).toBeDefined();
  });

  it('Should render an enum command argument', () => {
    const enumArgument: FswCommandArgumentEnum = {
      arg_type: 'enum',
      bit_length: 3,
      default_value: 'Foo true',
      description: 'test enum arg',
      enum_name: 'Foo enum name',
      name: 'Foo Enum',
      range: ['bar', 'baz', 'buzz'],
    };
    const { getByDisplayValue } = render(CommandArg, { commandArgumentDefinition: enumArgument });
    expect(getByDisplayValue(/bar/)).toBeDefined();
    expect(getByDisplayValue(/baz/)).toBeDefined();
    expect(getByDisplayValue(/buzz/)).toBeDefined();
  });

  describe('number command arguments', () => {
    it('Should render a float command argument', () => {
      const floatArgument: FswCommandArgumentFloat = {
        arg_type: 'float',
        bit_length: 3,
        default_value: 10,
        description: 'test float arg',
        name: 'Foo Float',
        range: {
          max: 20,
          min: 0,
        },
        units: 'foo',
      };
      const { getByText } = render(CommandArg, { commandArgumentDefinition: floatArgument });
      expect(getByText(/0/)).toBeDefined();
      expect(getByText(/20/)).toBeDefined();
    });

    it('Should render an integer command argument', () => {
      const integerArgument: FswCommandArgumentInteger = {
        arg_type: 'integer',
        bit_length: 3,
        default_value: 10,
        description: 'test integer arg',
        name: 'Foo Integer',
        range: {
          max: 20,
          min: 0,
        },
        units: 'foo',
      };
      const { getByText } = render(CommandArg, { commandArgumentDefinition: integerArgument });
      expect(getByText(/0/)).toBeDefined();
      expect(getByText(/20/)).toBeDefined();
    });

    it('Should render an unsigned command argument', () => {
      const unsignedArgument: FswCommandArgumentUnsigned = {
        arg_type: 'unsigned',
        bit_length: 3,
        default_value: 10,
        description: 'test unsigned arg',
        name: 'Foo Unsigned',
        range: {
          max: 20,
          min: 0,
        },
        units: 'foo',
      };
      const { getByText } = render(CommandArg, { commandArgumentDefinition: unsignedArgument });
      expect(getByText(/0/)).toBeDefined();
      expect(getByText(/20/)).toBeDefined();
    });

    it('Should render an unsigned command argument', () => {
      const numericArgument: FswCommandArgumentNumeric = {
        arg_type: 'numeric',
        bit_length: 3,
        default_value: 10,
        description: 'test numeric arg',
        name: 'Foo Numeric',
        range: {
          max: 20,
          min: 0,
        },
        type: 'float',
        units: 'foo',
      };
      const { getByText } = render(CommandArg, { commandArgumentDefinition: numericArgument });
      expect(getByText(/0/)).toBeDefined();
      expect(getByText(/20/)).toBeDefined();
    });
  });

  it('Should render a string command argument', () => {
    const stringArgument: FswCommandArgumentVarString = {
      arg_type: 'var_string',
      default_value: 'Foo string',
      description: 'test string arg',
      max_bit_length: 8,
      name: 'Foo String',
      prefix_bit_length: 2,
      valid_regex: '',
    };
    const { getByText } = render(CommandArg, { commandArgumentDefinition: stringArgument });
    expect(getByText(/test string arg/)).toBeDefined();
  });

  it('Should render a repeating command argument', () => {
    const commandArguments: FswCommandArgument[] = [
      {
        arg_type: 'boolean',
        bit_length: 1,
        default_value: 'Foo true',
        description: 'test boolean arg',
        format: {
          false_str: 'Foo false',
          true_str: 'Foo true',
        },
        name: 'Boolean',
      },
      {
        arg_type: 'var_string',
        default_value: 'Foo string',
        description: 'test string arg',
        max_bit_length: 8,
        name: 'String',
        prefix_bit_length: 2,
        valid_regex: '',
      },
    ];
    const repeatArgument: FswCommandArgumentRepeat = {
      arg_type: 'repeat',
      description: 'test repeating arg',
      name: 'Foo Repeat',
      prefix_bit_length: 2,
      repeat: {
        argumentMap: keyBy(commandArguments, 'name'),
        arguments: commandArguments,
        max: 4,
        min: 1,
      },
    };
    const { getByText } = render(CommandArg, { commandArgumentDefinition: repeatArgument });
    expect(getByText(/test repeating arg/)).toBeDefined();
    expect(getByText(/test boolean arg/)).toBeDefined();
    expect(getByText(/test string arg/)).toBeDefined();
  });
});
