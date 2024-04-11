import type { UserId } from '../types/app';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Constants. */
// Default Aerie database roles.
// See https://github.com/NASA-AMMOS/aerie/blob/develop/merlin-server/sql/merlin/default_user_roles.sql
// for a description of these roles.
export const AERIE_DEFAULT_USERS: UserId[] = ['Mission Model', 'Aerie Legacy'];

/* Subscriptions. */

export const users = gqlSubscribable<UserId[] | null>(gql.SUB_USERS, {}, null, null, users =>
  // Filter out Aerie default users as they should not be viewable by UI users
  users
    .filter((user: { default_role: string; username: UserId }) => AERIE_DEFAULT_USERS.indexOf(user.username) < 0)
    .map((user: { default_role: string; username: UserId }) => user.username),
);
