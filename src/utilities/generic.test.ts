import { afterAll, describe, expect, test, vi } from 'vitest';
import { attemptStringConversion, clamp, classNames, filterEmpty, formatHasuraStringArray, isMacOs } from './generic';

const mockNavigator = {
  platform: 'MacIntel',
};

vi.stubGlobal('navigator', mockNavigator);

afterAll(() => {
  vi.restoreAllMocks();
});

describe('clamp', () => {
  test('Should clamp a number already in the correct range to the number itself', () => {
    const clampedNumber = clamp(10, 0, 20);
    expect(clampedNumber).toEqual(10);
  });

  test('Should clamp a number smaller than the correct range to the lower bound in the range', () => {
    const clampedNumber = clamp(5, 10, 20);
    expect(clampedNumber).toEqual(10);
  });

  test('Should clamp a number larger than the correct range to the upper bound in the range', () => {
    const clampedNumber = clamp(25, 10, 20);
    expect(clampedNumber).toEqual(20);
  });
});

describe('classNames', () => {
  test('Should generate the correct complete class string given an object of conditionals', () => {
    expect(
      classNames('foo', {
        bar: true,
        baz: false,
      }),
    ).toEqual('foo bar');

    expect(
      classNames('foo', {
        bar: true,
        baz: true,
      }),
    ).toEqual('foo bar baz');

    expect(
      classNames('foo', {
        bar: false,
        baz: false,
      }),
    ).toEqual('foo');
  });
});

describe('filterEmpty', () => {
  test('Should correctly determine if something is not null or undefined', () => {
    expect(filterEmpty(0)).toEqual(true);
    expect(filterEmpty(false)).toEqual(true);
    expect(filterEmpty(null)).toEqual(false);
    expect(filterEmpty(undefined)).toEqual(false);
  });

  test('Should correctly filter out null and undefined entries in arrays', () => {
    expect([0, 1, 2, null, 4, undefined, 5].filter(filterEmpty)).toStrictEqual([0, 1, 2, 4, 5]);
    expect(['false', false, { foo: 1 }, null, undefined].filter(filterEmpty)).toStrictEqual([
      'false',
      false,
      { foo: 1 },
    ]);
  });
});

describe('formatHasuraStringArray', () => {
  test('Should generate the correct string given a string array', () => {
    expect(formatHasuraStringArray(['foo', 'bar'])).toEqual('{foo,bar}');
  });
  test('Should generate the correct string given an empty string array', () => {
    expect(formatHasuraStringArray([])).toEqual('{}');
  });
});

describe('attemptStringConversion', () => {
  test('Should convert strings to strings', () => {
    expect(attemptStringConversion('')).toEqual('');
    expect(attemptStringConversion('Foo')).toEqual('Foo');
  });
  test('Should convert numbers to strings', () => {
    expect(attemptStringConversion(1.0101)).toEqual('1.0101');
  });
  test('Should convert arrays to strings', () => {
    expect(attemptStringConversion([1.0101, 'Foo'])).toEqual('1.0101,Foo');
  });
  test('Should convert booleans to strings', () => {
    expect(attemptStringConversion(true)).toEqual('true');
    expect(attemptStringConversion(false)).toEqual('false');
  });
  test('Should return null when attempting to convert non-stringable values', () => {
    expect(attemptStringConversion(null)).toEqual(null);
    expect(attemptStringConversion(undefined)).toEqual(null);
  });
});

describe('isMacOs', () => {
  test('Should return true for Mac browsers', () => {
    expect(isMacOs()).toEqual(true);

    mockNavigator.platform = 'MacPPC';
    expect(isMacOs()).toEqual(true);

    mockNavigator.platform = 'Mac68K';
    expect(isMacOs()).toEqual(true);
  });

  test('Should return false for Windows browsers', () => {
    mockNavigator.platform = 'Win32';
    expect(isMacOs()).toEqual(false);

    mockNavigator.platform = 'Windows';
    expect(isMacOs()).toEqual(false);
  });

  test('Should return false for Linux browsers', () => {
    mockNavigator.platform = 'Linux i686';
    expect(isMacOs()).toEqual(false);

    mockNavigator.platform = 'Linux x86_64';
    expect(isMacOs()).toEqual(false);
  });
});
