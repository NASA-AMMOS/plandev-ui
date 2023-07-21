import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { validateViewJSONAgainstSchema } from '../../../utilities/view';

export const POST: RequestHandler = async event => {
  try {
    const body = await event.request.json();
    const { errors, valid } = validateViewJSONAgainstSchema(body);
    if (!valid) {
      return json({ errors, valid });
    } else {
      return json({ valid });
    }
  } catch (e) {
    return json({ errors: [(e as Error).message], valid: false });
  }
};
