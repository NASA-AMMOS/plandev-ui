import { describe, expect, test } from 'vitest';
import {
  ErrorTypes,
  generateActivityValidationErrorRollups,
  isInstantiationError,
  isUnknownTypeError,
  isValidationNoticesError,
} from './errors';

describe('Errors Util', () => {
  test('isInstantiationError - Should correctly determine if the error is an instantiation error', () => {
    expect(
      isInstantiationError({
        errors: {
          extraneousArguments: [],
          missingArguments: [],
          unconstructableArguments: [],
        },
        success: false,
        type: ErrorTypes.INSTANTIATION_ERRORS,
      }),
    ).toEqual(true);

    expect(
      isInstantiationError({
        errors: {
          noSuchActivityError: {
            activity_type: 'foobar',
            message: '',
          },
        },
        success: false,
        type: ErrorTypes.NO_SUCH_ACTIVITY_TYPE,
      }),
    ).toEqual(false);
  });

  test('isUnknownTypeError - Should correctly determine if the error is an instantiation error', () => {
    expect(
      isUnknownTypeError({
        errors: {
          noSuchActivityError: {
            activity_type: 'foobar',
            message: '',
          },
        },
        success: false,
        type: ErrorTypes.NO_SUCH_ACTIVITY_TYPE,
      }),
    ).toEqual(true);

    expect(
      isUnknownTypeError({
        errors: {
          extraneousArguments: [],
          missingArguments: [],
          unconstructableArguments: [],
        },
        success: false,
        type: ErrorTypes.INSTANTIATION_ERRORS,
      }),
    ).toEqual(false);
  });

  test('isValidationNoticesError - Should correctly determine if the error is a validation error', () => {
    expect(
      isValidationNoticesError({
        errors: {
          validationNotices: [
            {
              message: '',
              subjects: ['fuu', 'bur'],
            },
          ],
        },
        success: false,
        type: ErrorTypes.VALIDATION_NOTICES,
      }),
    ).toEqual(true);

    expect(
      isValidationNoticesError({
        errors: {
          extraneousArguments: [],
          missingArguments: [],
          unconstructableArguments: [],
        },
        success: false,
        type: ErrorTypes.INSTANTIATION_ERRORS,
      }),
    ).toEqual(false);
  });

  test('generateActivityValidationErrorRollups - Should generate an accurate count of the types of errors per activity', () => {
    expect(
      generateActivityValidationErrorRollups([
        {
          activityId: 1,
          errors: [
            {
              errors: {
                noSuchActivityError: {
                  activity_type: 'foobar',
                  message: 'wat',
                },
              },
              success: false,
              type: ErrorTypes.NO_SUCH_ACTIVITY_TYPE,
            },
            {
              errors: {
                extraneousArguments: ['foo', 'bar', 'bur'],
                missingArguments: ['baz'],
                unconstructableArguments: [
                  {
                    failure: '',
                    name: 'buzz',
                  },
                  {
                    failure: '',
                    name: 'foo',
                  },
                ],
              },
              success: false,
              type: ErrorTypes.INSTANTIATION_ERRORS,
            },
            {
              errors: {
                noSuchActivityError: {
                  activity_type: 'foobar',
                  message: '',
                },
              },
              success: false,
              type: ErrorTypes.NO_SUCH_ACTIVITY_TYPE,
            },
            {
              errors: {
                validationNotices: [
                  {
                    message: '',
                    subjects: ['foo', 'fuu', 'bur'],
                  },
                ],
              },
              success: false,
              type: ErrorTypes.VALIDATION_NOTICES,
            },
            {
              activityId: 5,
              message: 'end-time anchor out of bounds',
              timestamp: '',
              type: ErrorTypes.ANCHOR_VALIDATION_ERROR,
            },
            {
              activityId: 4,
              message: 'anchor comes before plan start',
              timestamp: '',
              type: ErrorTypes.ANCHOR_VALIDATION_ERROR,
            },
          ],
          status: 'complete',
          type: 'banana',
        },
        {
          activityId: 2,
          errors: [],
          status: 'pending',
          type: 'banana',
        },
      ]),
    ).toEqual([
      {
        errorCounts: {
          extra: 3,
          invalidAnchor: 1,
          invalidParameter: 4,
          missing: 1,
          outOfBounds: 2,
          pending: 0,
          wrongType: 1,
        },
        id: 1,
        location: ['foo', 'bar', 'bur', 'baz', 'buzz', 'fuu'],
        type: 'banana',
      },
      {
        errorCounts: {
          extra: 0,
          invalidAnchor: 0,
          invalidParameter: 0,
          missing: 0,
          outOfBounds: 0,
          pending: 1,
          wrongType: 0,
        },
        id: 2,
        location: [],
        type: 'banana',
      },
    ]);
  });
});
