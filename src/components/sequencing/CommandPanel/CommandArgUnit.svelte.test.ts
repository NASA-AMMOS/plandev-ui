import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CommandArgUnit from './CommandArgUnit.svelte';

describe('CommandArgUnit component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render units for a boolean command argument', () => {
    const { getByText } = render(CommandArgUnit, {
      range: { max: 'Foo true', min: 'Foo false' },
      type: 'boolean',
      typeDisplay: 'Foo boolean',
    });
    expect(getByText(/Foo false/)).toBeDefined();
    expect(getByText(/Foo true/)).toBeDefined();
  });

  it('Should render a range for a command argument', () => {
    const { getByText } = render(CommandArgUnit, {
      range: { max: '24', min: '2' },
      type: 'number',
      typeDisplay: 'Foo number',
    });
    expect(getByText(/2/)).toBeDefined();
    expect(getByText(/-/)).toBeDefined();
    expect(getByText(/24/)).toBeDefined();
  });

  it('Should render units for a string command argument', () => {
    const { getByText } = render(CommandArgUnit, {
      type: 'string',
      typeDisplay: 'Foo string',
    });
    expect(getByText(/Foo string/)).toBeDefined();
  });

  it('Should render short version of unit', () => {
    const { getByText, queryByText } = render(CommandArgUnit, {
      type: 'string',
      typeDisplay: 'Foo string',
      unit: 'bar baz',
      unitShortName: 'foo',
    });
    expect(getByText('foo')).toBeDefined();
    expect(queryByText('bar baz')).toBeNull();
  });

  it('Should render unit if no short version is provided', () => {
    const { getByText } = render(CommandArgUnit, {
      type: 'string',
      typeDisplay: 'Foo string',
      unit: 'bar baz',
    });
    expect(getByText('bar baz')).toBeDefined();
  });
});
