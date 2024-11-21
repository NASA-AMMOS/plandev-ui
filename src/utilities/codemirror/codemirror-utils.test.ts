import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import { describe, expect, it } from 'vitest';
import {
  getDefaultVariableArgs,
  isHexValue,
  isQuoted,
  parseNumericArg,
  quoteEscape,
  removeEscapedQuotes,
  unquoteUnescape,
} from './codemirror-utils';

describe(`'Escaped quotes' from input`, () => {
  it('Should remove escaped quotes surrounding a string', () => {
    const input = `\\"Hello, World!\\"`;
    const expected = '"Hello, World!"';

    expect(removeEscapedQuotes(input)).toBe(expected);
  });

  it('Should remove escaped quotes within a string', () => {
    const input = `The world is \\"Hello, World!\\"`;
    const expected = 'The world is "Hello, World!"';

    expect(removeEscapedQuotes(input)).toBe(expected);
  });

  it('should not modify a string without escaped quotes', () => {
    const input = 'Hello, World!';
    const expected = 'Hello, World!';
    expect(removeEscapedQuotes(input)).toBe(expected);
  });

  it('should return a number unchanged', () => {
    const input = 123;
    expect(removeEscapedQuotes(input)).toBe(input);
  });

  it('should return a boolean unchanged', () => {
    const input = true;
    expect(removeEscapedQuotes(input)).toBe(input);
  });
});

describe('quoteEscape', () => {
  it('should escape double quotes with a backslash', () => {
    expect(quoteEscape('"')).toBe(`"\\""`);
  });

  it('should escape multiple double quotes with multiple backslashes', () => {
    expect(quoteEscape('""')).toBe(`"\\"\\""`);
  });

  it('should not escape non-double quotes', () => {
    expect(quoteEscape('abc')).toBe(`"abc"`);
  });

  it('should escape double quotes within a string', () => {
    expect(quoteEscape('hello "world"')).toBe(`"hello \\"world\\""`);
  });

  describe('isQuoted', () => {
    it('should return true for a string surrounded by double quotes', () => {
      expect(isQuoted('"hello"')).toBe(true);
    });

    it('should return false for a string not surrounded by double quotes', () => {
      expect(isQuoted('hello')).toBe(false);
    });

    it('should return false for a string with only one double quote', () => {
      expect(isQuoted('"hello')).toBe(false);
      expect(isQuoted('hello"')).toBe(false);
    });
  });

  describe('unquoteUnescape', () => {
    it('should remove double quotes and unescape double quotes from a string surrounded by double quotes', () => {
      expect(unquoteUnescape('"hello \\"world\\""')).toBe('hello "world"');
    });

    it('should return the input string if it is not surrounded by double quotes', () => {
      expect(unquoteUnescape('hello')).toBe('hello');
    });

    it('should return the input string if it is only one double quote', () => {
      expect(unquoteUnescape('"')).toBe('"');
      expect(unquoteUnescape('""')).toBe('');
      expect(unquoteUnescape('"hello')).toBe('"hello');
      expect(unquoteUnescape('hello"')).toBe('hello"');
    });
  });
});

describe('parseNumericArg', () => {
  it("should parse 'float' and 'numeric' args as floats", () => {
    expect(parseNumericArg('1.23', 'float')).toEqual(1.23);
    expect(parseNumericArg('2.34', 'numeric')).toEqual(2.34);
    expect(parseNumericArg('bad', 'float')).toEqual(NaN);
    // can't parse hex numbers as float
    expect(parseNumericArg('0xabc', 'float')).toEqual(0);
  });
  it("should parse 'integer' and 'unsigned' args as integers", () => {
    expect(parseNumericArg('123', 'integer')).toEqual(123);
    expect(parseNumericArg('234', 'unsigned')).toEqual(234);
    expect(parseNumericArg('234.567', 'integer')).toEqual(234);
    // can parse hex integers
    expect(parseNumericArg('0xff', 'integer')).toEqual(255);
    expect(parseNumericArg('0x1f', 'unsigned')).toEqual(31);
  });
});
describe('isHexValue', () => {
  it('should correctly identify a hex number string', () => {
    expect(isHexValue('12')).toBe(false);
    expect(isHexValue('ff')).toBe(false);
    expect(isHexValue('0x99')).toBe(true);
    expect(isHexValue('0xdeadBEEF')).toBe(true);
    expect(isHexValue('0x12ab')).toBe(true);
    expect(isHexValue('0x12xx')).toBe(false);
  });
});
describe('getDefaultVariableArgs', () => {
  const mockParameters = [
    { name: 'exampleString', type: 'STRING' },
    { allowable_ranges: [{ min: 1.2 }], type: 'FLOAT' },
    { allowable_ranges: [{ min: 5 }], type: 'INT' },
    { allowable_ranges: [{ min: 7 }], type: 'UINT' },
    { allowable_values: ['VALUE1'], enum_name: 'ExampleEnum', type: 'ENUM' },
    { type: 'INT' },
  ] as VariableDeclaration[];
  it('should return default values for different types', () => {
    const result = getDefaultVariableArgs(mockParameters);
    expect(result).toEqual(['"exampleString"', 1.2, 5, 7, '"VALUE1"', 0]);
  });
});
