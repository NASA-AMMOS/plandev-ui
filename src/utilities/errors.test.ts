import { describe, expect, test, vi } from 'vitest';
import type { AnchorValidationError, ConsoleEntry, LogMessage } from '../types/console';
import {
  ErrorTypes,
  composeErrorMessage,
  extractBackendMessage,
  generateActivityValidationErrorRollups,
  getActivityIdsFromError,
  isInstantiationError,
  isUnknownTypeError,
  isValidationNoticesError,
} from './errors';
import { CompoundError } from './requests';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('./login', () => ({ logout: vi.fn() }));

function makeLogMessage(overrides: Partial<LogMessage> = {}): LogMessage {
  return {
    level: 'error',
    message: '',
    timestamp: '2026-05-22T00:00:00Z',
    type: ErrorTypes.CAUGHT_ERROR,
    ...overrides,
  };
}

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
              data: {
                activityId: 5,
              },
              message: 'end-time anchor out of bounds',
              timestamp: '',
              type: ErrorTypes.ANCHOR_VALIDATION_ERROR,
            },
            {
              data: { activityId: 4 },
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

  test('getActivityIdsFromError - Should return no IDs when given unsupported error', () => {
    expect(
      getActivityIdsFromError({
        message: '',
        timestamp: '',
        type: ErrorTypes.IO_EXCEPTION,
      }),
    ).deep.eq([]);
  });

  test('getActivityIdsFromError - Should return specified ID for ANCHOR_VALIDATION_ERROR', () => {
    expect(
      getActivityIdsFromError({
        data: {
          activityId: 1,
        },
        type: ErrorTypes.ANCHOR_VALIDATION_ERROR,
      } as AnchorValidationError),
    ).deep.eq([1]);
  });

  test('getActivityIdsFromError - Should return specified ID for GLOBAL_SCHEDULING_CONDITIONS_FAILED and SCHEDULING_GOALS_FAILED and UNEXPECTED_SIMULATION_EXCEPTION', () => {
    expect(
      getActivityIdsFromError({
        data: { errors: { '1': 'foo', '2': 'bat', bar: 'bob' }, success: false },
        message: '',
        timestamp: '',
        type: ErrorTypes.GLOBAL_SCHEDULING_CONDITIONS_FAILED,
      } as ConsoleEntry),
    ).deep.eq([1, 2]);
  });
});

describe('extractBackendMessage', () => {
  test('returns null for non-Error inputs', () => {
    expect(extractBackendMessage(undefined)).toBeNull();
    expect(extractBackendMessage(null)).toBeNull();
    expect(extractBackendMessage('a string')).toBeNull();
    expect(extractBackendMessage({ message: 'not an Error' })).toBeNull();
  });

  test('returns null for plain Error (no CompoundError)', () => {
    expect(extractBackendMessage(new Error('plain error'))).toBeNull();
  });

  test('returns the inner backend message for a single-error CompoundError without a cause', () => {
    const ce = new CompoundError('Could not find workspace 42.', [
      makeLogMessage({ message: 'Could not find workspace 42.', type: ErrorTypes.NO_SUCH_WORKSPACE }),
    ]);
    expect(extractBackendMessage(ce)).toBe('Could not find workspace 42.');
  });

  test("prefers the inner cause over message when both are present (backend's actionable root cause)", () => {
    const ce = new CompoundError("Unable to move 'foo (1)' to './foo'.", [
      makeLogMessage({
        cause: './foo already exists.',
        message: "Unable to move 'foo (1)' to './foo'.",
      }),
    ]);
    expect(extractBackendMessage(ce)).toBe('./foo already exists.');
  });

  test('falls back to message when cause is empty/whitespace', () => {
    const ce = new CompoundError('Could not find workspace 42.', [
      makeLogMessage({ cause: '', message: 'Could not find workspace 42.' }),
    ]);
    expect(extractBackendMessage(ce)).toBe('Could not find workspace 42.');
  });

  test('returns null when the single inner message is empty (path-1 HTTP not-OK)', () => {
    // reqHasura's HTTP-not-OK path constructs: new CompoundError(statusText, [{ ...defaultError }])
    // where defaultError.message = ''. The outer is the statusText ('Internal Server Error') —
    // not user-friendly, so we fall through to the caller's static label.
    const ce = new CompoundError('Internal Server Error', [makeLogMessage({ message: '' })]);
    expect(extractBackendMessage(ce)).toBeNull();
  });

  test('returns null when the single inner message is whitespace', () => {
    const ce = new CompoundError('Internal Server Error', [makeLogMessage({ message: '   ' })]);
    expect(extractBackendMessage(ce)).toBeNull();
  });

  test('returns the outer summary for a multi-error CompoundError', () => {
    const ce = new CompoundError('Some files failed to move', [
      makeLogMessage({ message: 'file A failed' }),
      makeLogMessage({ message: 'file B failed' }),
    ]);
    expect(extractBackendMessage(ce)).toBe('Some files failed to move');
  });

  test("returns null for the generic 'Multiple errors occurred' outer", () => {
    const ce = new CompoundError('Multiple errors occurred', [
      makeLogMessage({ message: 'err A' }),
      makeLogMessage({ message: 'err B' }),
    ]);
    expect(extractBackendMessage(ce)).toBeNull();
  });

  test('returns the raw backend message untruncated (presentation concerns live in callers)', () => {
    const long = 'x'.repeat(300);
    const ce = new CompoundError(long, [makeLogMessage({ message: long })]);
    expect(extractBackendMessage(ce)).toBe(long);
  });
});

describe('composeErrorMessage', () => {
  test('returns just the label when no error is provided', () => {
    expect(composeErrorMessage('Workspace Save Failed', undefined)).toBe('Workspace Save Failed');
  });

  test('returns just the label for a plain Error (no backend message extractable)', () => {
    expect(composeErrorMessage('Workspace Save Failed', new Error('boom'))).toBe('Workspace Save Failed');
  });

  test("prefixes the label with ': <backend>' when a single-error CompoundError carries a substantive message", () => {
    const ce = new CompoundError('Could not find workspace 42.', [
      makeLogMessage({ message: 'Could not find workspace 42.' }),
    ]);
    expect(composeErrorMessage('Workspace Retrieval Failed', ce)).toBe(
      'Workspace Retrieval Failed: Could not find workspace 42.',
    );
  });

  test('uses the cause over the message when both are present', () => {
    const ce = new CompoundError("Unable to move 'foo (1)' to './foo'.", [
      makeLogMessage({ cause: './foo already exists.', message: "Unable to move 'foo (1)' to './foo'." }),
    ]);
    expect(composeErrorMessage('Workspace File Rename Failed', ce)).toBe(
      'Workspace File Rename Failed: ./foo already exists.',
    );
  });

  test('returns just the label for a path-1 (empty-inner) CompoundError', () => {
    const ce = new CompoundError('Internal Server Error', [makeLogMessage({ message: '' })]);
    expect(composeErrorMessage('Workspace Save Failed', ce)).toBe('Workspace Save Failed');
  });
});
