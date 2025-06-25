import { SearchParameters } from '../enums/searchParameters';

enum Routes {
  Workspaces = 'workspaces',
  Actions = 'sequencing/actions',
}

export function getWorkspacesUrl(base: string, workspaceId?: number | null, sequenceId?: string | null) {
  const urlSearchParams = new URLSearchParams();
  if (sequenceId != null) {
    urlSearchParams.set(SearchParameters.SEQUENCE_ID, sequenceId);
  }
  const params = urlSearchParams.toString();
  return `${base}/${Routes.Workspaces}${workspaceId != null ? `/${workspaceId}${sequenceId != null ? `?${params}` : ''}` : ''}`;
}

export function getActionsUrl(base: string, workspaceId?: number, actionRunId?: number) {
  const urlSearchParams = new URLSearchParams();
  if (workspaceId != null) {
    urlSearchParams.set(SearchParameters.WORKSPACE_ID, `${workspaceId}`);
  }
  const params = urlSearchParams.toString();
  return `${base}/${Routes.Actions}${actionRunId != null ? `/runs/${actionRunId}` : ''}${workspaceId != null ? `?${params}` : ''}`;
}
