/**
 * Comparator function for numbers or strings.
 * Defaults to ascending order.
 */
export function compare(a: number | string, b: number | string, isAsc = true): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Helper function for conditionally generating a complete classList string
 * @example classNames('foo', { bar: true, baz: false }) returns 'foo bar'
 */
export function classNames(baseClass: string, conditionalClasses?: Record<string, boolean>): string {
  return Object.keys(conditionalClasses).reduce((partialClassName: string, className: string) => {
    if (conditionalClasses[className]) {
      return `${partialClassName} ${className}`;
    }
    return partialClassName;
  }, baseClass);
}

/**
 * Returns a target based on an Event.
 */
export function getTarget(event: Event) {
  const { target: eventTarget } = event;
  const target = eventTarget as HTMLElement;

  if (target.tagName === 'INPUT') {
    const input = target as HTMLInputElement;
    const { name, type, value: valueAsString, valueAsNumber } = input;
    const value = type === 'number' ? valueAsNumber : valueAsString;

    return { name, value };
  } else if (target.tagName === 'SELECT') {
    const select = target as HTMLSelectElement;
    const type = select.getAttribute('data-type') ?? 'text';
    const { name, value: valueAsString } = select;
    const valueAsNumber = parseFloatOrNull(valueAsString);
    const value = type === 'number' ? valueAsNumber : valueAsString;

    return { name, value, valueAsNumber };
  } else {
    console.log('getTarget called with unknown tag');

    return { name: 'unknown', value: 'unknown' };
  }
}

/**
 * Returns true if a value is considered "empty". False otherwise.
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '' || Number.isNaN(value);
}

/**
 * Parses a string into a number. If string cannot be parsed just returns null.
 */
export function parseFloatOrNull(value: string | null): number | null {
  const valueAsNumber: number = parseFloat(value);
  return Number.isNaN(valueAsNumber) ? null : valueAsNumber;
}

/**
 * Removes a query param from the current URL.
 */
export function removeQueryParam(key: string): void {
  const { history, location } = window;
  const { hash, host, pathname, protocol, search } = location;

  const urlSearchParams = new URLSearchParams(search);
  urlSearchParams.delete(key);
  const params = urlSearchParams.toString();

  let path = `${protocol}//${host}${pathname}`;

  if (params !== '') {
    path = `${path}?${params}`;
  }

  if (hash !== '') {
    path = `${path}${hash}`;
  }

  history.replaceState({ path }, '', path);
}

/**
 * Changes the current URL to include a query parameter given by [key]=[value].
 * @note Only runs in the browser (not server-side).
 */
export function setQueryParam(key: string, value: string): void {
  const { history, location } = window;
  const { hash, host, pathname, protocol, search } = location;

  const urlSearchParams = new URLSearchParams(search);
  urlSearchParams.set(key, value);
  const params = urlSearchParams.toString();

  const path = `${protocol}//${host}${pathname}?${params}${hash}`;
  history.replaceState({ path }, '', path);
}

/**
 * Returns a promise that resolves after the given number of milliseconds has passed.
 */
export function sleep(milliseconds = 250): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
}
