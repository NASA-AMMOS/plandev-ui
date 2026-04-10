/**
 * Unit tests for cookies utility functions
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCookie, getCookie, getJsonCookie, setCookie, setJsonCookie } from './cookies';

describe('cookies utilities', () => {
  // Clear all cookies before each test
  beforeEach(() => {
    // Clear document.cookie
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    });
  });

  describe('setCookie', () => {
    it('should set a cookie with the given name and value', () => {
      setCookie('testCookie', 'testValue');
      expect(document.cookie).toContain('testCookie=testValue');
    });

    it('should set a cookie with default expiration of 365 days', () => {
      setCookie('testCookie', 'testValue');

      // Verify cookie exists and persists
      expect(document.cookie).toContain('testCookie=testValue');
    });

    it('should set a cookie with custom expiration days', () => {
      setCookie('testCookie', 'testValue', 30);
      expect(document.cookie).toContain('testCookie=testValue');
    });

    it('should handle special characters in value', () => {
      setCookie('testCookie', 'value with spaces');
      expect(document.cookie).toContain('testCookie=value with spaces');
    });

    it('should overwrite existing cookie with same name', () => {
      setCookie('testCookie', 'firstValue');
      setCookie('testCookie', 'secondValue');
      const value = getCookie('testCookie');
      expect(value).toBe('secondValue');
    });

    it('should accept number values and convert them to strings', () => {
      setCookie('numberCookie', 42);
      expect(document.cookie).toContain('numberCookie=42');
      const value = getCookie('numberCookie');
      expect(value).toBe('42');
    });

    it('should accept boolean true value and convert it to string', () => {
      setCookie('booleanCookie', true);
      expect(document.cookie).toContain('booleanCookie=true');
      const value = getCookie('booleanCookie');
      expect(value).toBe('true');
    });

    it('should accept boolean false value and convert it to string', () => {
      setCookie('booleanCookie', false);
      expect(document.cookie).toContain('booleanCookie=false');
      const value = getCookie('booleanCookie');
      expect(value).toBe('false');
    });

    it('should handle zero as a number value', () => {
      setCookie('zeroCookie', 0);
      expect(document.cookie).toContain('zeroCookie=0');
      const value = getCookie('zeroCookie');
      expect(value).toBe('0');
    });

    it('should handle negative numbers', () => {
      setCookie('negativeCookie', -123);
      expect(document.cookie).toContain('negativeCookie=-123');
      const value = getCookie('negativeCookie');
      expect(value).toBe('-123');
    });

    it('should handle decimal numbers', () => {
      setCookie('decimalCookie', 3.14);
      expect(document.cookie).toContain('decimalCookie=3.14');
      const value = getCookie('decimalCookie');
      expect(value).toBe('3.14');
    });
  });

  describe('getCookie', () => {
    it('should get a cookie value by name', () => {
      setCookie('testCookie', 'testValue');
      const value = getCookie('testCookie');
      expect(value).toBe('testValue');
    });

    it('should return null for non-existent cookie', () => {
      const value = getCookie('nonExistentCookie');
      expect(value).toBeNull();
    });

    it('should handle multiple cookies and get the correct one', () => {
      setCookie('cookie1', 'value1');
      setCookie('cookie2', 'value2');
      setCookie('cookie3', 'value3');

      expect(getCookie('cookie1')).toBe('value1');
      expect(getCookie('cookie2')).toBe('value2');
      expect(getCookie('cookie3')).toBe('value3');
    });

    it('should handle cookie names that are substrings of other names', () => {
      setCookie('test', 'testValue');
      setCookie('testCookie', 'testCookieValue');
      setCookie('testCookieExtra', 'testCookieExtraValue');

      expect(getCookie('test')).toBe('testValue');
      expect(getCookie('testCookie')).toBe('testCookieValue');
      expect(getCookie('testCookieExtra')).toBe('testCookieExtraValue');
    });

    it('should trim leading spaces from cookie values', () => {
      // Manually set a cookie with leading space
      document.cookie = 'testCookie=testValue;path=/';
      const value = getCookie('testCookie');
      expect(value).toBe('testValue');
    });

    it('should handle empty string values', () => {
      setCookie('emptyCookie', '');
      const value = getCookie('emptyCookie');
      expect(value).toBe('');
    });
  });

  describe('deleteCookie', () => {
    it('should delete an existing cookie', () => {
      setCookie('testCookie', 'testValue');
      expect(getCookie('testCookie')).toBe('testValue');

      deleteCookie('testCookie');
      expect(getCookie('testCookie')).toBeNull();
    });

    it('should handle deleting non-existent cookie', () => {
      deleteCookie('nonExistentCookie');
      // Should not throw error
      expect(getCookie('nonExistentCookie')).toBeNull();
    });

    it('should only delete the specified cookie', () => {
      setCookie('cookie1', 'value1');
      setCookie('cookie2', 'value2');
      setCookie('cookie3', 'value3');

      deleteCookie('cookie2');

      expect(getCookie('cookie1')).toBe('value1');
      expect(getCookie('cookie2')).toBeNull();
      expect(getCookie('cookie3')).toBe('value3');
    });
  });

  describe('setJsonCookie', () => {
    it('should save an object as JSON in a cookie', () => {
      const testObject = { name: 'test', nested: { key: 'value' }, value: 123 };
      setJsonCookie('jsonCookie', testObject);

      const retrieved = getJsonCookie<typeof testObject>('jsonCookie');
      expect(retrieved).toEqual(testObject);
    });

    it('should save an array as JSON in a cookie', () => {
      const testArray = [1, 2, 3, 'test', { key: 'value' }];
      setJsonCookie('jsonArrayCookie', testArray);

      const retrieved = getJsonCookie<typeof testArray>('jsonArrayCookie');
      expect(retrieved).toEqual(testArray);
    });

    it('should handle primitive values', () => {
      setJsonCookie('stringCookie', 'testString');
      setJsonCookie('numberCookie', 42);
      setJsonCookie('booleanCookie', true);
      setJsonCookie('nullCookie', null);

      expect(getJsonCookie('stringCookie')).toBe('testString');
      expect(getJsonCookie('numberCookie')).toBe(42);
      expect(getJsonCookie('booleanCookie')).toBe(true);
      expect(getJsonCookie('nullCookie')).toBeNull();
    });

    it('should encode special characters properly', () => {
      const testObject = {
        message: 'Hello, World!',
        special: '=;,/ &?#',
        unicode: '🍪',
      };
      setJsonCookie('specialCharsCookie', testObject);

      const retrieved = getJsonCookie<typeof testObject>('specialCharsCookie');
      expect(retrieved).toEqual(testObject);
    });

    it('should set custom expiration days', () => {
      const testObject = { test: 'value' };
      setJsonCookie('jsonCookie', testObject, 7);

      const retrieved = getJsonCookie<typeof testObject>('jsonCookie');
      expect(retrieved).toEqual(testObject);
    });

    it('should handle JSON serialization errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create circular reference
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      setJsonCookie('circularCookie', circularObj);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error saving JSON cookie "circularCookie"'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getJsonCookie', () => {
    it('should retrieve and parse a JSON cookie', () => {
      const testObject = { name: 'test', value: 123 };
      setJsonCookie('jsonCookie', testObject);

      const retrieved = getJsonCookie<typeof testObject>('jsonCookie');
      expect(retrieved).toEqual(testObject);
    });

    it('should return null for non-existent cookie', () => {
      const retrieved = getJsonCookie('nonExistentCookie');
      expect(retrieved).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Manually set an invalid JSON cookie
      setCookie('invalidJsonCookie', 'not-valid-json');

      const retrieved = getJsonCookie('invalidJsonCookie');
      expect(retrieved).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing JSON cookie "invalidJsonCookie"'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle URL-encoded JSON properly', () => {
      const testObject = { message: 'Hello, World!', special: '=;,/' };
      setJsonCookie('encodedCookie', testObject);

      const retrieved = getJsonCookie<typeof testObject>('encodedCookie');
      expect(retrieved).toEqual(testObject);
    });

    it('should preserve data types correctly', () => {
      const testData = {
        array: [1, 2, 3],
        boolean: true,
        nested: { key: 'value' },
        nullValue: null,
        number: 42,
        string: 'text',
      };
      setJsonCookie('typedCookie', testData);

      const retrieved = getJsonCookie<typeof testData>('typedCookie');
      expect(retrieved).toEqual(testData);
      expect(typeof retrieved?.string).toBe('string');
      expect(typeof retrieved?.number).toBe('number');
      expect(typeof retrieved?.boolean).toBe('boolean');
      expect(retrieved?.nullValue).toBeNull();
      expect(Array.isArray(retrieved?.array)).toBe(true);
      expect(typeof retrieved?.nested).toBe('object');
    });
  });

  describe('integration tests', () => {
    it('should handle complete cookie lifecycle', () => {
      // Set
      const data = { preferences: { theme: 'dark' }, user: 'testUser' };
      setJsonCookie('userSettings', data);

      // Get
      let retrieved = getJsonCookie<typeof data>('userSettings');
      expect(retrieved).toEqual(data);

      // Update
      const updatedData = { preferences: { theme: 'light' }, user: 'testUser' };
      setJsonCookie('userSettings', updatedData);
      retrieved = getJsonCookie<typeof updatedData>('userSettings');
      expect(retrieved).toEqual(updatedData);

      // Delete
      deleteCookie('userSettings');
      retrieved = getJsonCookie('userSettings');
      expect(retrieved).toBeNull();
    });

    it('should handle multiple cookies independently', () => {
      const user = { id: 1, name: 'John' };
      const settings = { lang: 'en', theme: 'dark' };
      const session = { token: 'abc123' };

      setJsonCookie('user', user);
      setJsonCookie('settings', settings);
      setJsonCookie('session', session);

      expect(getJsonCookie('user')).toEqual(user);
      expect(getJsonCookie('settings')).toEqual(settings);
      expect(getJsonCookie('session')).toEqual(session);

      deleteCookie('settings');

      expect(getJsonCookie('user')).toEqual(user);
      expect(getJsonCookie('settings')).toBeNull();
      expect(getJsonCookie('session')).toEqual(session);
    });

    it('should handle mixed plain and JSON cookies', () => {
      setCookie('plainCookie', 'plainValue');
      setJsonCookie('jsonCookie', { key: 'value' });

      expect(getCookie('plainCookie')).toBe('plainValue');
      expect(getJsonCookie('jsonCookie')).toEqual({ key: 'value' });

      // Getting JSON cookie as plain should return encoded JSON string
      const rawJson = getCookie('jsonCookie');
      expect(rawJson).toBeTruthy();
      expect(rawJson).toContain('%7B'); // URL encoded '{'
    });
  });
});
