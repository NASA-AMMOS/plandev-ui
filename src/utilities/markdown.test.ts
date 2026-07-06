import { describe, expect, test } from 'vitest';
import { isSafeColorValue, renderReportMarkdown } from './markdown';

describe('renderReportMarkdown', () => {
  test('returns an empty string for empty input', () => {
    expect(renderReportMarkdown('')).toBe('');
  });

  test('renders basic text formatting', () => {
    const html = renderReportMarkdown('**bold** and *italic* and ~~strike~~ and `code`');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<del>strike</del>');
    expect(html).toContain('<code>code</code>');
  });

  test('renders headings and lists', () => {
    const html = renderReportMarkdown('## Title\n\n- one\n- two');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  test('renders Github Flavored Markdown tables', () => {
    const html = renderReportMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  test('renders links and forces them to open safely in a new tab', () => {
    const html = renderReportMarkdown('[ticket](https://example.com/123)');
    expect(html).toContain('href="https://example.com/123"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test('strips <script> tags', () => {
    const html = renderReportMarkdown('hello <script>alert(1)</script> world');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  test('strips javascript: links', () => {
    const html = renderReportMarkdown('[x](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  test('strips event-handler attributes and images', () => {
    const html = renderReportMarkdown('<img src="x" onerror="alert(1)" />');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
  });

  test('keeps inline text color on a span', () => {
    const html = renderReportMarkdown('Status: <span style="color: #c00">CRITICAL</span>');
    expect(html).toContain('<span');
    expect(html).toContain('style="color: #c00"');
    expect(html).toContain('CRITICAL');
  });

  test('keeps background-color but drops unsafe CSS properties', () => {
    const html = renderReportMarkdown('<span style="background-color: yellow; position: fixed">x</span>');
    expect(html).toContain('background-color: yellow');
    expect(html).not.toContain('position');
  });

  test('drops a style carrying url() or expression(), keeping only the valid color', () => {
    const html = renderReportMarkdown(
      '<span style="color: red; background: url(https://evil.example); width: expression(alert(1))">x</span>',
    );
    expect(html).toContain('color: red');
    expect(html).not.toContain('url(');
    expect(html).not.toContain('expression');
    expect(html).not.toContain('background');
  });

  test('keeps background-color on raw HTML table cells', () => {
    const html = renderReportMarkdown(
      '<table><tbody><tr><td style="background-color: #fbdcdc; color: #900">x</td></tr></tbody></table>',
    );
    expect(html).toContain('<table>');
    expect(html).toContain('background-color: #fbdcdc');
    expect(html).toContain('color: #900');
  });

  test('strips iframes', () => {
    const html = renderReportMarkdown('<iframe src="https://evil.example"></iframe>');
    expect(html).not.toContain('<iframe');
  });
});

describe('isSafeColorValue', () => {
  test.each([
    'red',
    'RED',
    ' rebeccapurple ',
    'transparent',
    'currentColor',
    '#fff',
    '#FFF',
    '#abc123',
    '#11223344',
    'rgb(255, 0, 0)',
    'rgba(0, 0, 0, 0.5)',
    'hsl(120, 50%, 50%)',
    'hsla(120, 50%, 50%, 0.3)',
    'rgb(255 0 0 / 50%)',
  ])('accepts the valid color %j', value => {
    expect(isSafeColorValue(value)).toBe(true);
  });

  test.each([
    '',
    '   ',
    'url(https://evil.example)',
    'expression(alert(1))',
    'var(--accent)',
    'calc(100%)',
    '100px',
    '#12',
    '#123456789',
    '#xyz',
    'red; position: fixed',
    'rgb(255,0,0) /* comment */',
    'rgb(255,0,0)<script>',
    'rgb()',
  ])('rejects the unsafe or malformed color %j', value => {
    expect(isSafeColorValue(value)).toBe(false);
  });
});
