import { Violation } from '../types';

export const violations: Violation[] = [
  {
    associations: {
      activityInstanceIds: ['subBand0'],
      stateIds: [],
    },
    constraint: {
      category: '',
      id: 'constraint-0',
      message: 'Foo violation',
      name: '',
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
      id: 'constraint-1',
      message: 'Fee violation',
      name: '',
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
      id: 'constraint-2',
      message: 'Bar violation',
      name: '',
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
      id: 'constraint-3',
      message: 'Baz violation',
      name: '',
    },
    windows: [{ start: 1577838277647, end: 1577838357647 }],
  },
];
