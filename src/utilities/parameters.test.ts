import { describe, expect, test } from 'vitest';
import { getArgument, getValueSchemaDefaultValue } from './parameters';

describe('getArgument', () => {
  test('Should return the preset value', () => {
    expect(getArgument('foo', { type: 'string' }, 'foo', 'bar')).toStrictEqual({ value: 'foo', valueSource: 'preset' });
    expect(getArgument(null, { type: 'string' }, 'foo', 'bar')).toStrictEqual({ value: 'foo', valueSource: 'preset' });
    expect(getArgument(undefined, { type: 'string' }, null, 'bar')).toStrictEqual({
      value: null,
      valueSource: 'preset',
    });
  });

  test('Should return the user overridden value', () => {
    expect(getArgument('oof', { type: 'string' }, 'foo', 'bar')).toStrictEqual({
      value: 'oof',
      valueSource: 'user on preset',
    });
    expect(getArgument('oof', { type: 'string' }, undefined, 'bar')).toStrictEqual({
      value: 'oof',
      valueSource: 'user on model',
    });
  });

  test('Should return the default mission value', () => {
    expect(getArgument(undefined, { type: 'string' }, undefined, 'bar')).toStrictEqual({
      value: 'bar',
      valueSource: 'mission',
    });
  });

  test('Should return an empty array for a series', () => {
    expect(getArgument(undefined, { items: { type: 'string' }, type: 'series' }, undefined, undefined)).toStrictEqual({
      value: [],
      valueSource: 'none',
    });
  });

  test('Should return an empty struct constructed based off of the provided schema', () => {
    expect(
      getArgument(
        undefined,
        {
          items: {
            bar: {
              items: {
                baz: { type: 'boolean' },
              },
              type: 'struct',
            },
            foo: { type: 'string' },
          },
          type: 'struct',
        },
        undefined,
        undefined,
      ),
    ).toStrictEqual({
      value: {
        bar: {
          baz: null,
        },
        foo: null,
      },
      valueSource: 'none',
    });
  });

  test('Should return null values for basic data types when no values are provided', () => {
    expect(getArgument(undefined, { type: 'boolean' }, undefined, undefined)).toStrictEqual({
      value: null,
      valueSource: 'none',
    });
    expect(getArgument(undefined, { type: 'duration' }, undefined, undefined)).toStrictEqual({
      value: null,
      valueSource: 'none',
    });
    expect(getArgument(undefined, { type: 'int' }, undefined, undefined)).toStrictEqual({
      value: null,
      valueSource: 'none',
    });
    expect(getArgument(undefined, { type: 'path' }, undefined, undefined)).toStrictEqual({
      value: null,
      valueSource: 'none',
    });
    expect(getArgument(undefined, { type: 'real' }, undefined, undefined)).toStrictEqual({
      value: null,
      valueSource: 'none',
    });
    expect(getArgument(undefined, { type: 'string' }, undefined, undefined)).toStrictEqual({
      value: null,
      valueSource: 'none',
    });
  });
});

describe('getValueSchemaDefaultValue', () => {
  test('boolean', () => {
    const defaultBooleanValue = getValueSchemaDefaultValue({ type: 'boolean' });
    expect(defaultBooleanValue).toEqual(false);
  });

  test('duration', () => {
    const defaultDurationValue = getValueSchemaDefaultValue({ type: 'duration' });
    expect(defaultDurationValue).toEqual(0);
  });

  test('int', () => {
    const defaultIntValue = getValueSchemaDefaultValue({ type: 'int' });
    expect(defaultIntValue).toEqual(0);
  });

  test('path', () => {
    const defaultPathValue = getValueSchemaDefaultValue({ type: 'path' });
    expect(defaultPathValue).toEqual('');
  });

  test('real', () => {
    const defaultRealValue = getValueSchemaDefaultValue({ type: 'real' });
    expect(defaultRealValue).toEqual(0);
  });

  test('series', () => {
    const defaultSeriesValue = getValueSchemaDefaultValue({ items: { type: 'int' }, type: 'series' });
    expect(defaultSeriesValue).toEqual([0]);
  });

  test('struct', () => {
    const defaultStructValue = getValueSchemaDefaultValue({ items: { foo: { type: 'string' } }, type: 'struct' });
    expect(defaultStructValue).toEqual({ foo: '' });
  });

  test('string', () => {
    const defaultStringValue = getValueSchemaDefaultValue({ type: 'string' });
    expect(defaultStringValue).toEqual('');
  });

  test('variant', () => {
    const defaultVariantValue = getValueSchemaDefaultValue({ type: 'variant', variants: [{ key: 'A', label: 'A' }] });
    expect(defaultVariantValue).toEqual('A');
  });
});
