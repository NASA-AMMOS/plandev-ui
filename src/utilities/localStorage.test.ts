import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from './localStorage';

describe('localStorage utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('setLocalStorageItem / getLocalStorageItem', () => {
    test('Should round-trip a string value', () => {
      setLocalStorageItem('key', 'hello');
      expect(getLocalStorageItem<string>('key')).toEqual('hello');
    });

    test('Should round-trip a number value', () => {
      setLocalStorageItem('key', 42);
      expect(getLocalStorageItem<number>('key')).toEqual(42);
    });

    test('Should round-trip a boolean value', () => {
      setLocalStorageItem('key', true);
      expect(getLocalStorageItem<boolean>('key')).toEqual(true);
    });

    test('Should round-trip an object value', () => {
      const value = { hide: false, name: 'col-1', width: 120 };
      setLocalStorageItem('key', value);
      expect(getLocalStorageItem<typeof value>('key')).toEqual(value);
    });

    test('Should round-trip an array value', () => {
      const value = [{ id: 1 }, { id: 2 }];
      setLocalStorageItem('key', value);
      expect(getLocalStorageItem<typeof value>('key')).toEqual(value);
    });

    test('Should round-trip null', () => {
      setLocalStorageItem('key', null);
      expect(getLocalStorageItem('key')).toBeNull();
    });

    test('Should JSON-stringify the value when writing', () => {
      setLocalStorageItem('key', { a: 1 });
      expect(localStorage.getItem('key')).toEqual('{"a":1}');
    });

    test('Should overwrite an existing value', () => {
      setLocalStorageItem('key', 'first');
      setLocalStorageItem('key', 'second');
      expect(getLocalStorageItem<string>('key')).toEqual('second');
    });
  });

  describe('getLocalStorageItem', () => {
    test('Should return null for a missing key', () => {
      expect(getLocalStorageItem('does-not-exist')).toBeNull();
    });

    test('Should return null and log when stored value is invalid JSON', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('key', '{not json');

      expect(getLocalStorageItem('key')).toBeNull();
      expect(errorSpy).toHaveBeenCalledOnce();
    });
  });

  describe('removeLocalStorageItem', () => {
    test('Should remove a previously set key', () => {
      setLocalStorageItem('key', 'value');
      removeLocalStorageItem('key');
      expect(localStorage.getItem('key')).toBeNull();
    });

    test('Should be a no-op for a key that does not exist', () => {
      expect(() => removeLocalStorageItem('does-not-exist')).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('Should swallow setItem errors (e.g. quota exceeded) and log', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      expect(() => setLocalStorageItem('key', 'value')).not.toThrow();
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    test('Should swallow removeItem errors and log', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => removeLocalStorageItem('key')).not.toThrow();
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    test('Should swallow getItem errors and return null', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(getLocalStorageItem('key')).toBeNull();
      expect(errorSpy).toHaveBeenCalledOnce();
    });
  });

  describe('SSR / unavailable localStorage', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', undefined);
    });

    test('getLocalStorageItem returns null', () => {
      expect(getLocalStorageItem('key')).toBeNull();
    });

    test('setLocalStorageItem is a silent no-op', () => {
      expect(() => setLocalStorageItem('key', 'value')).not.toThrow();
    });

    test('removeLocalStorageItem is a silent no-op', () => {
      expect(() => removeLocalStorageItem('key')).not.toThrow();
    });
  });
});
