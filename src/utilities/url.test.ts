import { afterAll, describe, expect, test, vi } from 'vitest';
import { SearchParameters } from '../enums/searchParameters';
import { getSearchParameterNumber } from './url';

const mockNavigator = {
  platform: 'MacIntel',
};

vi.stubGlobal('navigator', mockNavigator);

describe('URL utility function tests', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getSearchParameterNumber', () => {
    test.each(
      Object.keys(SearchParameters).map(key => ({
        key,
        parameter: SearchParameters[key as keyof typeof SearchParameters],
      })),
    )('Should correctly parse out the $key specified in the URL search query parameter', ({ parameter }) => {
      const random = Math.random();
      expect(
        getSearchParameterNumber(parameter as SearchParameters, new URLSearchParams(`?${parameter}=${random}`)),
      ).toBe(random);
    });

    test.each(
      Object.keys(SearchParameters).map(key => ({
        key,
        parameter: SearchParameters[key as keyof typeof SearchParameters],
      })),
    )('Should ignore non number values for the $key specified in the URL search query parameter', ({ parameter }) => {
      expect(getSearchParameterNumber(parameter as SearchParameters, new URLSearchParams(`?${parameter}=foo`))).toBe(
        null,
      );
    });
  });
});
