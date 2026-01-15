/**
 * Sequencing-related routes that should display SeqDev branding.
 */
const SEQDEV_ROUTES = ['/workspaces', '/dictionaries', '/parcels', '/sequence-templates'];

/**
 * Returns the appropriate brand name based on the current route.
 * Sequencing-related routes return "SeqDev", all others return "PlanDev".
 */
export function getAppBrand(pathname: string): string {
  const isSequencingRoute = SEQDEV_ROUTES.some(route => pathname.startsWith(route));
  return isSequencingRoute ? 'SeqDev' : 'PlanDev';
}
