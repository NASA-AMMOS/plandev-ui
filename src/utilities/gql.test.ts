import { describe, expect, test } from 'vitest';
import gql, { convertToGQLArray } from './gql';

/**
 * Every query that fills a `ModelSlim` must select the fields `modelCapabilities` reads.
 *
 * TypeScript cannot check this: the queries are strings, and `ModelSlim` is a claim about what
 * they return rather than a consequence of it. `SUB_MODELS` -- which is what actually backs the
 * `models` store -- selected neither field, so every external model looked like it declared no
 * capabilities. Foreign plan import was refused for all of them, and the message blamed the
 * backend for a capability it had in fact declared.
 */
describe('model queries carry the capability fields', () => {
  test.each([
    ['SUB_MODELS', gql.SUB_MODELS],
    ['GET_PLANS_AND_MODELS', gql.GET_PLANS_AND_MODELS],
  ])('%s selects model_type and external_capabilities', (_name, query) => {
    expect(query).toContain('model_type');
    expect(query).toContain('external_capabilities');
  });
});

describe('convertToGQLArray', () => {
  test('Should convert string array to GQL array', () => {
    expect(convertToGQLArray(['1', '2', '3'])).to.eq('{1,2,3}');
  });
  test('Should convert number array to GQL array', () => {
    expect(convertToGQLArray([1, 2, 3])).to.eq('{1,2,3}');
  });
});
