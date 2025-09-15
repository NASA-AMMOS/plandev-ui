import { expect, test } from 'vitest';
import { padNumber, pluralize } from './text';

test('pluralize', () => {
  expect(pluralize(0)).toBe('s');
  expect(pluralize(1)).toBe('');
  expect(pluralize(10)).toBe('s');
});

test('padNumber', () => {
  expect(padNumber(1, 3)).toBe('001');
  expect(padNumber(41, 5)).toBe('00041');
  expect(padNumber(10, 2)).toBe('10');
});
