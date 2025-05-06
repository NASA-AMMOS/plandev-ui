import { SearchParameters } from '../enums/searchParameters';

enum Routes {
  Workspaces = 'workspaces',
}

export function getWorkspacesUrl(base: string, workspaceId?: number | null, sequenceId?: string | null) {
  const urlSearchParams = new URLSearchParams();
  if (sequenceId != null) {
    urlSearchParams.set(SearchParameters.SEQUENCE_ID, sequenceId);
  }
  const params = urlSearchParams.toString();
  return `${base}/${Routes.Workspaces}${workspaceId != null ? `/${workspaceId}${sequenceId != null ? `?${params}` : ''}` : ''}`;
}
