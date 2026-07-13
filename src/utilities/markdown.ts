import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders a curated, GitHub-flavored Markdown subset to sanitized HTML for the
 * action run "Report" block.
 *
 * Report content is author-provided and rendered in other users' browsers, so
 * it is treated as untrusted: we parse with `marked`, then sanitize with a
 * strict allowlist. The only inline styling allowed is text color
 * (`color`/`background-color` on a `<span>`), and only with validated color
 * values — every other CSS property, plus scripts, event handlers,
 * `javascript:` links, and `<img>`/`<video>`/`<iframe>`, are stripped.
 */

const ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
];

const ALLOWED_ATTR = ['align', 'colspan', 'href', 'rel', 'rowspan', 'style', 'target', 'title'];

const SAFE_COLOR_PROPERTIES = new Set(['background-color', 'color']);

// Accepts only literal color values: named keywords, `#hex`, and `rgb()`/`hsl()`
// functions whose contents are restricted to safe characters. Anything with
// `url(...)`, `var(...)`, `expression(...)`, comments, or escapes fails to match
// and is therefore dropped — so there is no resource-loading or layout surface.
// Exported for unit testing.
export function isSafeColorValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return /^#[0-9a-f]{3,8}$/.test(v) || /^[a-z]+$/.test(v) || /^(?:rgb|rgba|hsl|hsla)\([0-9.,%/\s]+\)$/.test(v);
}

let purify: typeof DOMPurify | null = null;

function getPurify(): typeof DOMPurify {
  if (!purify) {
    purify = DOMPurify(window);
    // Force links to open safely in a new tab. DOMPurify's default
    // ALLOWED_URI_REGEXP already blocks `javascript:`/`data:` hrefs.
    purify.addHook('afterSanitizeAttributes', node => {
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    // Allow inline color only. Rebuild the `style` attribute from validated
    // `color`/`background-color` declarations and drop everything else — so a
    // style can never carry `url()` exfil or layout/clickjacking properties.
    purify.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName !== 'style') {
        return;
      }
      const safeDeclarations = data.attrValue
        .split(';')
        .map(declaration => {
          const separator = declaration.indexOf(':');
          if (separator === -1) {
            return null;
          }
          const property = declaration.slice(0, separator).trim().toLowerCase();
          const value = declaration.slice(separator + 1).trim();
          return SAFE_COLOR_PROPERTIES.has(property) && isSafeColorValue(value) ? `${property}: ${value}` : null;
        })
        .filter(Boolean);

      if (safeDeclarations.length) {
        data.attrValue = safeDeclarations.join('; ');
      } else {
        data.keepAttr = false;
      }
    });
  }
  return purify;
}

export function renderReportMarkdown(markdown: string): string {
  if (!markdown) {
    return '';
  }
  try {
    const html = marked.parse(markdown, { async: false, gfm: true });
    return getPurify().sanitize(html, { ALLOWED_ATTR, ALLOWED_TAGS });
  } catch (error) {
    console.warn('Failed to render action report markdown', error);
    return '';
  }
}
