import { describe, expect, test } from 'vitest';
import { min, required, timestamp, validateEndTime, validateStartTime } from './validators';

describe('min', () => {
  const value = 5;
  const error = `Field cannot be less than ${value}`;

  test('Should return an error message if input is less than the min value', async () => {
    const minValidator = min(value, error);
    const invalidMsg = await minValidator(3);
    expect(invalidMsg).toEqual(error);
  });

  test('Should return null if input is greater than than the min value', async () => {
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

  test('Should return an error message if input is not in DOY format', async () => {
    const invalidMsg = await timestamp('2020-001');
    expect(invalidMsg).toEqual(doyError);
  });

  test('Should return an error message if input is out of DOY range not during leap year', async () => {
    const invalidMsg = await timestamp('2019-400T00:00:00.000');
    expect(invalidMsg).toEqual('Day-of-year must be between 0 and 365');
  });

  test('Should return an error message if input is out of DOY range during leap year', async () => {
    const invalidMsg = await timestamp('2020-400T00:00:00.000');
    expect(invalidMsg).toEqual('Day-of-year must be between 0 and 366');
  });

  test('Should not return an error message if input day is 366 during a leap year', async () => {
    const invalidMsg = await timestamp('2024-366T00:00:00.000');
    expect(invalidMsg).toEqual(null);
  });

  test('Should return null if input is a valid DOY string', async () => {
    const invalidMsg = await timestamp('2020-001T00:00:00.000');
    expect(invalidMsg).toEqual(null);
  });
});

describe('validateStartTime', () => {
  const startTimeError = 'Simulation start must be before end';

  test.each([
    { endTime: new Date('01-01-2030').getTime(), startTime: new Date('01-01-2030').getTime() },
    { endTime: new Date('01-01-2029').getTime(), startTime: new Date('01-01-2030').getTime() },
  ])(
    'Should return an error message for out of order start/end ($startTime/$endTime) times',
    async ({ endTime, startTime }) => {
      expect(await validateStartTime(startTime, endTime, 'Simulation')).toEqual(startTimeError);
    },
  );

  test.each([
    { endTime: new Date('01-02-2030').getTime(), startTime: new Date('01-01-2030').getTime() },
    { endTime: new Date('01-01-2031').getTime(), startTime: new Date('01-01-2030').getTime() },
  ])(
    'Should not return an error for out of order start/end ($startTime/$endTime) times',
    async ({ endTime, startTime }) => {
      expect(await validateStartTime(startTime, endTime, 'Simulation')).toEqual(null);
    },
  );
});

describe('validateEndTime', () => {
  const endTimeError = 'Simulation end must be after start';

  test.each([
    { endTime: new Date('01-01-2030').getTime(), startTime: new Date('01-01-2030').getTime() },
    { endTime: new Date('01-01-2029').getTime(), startTime: new Date('01-01-2030').getTime() },
  ])(
    'Should return an error message for out of order start/end ($startTime/$endTime) times',
    async ({ endTime, startTime }) => {
      expect(await validateEndTime(startTime, endTime, 'Simulation')).toEqual(endTimeError);
    },
  );

  test.each([
    { endTime: new Date('01-02-2030').getTime(), startTime: new Date('01-01-2030').getTime() },
    { endTime: new Date('01-01-2031').getTime(), startTime: new Date('01-01-2030').getTime() },
  ])(
    'Should not return an error for out of order start/end ($startTime/$endTime) times',
    async ({ endTime, startTime }) => {
      expect(await validateEndTime(startTime, endTime, 'Simulation')).toEqual(null);
    },
  );
});
