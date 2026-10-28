import { Text } from '@codemirror/state';
import { describe, expect, test } from 'vitest';
import { createUnifiedDiff } from './unifiedDiff';

function diff(a: string, b: string, context?: number): string {
  return createUnifiedDiff(
    { doc: Text.of(a.split('\n')), name: 'a/file.txt' },
    { doc: Text.of(b.split('\n')), name: 'b/file.txt' },
    undefined,
    context,
  );
}

const numbered = (count: number) => Array.from({ length: count }, (_, i) => `line ${i + 1}`);

describe('createUnifiedDiff', () => {
  test('returns an empty string for identical documents', () => {
    expect(diff('a\nb\n', 'a\nb\n')).toBe('');
  });

  test('writes file names and labels on the header lines', () => {
    const output = createUnifiedDiff(
      { doc: Text.of(['x']), label: 'file.txt (Revision B)', name: 'a/file.txt' },
      { doc: Text.of(['y']), label: 'file.txt (Working copy)', name: 'b/file.txt' },
    );
    expect(output.split('\n').slice(0, 2)).toEqual([
      '--- a/file.txt\tfile.txt (Revision B)',
      '+++ b/file.txt\tfile.txt (Working copy)',
    ]);
  });

  test('shows a changed line with surrounding context', () => {
    const a = [...numbered(10), ''].join('\n');
    const b = a.replace('line 5\n', 'line five\n');
    expect(diff(a, b)).toBe(
      [
        '--- a/file.txt',
        '+++ b/file.txt',
        '@@ -2,7 +2,7 @@',
        ' line 2',
        ' line 3',
        ' line 4',
        '-line 5',
        '+line five',
        ' line 6',
        ' line 7',
        ' line 8',
        '',
      ].join('\n'),
    );
  });

  test('uses a zero start line for an insertion at the top of an empty file', () => {
    expect(diff('', 'new\n')).toBe(['--- a/file.txt', '+++ b/file.txt', '@@ -0,0 +1 @@', '+new', ''].join('\n'));
  });

  test('treats an empty document as having no lines', () => {
    expect(diff('', 'new')).toBe(
      ['--- a/file.txt', '+++ b/file.txt', '@@ -0,0 +1 @@', '+new', '\\ No newline at end of file', ''].join('\n'),
    );
    expect(diff('old\n', '')).toBe(['--- a/file.txt', '+++ b/file.txt', '@@ -1 +0,0 @@', '-old', ''].join('\n'));
  });

  test('splits distant changes into separate hunks and merges nearby ones', () => {
    const a = [...numbered(30), ''].join('\n');
    const distant = a.replace('line 2\n', 'two\n').replace('line 25\n', 'twenty-five\n');
    expect(diff(a, distant).match(/^@@/gm)).toHaveLength(2);
    const nearby = a.replace('line 2\n', 'two\n').replace('line 8\n', 'eight\n');
    expect(diff(a, nearby).match(/^@@/gm)).toHaveLength(1);
  });

  test('marks a last line that has no trailing newline', () => {
    expect(diff('a\nb\n', 'a\nb')).toBe(
      [
        '--- a/file.txt',
        '+++ b/file.txt',
        '@@ -1,2 +1,2 @@',
        ' a',
        '-b',
        '+b',
        '\\ No newline at end of file',
        '',
      ].join('\n'),
    );
  });

  test('marks an unterminated context line once', () => {
    expect(diff('x\na\nb', 'y\na\nb')).toBe(
      [
        '--- a/file.txt',
        '+++ b/file.txt',
        '@@ -1,3 +1,3 @@',
        '-x',
        '+y',
        ' a',
        ' b',
        '\\ No newline at end of file',
        '',
      ].join('\n'),
    );
  });

  test('respects the context size', () => {
    const a = [...numbered(10), ''].join('\n');
    const b = a.replace('line 5\n', 'line five\n');
    expect(diff(a, b, 0)).toContain('@@ -5 +5 @@\n-line 5\n+line five\n');
  });
});
