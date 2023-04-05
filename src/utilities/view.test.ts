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
