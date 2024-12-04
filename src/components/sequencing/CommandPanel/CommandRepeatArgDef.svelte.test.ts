import type { FswCommandArgument, FswCommandArgumentRepeat } from '@nasa-jpl/aerie-ampcs';
import { cleanup, render } from '@testing-library/svelte';
import { keyBy } from 'lodash-es';
import { afterEach, describe, expect, it } from 'vitest';
import CommandRepeatArgDef from './CommandRepeatArgDef.svelte';

describe('CommandRepeatArgDef component', () => {
  afterEach(() => {
    cleanup();
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
    const { getByText } = render(CommandRepeatArgDef, { argDef: repeatArgument });
    expect(getByText(/test repeating arg/)).toBeDefined();
    expect(getByText(/test boolean arg/)).toBeDefined();
    expect(getByText(/test string arg/)).toBeDefined();
  });
});
