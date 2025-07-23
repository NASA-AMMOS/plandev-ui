import { browser } from '$app/environment';
import type { SearchParameters } from '../enums/searchParameters';
import { parseFloatOrNull } from './generic';

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
export function setQueryParam(
  key: SearchParameters,
  value?: string | null,
  mode: 'PUSH' | 'REPLACE' = 'REPLACE',
): void {
  const { history, location } = window;
  const { hash, host, pathname, protocol, search } = location;

  const urlSearchParams = new URLSearchParams(search);
  if (value !== '' && value != null) {
    urlSearchParams.set(key, value);
  } else {
    urlSearchParams.delete(key);
  }
  const params = urlSearchParams.toString();

  const path = `${protocol}//${host}${pathname}?${params}${hash}`;
  if (mode === 'REPLACE') {
    history.replaceState({ path }, '', path);
  } else {
    history.pushState({ path }, '', path);
  }
}
