import '../css/app.css';
import { user as userStore } from '../stores/app';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  userStore.set(data?.user); // TODO: Remove this!
  return { ...data };
};
