import { describe, expect, test } from 'vitest';
import { convertToGQLArray } from './gql';

convertToGQLArray;

describe('convertToGQLArray', () => {
  test('Should convert string array to GQL array', () => {
    expect(convertToGQLArray(['1', '2', '3'])).to.eq('{1,2,3}');
  });
  test('Should convert number array to GQL array', () => {
    expect(convertToGQLArray([1, 2, 3])).to.eq('{1,2,3}');
  });
});
