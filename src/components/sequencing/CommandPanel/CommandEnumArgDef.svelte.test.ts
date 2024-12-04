import type { FswCommandArgumentEnum } from '@nasa-jpl/aerie-ampcs';
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CommandEnumArgDef from './CommandEnumArgDef.svelte';

describe('CommandEnumArgDef component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render units for an enum command argument', () => {
    const enumArgument: FswCommandArgumentEnum = {
      arg_type: 'enum',
      bit_length: 3,
      default_value: 'Foo true',
      description: 'test enum arg',
      enum_name: 'Foo enum name',
      name: 'Foo Enum',
      range: ['bar', 'baz', 'buzz'],
    };
    const { getByDisplayValue } = render(CommandEnumArgDef, { argDef: enumArgument });
    expect(getByDisplayValue(/bar/)).toBeDefined();
    expect(getByDisplayValue(/baz/)).toBeDefined();
    expect(getByDisplayValue(/buzz/)).toBeDefined();
  });
});
