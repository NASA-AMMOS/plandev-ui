import { describe, expect, test } from 'vitest';
import { decomposeActivityDirectiveId, getActivityDirectiveUniqueId } from './activities';

describe('getActivityDirectiveUniqueId', () => {
  test('Should create a valid activity directive ID', () => {
    expect(getActivityDirectiveUniqueId(0, 20)).toEqual('directive_0_20');
    expect(getActivityDirectiveUniqueId(33, 5)).toEqual('directive_33_5');
  });

  test('Should throw an error for invalid parameters', () => {
    expect(() => getActivityDirectiveUniqueId(null, 20)).toThrow('Empty plan ID provided');
    expect(() => getActivityDirectiveUniqueId(30, null)).toThrow('Empty activity ID provided');
  });
});

describe('decomposeActivityDirectiveId', () => {
  test('Should correctly deconstruct the activity directive ID into plan and activity IDs', () => {
    expect(decomposeActivityDirectiveId('directive_0_2234')).toEqual({
      activityId: 2234,
      planId: 0,
    });

    expect(decomposeActivityDirectiveId('directive_3232_553')).toEqual({
      activityId: 553,
      planId: 3232,
    });
  });

  test('Should throw an error for incorrectly formatted activity directive IDs', () => {
    expect(() => decomposeActivityDirectiveId('active_3232_553')).toThrow(
      'Invalid Activity Directive ID (active_3232_553) provided',
    );
  });
});
