import { describe, expect, test } from 'vitest';
import { min, required, timestamp } from './validators';

describe('min', () => {
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

describe('required', () => {
  const error = 'Field is required';

  test('Should return an error message if input is NaN', async () => {
    const invalidMsg = await required(NaN);
    expect(invalidMsg).toEqual(error);
  });

  test('Should return an error message if input is the empty string', async () => {
    const invalidMsg = await required('');
    expect(invalidMsg).toEqual(error);
  });

  test('Should return null if input is a non-empty string', async () => {
    const invalidMsg = await required('hello');
    expect(invalidMsg).toEqual(null);
  });

  test('Should return null if input is a number', async () => {
    const invalidMsg = await required(42);
    expect(invalidMsg).toEqual(null);
  });
});

describe('timestamp', () => {
  const doyError = 'DOY format required: YYYY-DDDThh:mm:ss';
  const rangeError = 'Day-of-year must be between 0 and 365';

  test('Should return an error message if input not in DOY format', async () => {
    const invalidMsg = await timestamp('2020-001');
    expect(invalidMsg).toEqual(doyError);
  });

  test('Should return an error message if input is out of DOY range', async () => {
    const invalidMsg = await timestamp('2020-400T00:00:00.000');
    expect(invalidMsg).toEqual(rangeError);
  });

  test('Should return null if input is input is a valid DOY string', async () => {
    const invalidMsg = await timestamp('2020-001T00:00:00.000');
    expect(invalidMsg).toEqual(null);
  });
});
