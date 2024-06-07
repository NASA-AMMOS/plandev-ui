import { describe, expect, it } from 'vitest';
import { isQuoted, quoteEscape, removeEscapedQuotes, unquoteUnescape } from './codemirror-utils';

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
