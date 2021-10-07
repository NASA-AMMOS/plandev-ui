import type { StringTMap } from '../types';

/**
 * Comparator function for numbers or strings.
 * Defaults to ascending order.
 */
export function compare(
  a: number | string,
  b: number | string,
  isAsc = true,
): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Converts a list to a map keyed by 'id' (or alternate key).
 */
export function keyBy<T>(list: T[], key = 'id'): StringTMap<T> {
  return list.reduce((map: StringTMap<T>, value: T) => {
    map[value[key]] = value;
    return map;
  }, {});
}

/**
 * Parses a File object into JSON. If the parse fails we reject with an error.
 */
export function parseJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const json = JSON.parse(fileReader.result as string);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    fileReader.onerror = error => reject(error);
    fileReader.readAsText(file);
  });
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

/**
 * Accepts a parent <div /> that contains one child <slot /> and returns the count
 * of the number of children in the <slot />.
 */
export function slotChildCount(div: HTMLDivElement | undefined): number {
  if (div) {
    const [slotDiv] = Array.from(div.childNodes);

    if (slotDiv) {
      const childNodes = Array.from(slotDiv.childNodes);
      const { length } = childNodes.filter(
        ({ nodeName }) => nodeName !== '#comment' && nodeName !== '#text',
      );

      return length;
    }
  }

  return 0;
}
