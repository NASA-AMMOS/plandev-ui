import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import Ajv from 'ajv';
import jsonSchema from '../../../schemas/ui-view-schema.json';

export const POST: RequestHandler = async event => {
  try {
    const body = await event.request.json();
    const ajv = new Ajv();
    const validate = ajv.compile(jsonSchema);
    const valid = validate(body);

    if (!valid) {
      const errors = validate.errors;
      return json({ errors, valid });
    } else {
      return json({ valid });
    }
  } catch (e) {
    return json({ errors: [e.message], valid: false });
  }
};
