/**
 * Utility functions for working with browser cookies
 */

/**
 * Set a cookie with the given name, value, and optional days to expire
 */
export function setCookie(name: string, value: string | number | boolean, days: number = 365): void {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Save an object as JSON in a cookie
 */
export function setJsonCookie<T>(name: string, value: T, days: number = 365): void {
  try {
    const jsonString = JSON.stringify(value);
    setCookie(name, encodeURIComponent(jsonString), days);
  } catch (error) {
    console.error(`Error saving JSON cookie "${name}":`, error);
  }
}

/**
 * Get and parse a JSON cookie
 */
export function getJsonCookie<T>(name: string): T | null {
  try {
    const value = getCookie(name);
    if (value === null) {
      return null;
    }
    const decoded = decodeURIComponent(value);
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.error(`Error parsing JSON cookie "${name}":`, error);
    return null;
  }
}
