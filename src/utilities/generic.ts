import { browser } from '$app/environment';
import type { SearchParameters } from '../enums/searchParameters';

/**
 * Returns the string version of an object of unknown type or returns null if this operation fails.
 */
export function attemptStringConversion(x: any) {
  try {
    return x.toString();
  } catch (err) {
    return null;
  }
}

/**
 * Utility function that returns a list of keys that have changed between two objects of the same type.
 * Optionally keys can be ignored from the comparison.
 */
export function changedKeys<T>(objA: T, objB: T, ignoreKeys: (keyof T)[] = []): string[] {
  const changedKeys: string[] = [];

  (Object.keys(objA as object) as Array<keyof T>)
    .filter(key => ignoreKeys.indexOf(key) < 0)
    .forEach(key => {
      const valueA = objA[key];
      const valueB = objB[key];
      if (
        (typeof valueA === 'string' ||
          typeof valueB === 'string' ||
          typeof valueA === 'number' ||
          typeof valueB === 'number' ||
          valueA === null ||
          valueB === null ||
          valueA === undefined ||
          valueB === undefined) &&
        valueA !== valueB
      ) {
        changedKeys.push(String(key));
      }

      if (
        typeof valueA === 'object' &&
        typeof valueB === 'object' &&
        JSON.stringify(valueA) !== JSON.stringify(valueB)
      ) {
        changedKeys.push(String(key));
      }
    });

  return changedKeys;
}

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
  return Object.keys(conditionalClasses ?? {}).reduce((partialClassName: string, className: string) => {
    if (conditionalClasses?.[className]) {
      return `${partialClassName} ${className}`;
    }
    return partialClassName;
  }, baseClass);
}

/**
 * Helper function for filtering out null or undefined entries in an array
 * @example [0, 1, 2, null, 4, undefined, 5].filter(filterEmpty) return [0, 1, 2, 4, 5]
 */
export function filterEmpty<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Returns a target based on an Event.
 */
