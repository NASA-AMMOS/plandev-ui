import { CActivityType, CActivityTypeMap } from '../types';

export const cActivityType: CActivityType = {
  name: 'PeelBanana',
  parameters: [
    { default: 'fromStem', name: 'peelDirection', type: 'string' },
    { default: 2.1, name: 'peelAmount', type: 'double' },
  ],
};

export const cActivityTypeMap: CActivityTypeMap = {
  PeelBanana: {
    name: 'PeelBanana',
    parameters: [
      { default: 'fromStem', name: 'peelDirection', type: 'string' },
      { default: 2.1, name: 'peelAmount', type: 'double' },
    ],
  },
};
