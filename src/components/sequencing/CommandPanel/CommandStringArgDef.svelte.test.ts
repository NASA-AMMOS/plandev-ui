import type { FswCommandArgumentVarString } from '@nasa-jpl/aerie-ampcs';
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CommandStringArgDef from './CommandStringArgDef.svelte';

describe('CommandStringArgDef component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render units for a boolean command argument', () => {
    const stringArgument: FswCommandArgumentVarString = {
      arg_type: 'var_string',
      default_value: 'Foo string',
      description: 'test string arg',
      max_bit_length: 8,
      name: 'Foo String',
      prefix_bit_length: 2,
      valid_regex: '',
    };
    const { getByText } = render(CommandStringArgDef, { argDef: stringArgument });
    expect(getByText(/test string arg/)).toBeDefined();
  });
});
