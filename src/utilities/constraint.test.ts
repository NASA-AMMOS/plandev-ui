import { describe, expect, test } from 'vitest';
import { Status } from '../enums/status';
import { getConstraintStatus } from './constraint';

const constraintStatusReadableStatusMap = {
  [Status.Complete]: Status.Complete,
  [Status.Failed]: Status.Failed,
  [Status.Canceled]: Status.Canceled,
  [Status.PartialSuccess]: 'Partially Checked',
  [Status.Incomplete]: 'In Progress',
  [Status.Pending]: 'Queued',
};

describe.each([
  ...Object.entries(constraintStatusReadableStatusMap).map(([status, readable]) => ({ readable, status })),
  { readable: 'Unknown', status: 'Random status' },
])('getConstraintStatus', ({ readable, status }) => {
  test(`Should get the readable status ${readable} for the constraint status ${status}`, () => {
    expect(getConstraintStatus(status as Status)).toEqual(readable);
  });
});
