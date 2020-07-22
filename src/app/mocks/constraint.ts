import { Violation } from '../types';

export const violations: Violation[] = [
  {
    associations: {
      activityInstanceIds: ['subBand0'],
      stateIds: [],
    },
    constraint: {
      category: 'warning',
      message: 'Foo violation',
      name: 'constraint0',
    },
    windows: [
      { start: 1577837323538, end: 1577838419190 },
      { start: 1577838164705, end: 1577838550588 },
      { start: 1577838240000, end: 1577838310588 },
    ],
  },
  {
    associations: {
      activityInstanceIds: ['subBand0'],
      stateIds: [],
    },
    constraint: {
      category: 'warning',
      message: 'Fee violation',
      name: 'constraint1',
    },
    windows: [{ start: 1577838621176, end: 1577839007058 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      stateIds: ['subBand1'],
    },
    constraint: {
      category: 'warning',
      message: 'Bar violation',
      name: 'constraint2',
    },
    windows: [{ start: 1577838621176, end: 1577839007058 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      stateIds: ['subBand2'],
    },
    constraint: {
      category: 'warning',
      message: 'Baz violation',
      name: 'constraint3',
    },
    windows: [{ start: 1577838277647, end: 1577838357647 }],
  },
];
