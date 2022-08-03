import { describe, expect, test } from 'vitest';
import { clamp, classNames } from './generic';

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
