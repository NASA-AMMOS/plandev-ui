export function pluralize(count: number): string {
  return count === 1 ? '' : 's';
}

/*
 * Converts a number to a string and pads it with leading zeroes so that its total length is at least len characters
 */
export function padNumber(num: number, len: number): string {
  return num.toString().padStart(len, '0');
}
