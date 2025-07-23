import { describe, expect, test } from 'vitest';
import viewV0Migrated from '../tests/mocks/view/v0/view-migrated.json';
import viewV0 from '../tests/mocks/view/v0/view.json';
import viewV2 from '../tests/mocks/view/v2/view.json';
import {
  applyViewDefinitionMigrations,
  generateDefaultView,
  migrateViewDefinitionV0toV1,
  validateViewJSONAgainstSchema,
} from './view';

describe('generateDefaultView', () => {
  test('Should generate a valid view', async () => {
    const view = generateDefaultView([
      { name: 'resource1', schema: { type: 'boolean' } },
      { name: 'resource2', schema: { type: 'int' } },
      { name: 'resource2', schema: { items: { type: 'boolean' }, type: 'series' } },
    ]);
    const { valid, errors } = validateViewJSONAgainstSchema(view.definition);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });
});

describe('generateDefaultViewWithEvents', () => {
  test('Should generate a valid view with events', async () => {
    const view = generateDefaultView(
      [],
      [
        { attribute_schema: {}, name: 'external-event-type_1' },
        { attribute_schema: {}, name: 'external-event-type_2' },
      ],
    );

    // validate against schema
    const { valid, errors } = validateViewJSONAgainstSchema(view.definition);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);

    // check fields
    const timelines = view.definition.plan.timelines;
    expect(timelines.length).toBe(1);
    expect(timelines[0].rows.length).toBe(2);
    expect(timelines[0].rows[1].name).toBe('External Events');

    const layers = timelines[0].rows[1].layers;
    expect(layers.length).toBe(1);
    expect(layers[0].filter.externalEvent).toBeDefined();
    expect(layers[0].filter.externalEvent?.event_types).toEqual(['external-event-type_1', 'external-event-type_2']);
  });
});

describe('applyViewDefinitionMigrations', () => {
  test('Should migrate a view from v0 -> v1', async () => {
    const migratedView = migrateViewDefinitionV0toV1(viewV0 as any);
    expect(migratedView).to.deep.eq(viewV0Migrated);
  });
});

describe('migrateViewDefinition', () => {
  test('Should apply view migrations to an old view', async () => {
    const { anyMigrationsApplied, error, migratedViewDefinition } = applyViewDefinitionMigrations(viewV0 as any);
    expect(anyMigrationsApplied).toBeTruthy();
    expect(error).toBeNull();
    expect(migratedViewDefinition).to.deep.eq(viewV2);
  });
  test('Should apply no view migrations to a migration matching current version', async () => {
    const { anyMigrationsApplied, error, migratedViewDefinition } = applyViewDefinitionMigrations(viewV2 as any);
    expect(anyMigrationsApplied).toBeFalsy();
    expect(error).toBeNull();
    expect(migratedViewDefinition).to.deep.eq(viewV2);
  });
  test('Should return errors if migration fails', async () => {
    const invalidView = structuredClone(viewV0);
    // @ts-expect-error forcing this to be invalid
    invalidView.plan.grid = null;
    const { anyMigrationsApplied, error, migratedViewDefinition } = applyViewDefinitionMigrations(invalidView as any);
    expect(anyMigrationsApplied).toBeFalsy();
    expect(error).not.toBeNull();
    expect(migratedViewDefinition).toBeNull();
  });
});
