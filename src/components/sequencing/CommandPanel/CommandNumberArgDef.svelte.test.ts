import type {
  FswCommandArgumentFloat,
  FswCommandArgumentInteger,
  FswCommandArgumentNumeric,
  FswCommandArgumentUnsigned,
} from '@nasa-jpl/aerie-ampcs';
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CommandNumberArgDef from './CommandNumberArgDef.svelte';

describe('CommandNumberArgDef component', () => {
  afterEach(() => {
    cleanup();
  });

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
    const { getByText } = render(CommandNumberArgDef, { argDef: floatArgument });
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
    const { getByText } = render(CommandNumberArgDef, { argDef: integerArgument });
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
    const { getByText } = render(CommandNumberArgDef, { argDef: unsignedArgument });
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
    const { getByText } = render(CommandNumberArgDef, { argDef: numericArgument });
    expect(getByText(/0/)).toBeDefined();
    expect(getByText(/20/)).toBeDefined();
  });
});
