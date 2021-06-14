import { ConstraintViolation } from '../types';

export const violations: ConstraintViolation[] = [
  {
    associations: {
      activityInstanceIds: ['row0'],
      resourceIds: [],
    },
    constraint: {
      association: 'adaptation',
      definition: '',
      description: '',
      name: 'constraint0',
      summary: '',
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
      resourceIds: [],
    },
    constraint: {
      association: 'adaptation',
      definition: '',
      description: '',
      name: 'constraint1',
      summary: '',
    },
    windows: [{ end: 1577839007058, start: 1577838621176 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      resourceIds: ['row1'],
    },
    constraint: {
      association: 'adaptation',
      definition: '',
      description: '',
      name: 'constraint2',
      summary: '',
    },
    windows: [{ end: 1577839007058, start: 1577838621176 }],
  },
  {
    associations: {
      activityInstanceIds: [],
      resourceIds: ['row2'],
    },
    constraint: {
      association: 'adaptation',
      definition: '',
      description: '',
      name: 'constraint3',
      summary: '',
    },
    windows: [{ end: 1577838357647, start: 1577838277647 }],
  },
];
