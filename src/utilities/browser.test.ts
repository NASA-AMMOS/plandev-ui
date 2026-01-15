import { afterAll, describe, expect, test, vi } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

import { isMacOs } from './browser';

const mockNavigator = {
  platform: 'MacIntel',
};

vi.stubGlobal('navigator', mockNavigator);

describe('Browser utility function tests', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('isMacOs', () => {
    test('Should return true for Mac browsers', () => {
      expect(isMacOs()).toEqual(true);

      mockNavigator.platform = 'MacPPC';
      expect(isMacOs()).toEqual(true);

      mockNavigator.platform = 'Mac68K';
      expect(isMacOs()).toEqual(true);
    });

    test('Should return false for Windows browsers', () => {
      mockNavigator.platform = 'Win32';
      expect(isMacOs()).toEqual(false);

      mockNavigator.platform = 'Windows';
      expect(isMacOs()).toEqual(false);
    });

    test('Should return false for Linux browsers', () => {
      mockNavigator.platform = 'Linux i686';
      expect(isMacOs()).toEqual(false);

      mockNavigator.platform = 'Linux x86_64';
      expect(isMacOs()).toEqual(false);
    });
  });
});
