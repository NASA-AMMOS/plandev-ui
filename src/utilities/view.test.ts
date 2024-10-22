import { describe, expect, test } from 'vitest';
import { generateDefaultView, validateViewJSONAgainstSchema } from './view';

describe('generateDefaultView', () => {
  test('Should generate a valid view', async () => {
    const view = generateDefaultView(
      [],
      [
        { name: 'resource1', schema: { type: 'boolean' } },
        { name: 'resource2', schema: { type: 'int' } },
        { name: 'resource2', schema: { items: { type: 'boolean' }, type: 'series' } },
      ],
    );
    const { valid, errors } = validateViewJSONAgainstSchema(view.definition);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });
});

describe('generateDefaultViewWithEvents', () => {
  test('Should generate a valid view with events', async () => {
    const view = generateDefaultView([], [], [{ name: 'external-event-type_1' }, { name: 'external-event-type_2' }]);

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
