import { describe, expect, test } from 'vitest';
import { padNumber, pluralize, safeStringify, sanitizeCmdkValue } from './text';

describe('sanitizeCmdkValue', () => {
  test('returns plain text unchanged', () => {
    expect(sanitizeCmdkValue('hello world')).toBe('hello world');
  });

  test('strips double quotes', () => {
    expect(sanitizeCmdkValue('call the "Store in Box" action')).toBe('call the Store in Box action');
  });

  test('strips single quotes', () => {
    expect(sanitizeCmdkValue("it's a test")).toBe('its a test');
  });

  test('strips backslashes', () => {
    expect(sanitizeCmdkValue('path\\to\\file')).toBe('pathtofile');
  });

  test('strips null bytes', () => {
    expect(sanitizeCmdkValue('before\0after')).toBe('beforeafter');
  });

  test('replaces newlines with spaces', () => {
    expect(sanitizeCmdkValue('line1\nline2')).toBe('line1 line2');
  });

  test('replaces carriage returns with spaces', () => {
    expect(sanitizeCmdkValue('line1\r\nline2')).toBe('line1 line2');
  });

  test('replaces form feeds with spaces', () => {
    expect(sanitizeCmdkValue('before\fafter')).toBe('before after');
  });

  test('collapses consecutive newlines into a single space', () => {
    expect(sanitizeCmdkValue('line1\n\n\nline2')).toBe('line1 line2');
  });

  test('handles combined problematic characters', () => {
    expect(sanitizeCmdkValue('Deliver files Generate a "File Delivery List".\nFiles must call "Store to OCS".')).toBe(
      'Deliver files Generate a File Delivery List. Files must call Store to OCS.',
    );
  });

  test('preserves special characters valid in CSS strings', () => {
    expect(sanitizeCmdkValue('brackets []{}() and symbols @#$%^&*')).toBe('brackets []{}() and symbols @#$%^&*');
  });
});

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

describe('safeStringify', () => {
  test('Should stringify normal objects', () => {
    const obj = { a: 1, b: 'test', c: true };
    expect(safeStringify(obj)).toBe('{"a":1,"b":"test","c":true}');
  });

  test('Should handle circular references', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj.self = obj;
    const result = safeStringify(obj);
    expect(result).toContain('[Circular]');
  });

  test('Should handle nested circular references', () => {
    const parent: Record<string, unknown> = { name: 'parent' };
    const child: Record<string, unknown> = { name: 'child', parent };
    parent.child = child;
    const result = safeStringify(parent);
    expect(result).toContain('[Circular]');
  });

  test('Should fallback to toString for non-serializable values', () => {
    const obj = { id: 123n };
    const result = safeStringify(obj);
    expect(result).toBe('[object Object]');
  });
});
