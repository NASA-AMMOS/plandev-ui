import { describe, expect, test } from 'vitest';
import { min } from './validators';

describe('min', async () => {
  const value = 5;
  const error = `Field cannot be less than ${value}`;

  test('should return an error message if input is less than the min value', async () => {
    const minValidator = min(value, error);
    const invalidMsg = await minValidator(3);
    expect(invalidMsg).toEqual(error);
  });

  test('should return null if input is greater than than the min value', async () => {
    const minValidator = min(value, error);
    const invalidMsg = await minValidator(6);
    expect(invalidMsg).toEqual(null);
  });
});
