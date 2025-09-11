import { describe, expect, test } from 'vitest';
import {
  formatParameterValue,
  getArgument,
  getCleansedStructArguments,
  getValueSchemaDefaultValue,
  isRecParameter,
} from './parameters';

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

describe('isRecParameter', () => {
  test('Should return true for a form parameter that is a recursive parameter', () => {
    expect(
      isRecParameter({
        errors: [],
        name: 'test',
        order: 0,
        schema: {
          items: {
            type: 'string',
          },
          type: 'series',
        },
        value: 'foo',
        valueSource: 'mission',
      }),
    ).toEqual(true);

    expect(
      isRecParameter({
        errors: [],
        name: 'test',
        order: 0,
        schema: {
          items: {
            foo: {
              type: 'string',
            },
          },
          type: 'struct',
        },
        value: 'foo',
        valueSource: 'mission',
      }),
    ).toEqual(true);

    expect(
      isRecParameter({
        errors: [],
        name: 'test',
        order: 0,
        schema: {
          type: 'string',
        },
        value: 'foo',
        valueSource: 'mission',
      }),
    ).toEqual(false);
  });

  test('Should return false for a form parameter that is not a recursive parameter', () => {
    expect(
      isRecParameter({
        errors: [],
        name: 'test',
        order: 0,
        schema: {
          type: 'string',
        },
        value: 'foo',
        valueSource: 'mission',
      }),
    ).toEqual(false);

    expect(
      isRecParameter({
        errors: [],
        name: 'test',
        order: 0,
        schema: {
          type: 'boolean',
        },
        value: 'foo',
        valueSource: 'mission',
      }),
    ).toEqual(false);
  });
});

describe('formatParameterValue', () => {
  test('Should return empty string for null and undefined values', () => {
    expect(formatParameterValue(null, { type: 'string' })).toBe('');
    expect(formatParameterValue(undefined, { type: 'string' })).toBe('');
  });

  test('Should format duration values using convertUsToDurationString', () => {
    expect(formatParameterValue(3600000000, { type: 'duration' })).toBe('0y 0d 1h 0m 0s 0ms 0us');
    expect(formatParameterValue(0, { type: 'duration' })).toBe('0y 0d 0h 0m 0s 0ms 0us');
  });

  test('Should handle duration formatting errors', () => {
    expect(formatParameterValue('invalid', { type: 'duration' })).toBe('NaNy NaNd NaNh NaNm NaNs NaNms NaNus');
  });

  test('Should format series values as lists', () => {
    expect(formatParameterValue([], { items: { type: 'string' }, type: 'series' })).toBe('[]');
    expect(formatParameterValue(['a', 'b', 'c'], { items: { type: 'string' }, type: 'series' })).toBe('a, b, c');
  });

  test('Should format map structures (arrays of key-value objects) properly', () => {
    const intMapValue = [
      { key: 551, value: 56111 },
      { key: 5311, value: 541 },
    ];
    expect(formatParameterValue(intMapValue, { items: { type: 'string' }, type: 'series' })).toBe(
      '551: 56111, 5311: 541',
    );

    const stringMapValue = [
      { key: '699', value: '70' },
      { key: '711', value: '721' },
    ];
    expect(formatParameterValue(stringMapValue, { items: { type: 'string' }, type: 'series' })).toBe(
      '699: 70, 711: 721',
    );

    expect(formatParameterValue([], { items: { type: 'string' }, type: 'series' })).toBe('[]');
  });

  test('Should format struct values with keys and values', () => {
    expect(formatParameterValue({}, { items: {}, type: 'struct' })).toBe('{}');
    expect(formatParameterValue({ a: 1, b: 2 }, { items: {}, type: 'struct' })).toBe('a: 1,\nb: 2');
  });

  test('Should convert values to string for other types', () => {
    expect(formatParameterValue('hello', { type: 'string' })).toBe('hello');
    expect(formatParameterValue(42, { type: 'int' })).toBe('42');
    expect(formatParameterValue(true, { type: 'boolean' })).toBe('true');
    expect(formatParameterValue(3.14, { type: 'real' })).toBe('3.14');
    expect(formatParameterValue('/path/to/file', { type: 'path' })).toBe('/path/to/file');
  });
});

describe('getCleansedStructArguments', () => {
  test('Should remove any arguments in the arguments object that does not exist in the schema', () => {
    expect(
      getCleansedStructArguments(
        { bar: 'baz', foo: 1 },
        {
          items: {
            foo: {
              type: 'int',
            },
          },
          type: 'struct',
        },
      ),
    ).toEqual({ foo: 1 });

    expect(
      getCleansedStructArguments(
        { bar: 'baz', buzz: false, foo: 1 },
        {
          items: {
            buzz: {
              type: 'boolean',
            },
            foo: {
              type: 'int',
            },
          },
          type: 'struct',
        },
      ),
    ).toEqual({ buzz: false, foo: 1 });
  });
});
