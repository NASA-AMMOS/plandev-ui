import '../css/app.css';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  return { ...data };
};
