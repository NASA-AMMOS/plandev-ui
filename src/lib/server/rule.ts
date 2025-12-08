import type { Rule } from '$lib/types/oidc';
import type { User } from '../../types/app';

export const userIsDefined: Rule = (u: User | null) => {
  return !!u;
};

export const userIsAdmin: Rule = (u: User | null) => {
  return u?.activeRole === 'aerie_admin';
};
