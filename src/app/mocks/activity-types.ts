import { CActivityType, CActivityTypeMap } from '../types';

export const cActivityType: CActivityType = {
  name: 'peelBanana',
  parameters: [{ default: 'fromStem', name: 'peelDirection', type: 'string' }],
};

export const cActivityTypeMap: CActivityTypeMap = {
  peelBanana: {
    name: 'peelBanana',
    parameters: [
      { default: 'fromStem', name: 'peelDirection', type: 'string' },
    ],
  },
};
