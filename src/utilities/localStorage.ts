/**
 * Utility functions for working with browser localStorage.
 * All functions silently no-op (or return null) on SSR / when localStorage is unavailable.
 */

function isAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getLocalStorageItem<T>(key: string): T | null {
  if (!isAvailable()) {
    return null;
  }
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return null;
  }
}

export function setLocalStorageItem<T>(key: string, value: T): void {
  if (!isAvailable()) {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing localStorage key "${key}":`, error);
  }
}

export function removeLocalStorageItem(key: string): void {
  if (!isAvailable()) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
  }
}
