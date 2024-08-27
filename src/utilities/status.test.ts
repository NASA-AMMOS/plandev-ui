import { describe, expect, test } from 'vitest';
import { Status } from '../enums/status';
import { getColorForStatus, getHumanReadableStatus, statusColors } from './status';

const statusColorMap = {
  [Status.Complete]: statusColors.green,
  [Status.Failed]: statusColors.red,
  [Status.Canceled]: statusColors.red,
  [Status.Incomplete]: statusColors.blue,
  [Status.Unchecked]: statusColors.yellow,
  [Status.Modified]: statusColors.yellow,
  [Status.Pending]: statusColors.gray,
  [Status.PartialSuccess]: statusColors.orange,
};
const statusReadableStatusMap = {
  [Status.Complete]: Status.Complete,
  [Status.Failed]: Status.Failed,
  [Status.Canceled]: Status.Canceled,
  [Status.PartialSuccess]: 'Partially Succeeded',
  [Status.Incomplete]: 'In Progress',
  [Status.Pending]: 'Queued',
};

describe.each([
  ...Object.entries(statusColorMap).map(([status, color]) => ({ color, status })),
  { color: statusColors.gray, status: 'Random' },
])('getColorForStatus', ({ status, color }) => {
  test(`Should get the color ${color} for the status ${status}`, () => {
    expect(getColorForStatus(status as Status)).toEqual(color);
  });
});

describe.each([
  ...Object.entries(statusReadableStatusMap).map(([status, readable]) => ({ readable, status })),
  { readable: 'Unknown', status: 'Random status' },
])('getHumanReadableStatus', ({ readable, status }) => {
  test(`Should get the readable status ${readable} for the status ${status}`, () => {
    expect(getHumanReadableStatus(status as Status)).toEqual(readable);
  });
});
