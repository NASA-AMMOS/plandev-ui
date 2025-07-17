import { SearchParameters } from '../enums/searchParameters';

enum Routes {
  Workspaces = 'workspaces',
  Actions = 'actions',
}

export function getWorkspacesUrl(base: string, workspaceId?: number | null, sequenceId?: string | null) {
  const urlSearchParams = new URLSearchParams();
  if (sequenceId != null) {
    urlSearchParams.set(SearchParameters.SEQUENCE_ID, sequenceId);
  }
  const params = urlSearchParams.toString();
  return `${base}/${Routes.Workspaces}${workspaceId != null ? `/${workspaceId}${sequenceId != null ? `?${params}` : ''}` : ''}`;
}

export function getActionsUrl(base: string, workspaceId?: number | null, actionRunId?: number | null) {
  return `${getWorkspacesUrl(base, workspaceId)}/${Routes.Actions}${actionRunId != null ? `/runs/${actionRunId}` : ''}`;
}
