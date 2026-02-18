/**
 * Sanitizes a string for use as a cmdk Command.Item `value` prop.
 *
 * cmdk internally uses `querySelector('[data-value="..."]')` with the raw value,
 * so characters that are invalid in CSS double-quoted string tokens will throw
 * a SyntaxError and break the component (the menu becomes un-closable).
 *
 * See: https://github.com/shadcn-ui/ui/issues/2817
 *
 * Strips: quotes (" '), backslashes (\), and null bytes (\0)
 * Replaces: newlines (\n, \r) and form feeds (\f) with spaces
 *
 * Note: We may be able to remove this sanitization if/when we update to
 *       svelte 5 + new shadcn-svelte that does not use cmdk.
 */
export function sanitizeCmdkValue(value: string): string {
  return value.replace(/["'\\\0]/g, '').replace(/[\n\r\f]+/g, ' ');
}

export function pluralize(count: number): string {
  return count === 1 ? '' : 's';
}

/*
 * Converts a number to a string and pads it with leading zeroes so that its total length is at least len characters
 */
export function padNumber(num: number, len: number): string {
  return num.toString().padStart(len, '0');
}
