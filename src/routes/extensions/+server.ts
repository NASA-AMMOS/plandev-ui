import { json, type RequestHandler } from '@sveltejs/kit';
import type { ExtensionResponse } from '../../types/extension';
import { reqExtension } from '../../utilities/requests';

/**
 * Used to proxy requests from the UI to an external extension. This avoids any CORS errors we might
 * encounter by calling a tool that may or may not be external to Aerie.
 */
export const POST: RequestHandler = async event => {
  const { url, ...body } = await event.request.json();
  const response = await reqExtension(url, body, event.locals.user);

  if (isExtensionResponse(response)) {
    return json(response);
  }

  return json({ message: response, success: false });
};

function isExtensionResponse(result: any): result is ExtensionResponse {
  return 'message' in result && 'success' in result;
}