export function getTarget(event: Event) {
  const { target: eventTarget } = event;
  const target = eventTarget as HTMLElement;

  if (target.tagName === 'INPUT') {
    const input = target as HTMLInputElement;
    const { name, type, value: valueAsString, valueAsNumber, checked } = input;
    let convertedValue;

    switch (type) {
      case 'number':
        convertedValue = valueAsNumber;
        break;
      case 'checkbox':
        convertedValue = checked;
        break;
      default:
        convertedValue = valueAsString;
    }

    return { name, value: convertedValue };
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
 * Returns true if the current browser is running on MacOS
 */
export function isMacOs(): boolean {
  return /mac/i.test(window.navigator.platform);
}

/**
 * Returns true if the mouse event is a right click
 */
export function isRightClick(e: MouseEvent) {
  return ('button' in e && e.button !== 0) || e.ctrlKey;
}

/**
 * Turns a list of strings into a string, boolean map.
 */
export function keyByBoolean(arr: string[] | undefined): Record<string, boolean> {
  if (arr) {
    return arr.reduce((map: Record<string, boolean>, key) => {
      if (!map[key]) {
        map[key] = true;
      }
      return map;
    }, {});
  }
  return {};
}

/**
 * Parses a string into a number. If string cannot be parsed just returns null.
 */
export function parseFloatOrNull(value: string | null): number | null {
  if (value !== null) {
    const valueAsNumber: number = parseFloat(value);
    return Number.isNaN(valueAsNumber) ? null : valueAsNumber;
  }
  return null;
}

export function getSearchParameterNumber(key: SearchParameters, searchParams?: URLSearchParams): number | null {
  let urlSearchParams: URLSearchParams | undefined = searchParams;

  if (!searchParams && window) {
    urlSearchParams = new URLSearchParams(window.location.search);
  }

  if (urlSearchParams) {
    const numberSearchParam = urlSearchParams.get(key);

    return parseFloatOrNull(numberSearchParam);
  }

  return null;
}

/**
 * Converts a string with the substring 'subscription' into 'query'.
 * Use to quickly convert a GraphQL subscription into a query.
 */
export function convertToQuery(gql: string): string {
  return gql.replace('subscription', 'query');
}

/**
 * Removes a query param from the current URL.
 */
export function removeQueryParam(key: SearchParameters, mode: 'PUSH' | 'REPLACE' = 'REPLACE'): void {
  if (!browser) {
    return;
  }

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

  if (mode === 'REPLACE') {
    history.replaceState({ path }, '', path);
  } else {
    history.pushState({ path }, '', path);
  }
}

/**
 * Changes the current URL to include a query parameter given by [key]=[value].
 * @note Only runs in the browser (not server-side).
 */
export function setQueryParam(key: SearchParameters, value: string, mode: 'PUSH' | 'REPLACE' = 'REPLACE'): void {
  const { history, location } = window;
  const { hash, host, pathname, protocol, search } = location;

  const urlSearchParams = new URLSearchParams(search);
  urlSearchParams.set(key, value);
  const params = urlSearchParams.toString();

  const path = `${protocol}//${host}${pathname}?${params}${hash}`;
  if (mode === 'REPLACE') {
    history.replaceState({ path }, '', path);
  } else {
    history.pushState({ path }, '', path);
  }
}

/**
 * Returns a promise that resolves after the given number of milliseconds has passed.
 */
export function sleep(milliseconds = 250): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
}

export class ShouldRetryError extends Error {}

/** Retry a promise n times with delay and exponential backoff */
export async function promiseRetry<T>(
  promise: () => Promise<T>,
  initial_retry_count: number,
  retry_delay: number,
): Promise<T> {
  async function __promiseRetry(promise: () => Promise<T>, remaining_retry_count: number): Promise<T> {
    try {
      const res = await promise();
      return res;
    } catch (e) {
      if (!(e instanceof ShouldRetryError)) {
        throw e;
      }
      if (remaining_retry_count <= 0) {
        console.log('caught', e);

        throw e;
      }

      return new Promise(resolve => {
        setTimeout(() => {
          resolve(__promiseRetry(promise, remaining_retry_count - 1));
        }, retry_delay ** (1 + 0.1 * (initial_retry_count - remaining_retry_count + 1)));
      });
    }
  }

  return __promiseRetry(promise, initial_retry_count);
}

/**
 * Returns an ordinal suffixed string version of a number
 */
export function getNumberWithOrdinal(n: number): string {
  // From https://stackoverflow.com/a/31615643
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Adds event listeners to document and window to track if the page is in focus.
 * Returns a function that when called will remove the listeners.
 *
 * @see https://stackoverflow.com/a/70073076 modified to only support modern browsers
 */
export function addPageFocusListener(onChange: (string: 'out' | 'in') => void): () => void {
  if (!browser) {
    return () => null;
  }
  let visible = true;
  function handleChange(evt: FocusEvent | PageTransitionEvent | Event) {
    if (visible && (['blur', 'focusout', 'pagehide'].includes(evt.type) || (document && document.hidden))) {
      visible = false;
      onChange('out');
    } else if (!visible && (['focus', 'focusin', 'pageshow'].includes(evt.type) || (document && !document.hidden))) {
      visible = true;
      onChange('in');
    }
  }

  // Changing tab with alt+tab
  document.addEventListener('visibilitychange', handleChange);
  window.addEventListener('pageshow', handleChange);
  window.addEventListener('pagehide', handleChange);
  window.addEventListener('focus', handleChange);
  window.addEventListener('blur', handleChange);

  // Initialize state if Page Visibility API is supported
  handleChange({ type: document.hidden ? 'blur' : 'focus' } as FocusEvent);

  return () => {
    window.removeEventListener('pageshow', handleChange);
    window.removeEventListener('pagehide', handleChange);
    window.removeEventListener('focus', handleChange);
    window.removeEventListener('blur', handleChange);
    document.removeEventListener('visibilitychange', handleChange);
  };
}
