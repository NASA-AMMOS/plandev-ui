import { afterAll, describe, expect, test, vi } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

import {
  attemptStringConversion,
  clamp,
  classNames,
  compareWithRankings,
  extractQuotes,
  filterEmpty,
  filterNullish,
  lowercase,
  parseJSONStream,
  unique,
} from './generic';

describe('Generic utility function tests', () => {
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
    test('Should correctly determine if something is not null or undefined or an empty string', () => {
      expect(filterEmpty(0)).toEqual(true);
      expect(filterEmpty(false)).toEqual(true);
      expect(filterEmpty(null)).toEqual(false);
      expect(filterEmpty(undefined)).toEqual(false);
      expect(filterEmpty('foo')).toEqual(true);
      expect(filterEmpty('')).toEqual(false);
    });

    test('Should correctly filter out null and undefined entries in arrays', () => {
      expect([0, 1, 2, null, 4, undefined, 5].filter(filterEmpty)).toStrictEqual([0, 1, 2, 4, 5]);
      expect(['false', false, { foo: 1 }, null, undefined, ''].filter(filterEmpty)).toStrictEqual([
        'false',
        false,
        { foo: 1 },
      ]);
    });
  });

  describe('filterNullish', () => {
    test('Should correctly determine if something is not null or undefined', () => {
      expect(filterNullish(0)).toEqual(true);
      expect(filterNullish(false)).toEqual(true);
      expect(filterNullish(null)).toEqual(false);
      expect(filterNullish(undefined)).toEqual(false);
    });

    test('Should correctly filter out null and undefined entries in arrays', () => {
      expect([0, 1, 2, null, 4, undefined, 5].filter(filterNullish)).toStrictEqual([0, 1, 2, 4, 5]);
      expect(['false', false, { foo: 1 }, null, undefined].filter(filterNullish)).toStrictEqual([
        'false',
        false,
        { foo: 1 },
      ]);
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

  describe('unique', () => {
    test('Should make a list of primitives unique', () => {
      const base = [1, 7, 1, 3, 2, 4, 3, 4, 15, 10, 10];
      const uniqued = unique(base);
      expect(uniqued).toEqual([1, 7, 3, 2, 4, 15, 10]);
    });

    test('Should not make a list of objects unique', () => {
      const base = [{ a: 1 }, { a: 3 }, { a: 1 }];
      const uniqued = unique(base);
      expect(uniqued).toEqual([{ a: 1 }, { a: 3 }, { a: 1 }]);
    });
  });

  describe('parseJSONStream', () => {
    test('Should be able to parse a really long JSON string', async () => {
      const { readable, writable } = new TransformStream();

      const writer = writable.getWriter();
      await writer.ready;
      writer.write('{"activities":[');
      const numOfActivities = 5000;
      for (let i = 0; i < numOfActivities; i++) {
        writer.write(JSON.stringify({ arguments: { metadata: {}, name: 'PeelBanana', peelDirection: 'fromTip' } }));
        if (i < numOfActivities - 1) {
          writer.write(',');
        }
      }
      writer.write(']}');
      writer.close();

      expect(await parseJSONStream(readable as unknown as ReadableStream)).toBeTypeOf('object');
    });
  });

  describe('lowercase', () => {
    test('Should lowercase a string', () => {
      expect(lowercase('ABC')).to.eq('abc');
    });
    test('Should skip lowercasing if a string not provided', () => {
      expect(lowercase([])).to.deep.eq([]);
    });
  });

  describe('extractQuotes', () => {
    test('Should extract all quotes from a string', () => {
      expect(extractQuotes('')).to.deep.eq({ quotes: [], text: '' });
      expect(extractQuotes('"')).to.deep.eq({ quotes: [], text: '"' });
      expect(extractQuotes('"')).to.deep.eq({ quotes: [], text: '"' });
      expect(extractQuotes('""')).to.deep.eq({ quotes: [], text: '""' });
      expect(extractQuotes('A "B" C')).to.deep.eq({ quotes: ['B'], text: 'A {{QUOTE}} C' });
      expect(extractQuotes('"A" "B" "C"')).to.deep.eq({
        quotes: ['A', 'B', 'C'],
        text: '{{QUOTE}} {{QUOTE}} {{QUOTE}}',
      });
    });
  });

  describe('compareWithRankings', () => {
    test('sorts an array according to explicit rankings', () => {
      const rankings = { completed: 3, draft: 1, 'in progress': 2 };
      const values = ['completed', 'draft', 'in progress'];

      values.sort((valueA, valueB) => compareWithRankings(valueA, valueB, rankings));

      expect(values).toEqual(['draft', 'in progress', 'completed']);
    });

    test('uses a value ranking before a type ranking', () => {
      const rankings = { '42': 3, number: 1 };
      const values = [42, 7];

      values.sort((valueA, valueB) => compareWithRankings(valueA, valueB, rankings));

      expect(values).toEqual([7, 42]);
    });

    test('uses type rankings when no value-specific ranking exists', () => {
      const rankings = { number: 1, string: 2 };
      const values = ['10', 10];

      values.sort((valueA, valueB) => compareWithRankings(valueA, valueB, rankings));

      expect(values).toEqual([10, '10']);
    });

    test('compares numbers numerically when they have the same rank', () => {
      const rankings = { number: 1 };
      const values = [10, 2, 100];

      values.sort((valueA, valueB) => compareWithRankings(valueA, valueB, rankings));

      expect(values).toEqual([2, 10, 100]);
    });

    test('compares non-numbers using numeric-aware locale ordering when they have the same rank', () => {
      const rankings = { string: 1 };
      const values = ['item10', 'item2', 'item1'];

      values.sort((valueA, valueB) => compareWithRankings(valueA, valueB, rankings));

      expect(values).toEqual(['item1', 'item2', 'item10']);
    });

    test('uses the default rank for null and unranked values', () => {
      const rankings = { ready: 1 };
      const values = ['ready', null, 'unknown'];

      values.sort((valueA, valueB) => compareWithRankings(valueA, valueB, rankings));

      expect(values).toEqual([null, 'unknown', 'ready']);
    });
  });
});
