import { ConstraintViolation } from '../types';

export const violations: ConstraintViolation[] = [
  {
    associations: {
      activityInstanceIds: ['row0'],
      stateIds: [],
    },
    constraint: {
      category: 'warning',
      message: 'Foo violation',
      name: 'constraint0',
    },
    windows: [
      { end: 1577838419190, start: 1577837323538 },
      { end: 1577838550588, start: 1577838164705 },
      { end: 1577838310588, start: 1577838240000 },
    ],
  },
  {
    associations: {
      activityInstanceIds: ['row0'],
      stateIds: [],
    },
    constraint: {
      category: 'warning',
      message: 'Fee violation',
      name: 'constraint1',
    },
    windows: [{ end: 1577839007058, start: 1577838621176 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      stateIds: ['row1'],
    },
    constraint: {
      category: 'warning',
      message: 'Bar violation',
      name: 'constraint2',
    },
    windows: [{ end: 1577839007058, start: 1577838621176 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      stateIds: ['row2'],
    },
    constraint: {
      category: 'warning',
      message: 'Baz violation',
      name: 'constraint3',
    },
    windows: [{ end: 1577838357647, start: 1577838277647 }],
  },
];
