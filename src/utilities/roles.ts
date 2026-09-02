import type { UserRole } from '../types/app';

export const ADMIN_ROLE = 'aerie_admin';

/**
 * Display-only aliases for role names.
 *
 * When Aerie was rebranded to PlanDev the `aerie_admin` Hasura role was left in place, since
 * renaming it would be a breaking change for every deployment's database and permission config.
 * This map hides that legacy name from the UI without touching it anywhere it actually matters:
 * the values sent to the backend (`x-hasura-role`, the `activeRole` cookie, permission checks)
 * are always the real role. If the role is ever renamed in the database, delete its entry here.
 */
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  [ADMIN_ROLE]: 'admin',
};

/**
 * Returns the label to show a user for a role. Roles without an alias are shown as-is.
 */
export function getRoleDisplayName(userRole?: UserRole | null): string {
  if (!userRole) {
    return '';
  }
  return ROLE_DISPLAY_NAMES[userRole] ?? userRole;
}
