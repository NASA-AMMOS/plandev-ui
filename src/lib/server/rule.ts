import type { Rule } from '$lib/types/auth';
import type { User } from '../../types/app';

export const userIsDefined: Rule = (u: User | null) => {
  return !!u;
};

// if we want to block any pages to just admins, we can enforce it in its +page.server.ts
export const userIsAdmin: Rule = (u: User | null) => {
  return u?.activeRole === 'aerie_admin';
};
