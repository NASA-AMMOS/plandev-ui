import { SearchParameters } from '../enums/searchParameters';

enum Routes {
  Workspaces = 'workspaces',
}

export function getWorkspacesUrl(base: string, workspaceId?: number | null, sequenceId?: string | null) {
  return `${base}/${Routes.Workspaces}${workspaceId != null ? `/${workspaceId}${sequenceId != null ? `?${SearchParameters.SEQUENCE_ID}=${sequenceId}` : ''}` : ''}`;
}
