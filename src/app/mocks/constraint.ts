import { Violation } from '../types';

export const violations: Violation[] = [
  {
    associations: {
      activityInstanceIds: ['subBand0'],
      stateIds: [],
    },
    constraint: {
      category: '',
      message: 'Foo violation',
      name: 'constraint-0',
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
      category: '',
      message: 'Fee violation',
      name: 'constraint-1',
    },
    windows: [{ start: 1577838621176, end: 1577839007058 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      stateIds: ['subBand1'],
    },
    constraint: {
      category: '',
      message: 'Bar violation',
      name: 'constraint-2',
    },
    windows: [{ start: 1577838621176, end: 1577839007058 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      stateIds: ['subBand2'],
    },
    constraint: {
      category: '',
      message: 'Baz violation',
      name: 'constraint-3',
    },
    windows: [{ start: 1577838277647, end: 1577838357647 }],
  },
];
