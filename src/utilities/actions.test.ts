import { expect, test } from 'vitest';
import type { ActionDefinition } from '../types/actions';
import type { ParametersMap } from '../types/parameter';
import { valueSchemaRecordToParametersMap } from './actions';

test('valueSchemaRecordToParametersMap', () => {
  const schema: ActionDefinition['settings_schema'] = {
    a: { type: 'boolean' },
    b: { type: 'int' },
  };
  const expectedResult: ParametersMap = {
    a: { order: 0, schema: { type: 'boolean' } },
    b: { order: 1, schema: { type: 'int' } },
  };
  expect(valueSchemaRecordToParametersMap(schema)).to.deep.eq(expectedResult);
});
