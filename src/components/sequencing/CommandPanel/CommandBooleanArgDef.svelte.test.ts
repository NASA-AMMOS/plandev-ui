import type { FswCommandArgumentBoolean } from '@nasa-jpl/aerie-ampcs';
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CommandBooleanArgDef from './CommandBooleanArgDef.svelte';

describe('CommandBooleanArgDef component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render units for a boolean command argument', () => {
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
    const { getByText } = render(CommandBooleanArgDef, { argDef: booleanArgument });
    expect(getByText(/Foo false/)).toBeDefined();
    expect(getByText(/Foo false/)).toBeDefined();
    expect(getByText('test boolean arg')).toBeDefined();
  });
});
