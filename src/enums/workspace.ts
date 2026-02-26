export enum WorkspaceContentMode {
  ActionDetail = 'ACTION_DETAIL',
  ActionRunDetail = 'ACTION_RUN_DETAIL',
  ActionRunsList = 'ACTION_RUNS_LIST',
  File = 'FILE',
}

export enum WorkspaceContentType {
  Binary = 'BINARY',
  Directory = 'DIRECTORY',
  Json = 'JSON',
  Metadata = 'METADATA',
  Sequence = 'SEQUENCE',
  Text = 'TEXT',
  Unknown = 'UNKNOWN',
  Workspace = 'WORKSPACE', // not a real value from the service
}
