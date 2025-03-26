import { expect, test } from 'vitest';
import type { ActionDefinition, ActionRunSlim } from '../types/actions';
import type { ParametersMap } from '../types/parameter';
import { getActionDefinitionForRun, valueSchemaRecordToParametersMap } from './actions';

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

test('getActionDefinitionForRun', () => {
  const actionRun: ActionRunSlim = {
    action_definition: {
      workspace_id: 1,
    },
    action_definition_id: 1,
    duration: 1,
    error: null,
    id: 1,
    logs: null,
    parameters: {},
    requested_at: '',
    requested_by: '',
    results: null,
    settings: {},
    status: 'pending',
  };
  const actionDefinition: ActionDefinition = {
    action_file_id: 1,
    created_at: '',
    description: '',
    id: 1,
    name: '',
    owner: '',
    parameter_schema: {},
    settings: {},
    settings_schema: {},
    updated_at: '',
    updated_by: '',
    workspace_id: 1,
  };
  const actionDefinitionsByWorkspace: Record<number, Record<number, ActionDefinition>> = {
    1: {
      1: actionDefinition,
      2: { ...actionDefinition, id: 2 },
    },
    2: {
      1: { ...actionDefinition, id: 3 },
      2: { ...actionDefinition, id: 4 },
    },
  };
  expect(getActionDefinitionForRun(actionRun, actionDefinitionsByWorkspace, 1)).to.deep.eq(actionDefinition);
});
