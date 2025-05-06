import type { UserId } from './app';

export type Workspace = {
  created_at: string;
  disk_location: string;
  id: number | string;
  name: string;
  owner: UserId;
  parcel_id: number;
  updated_at: string;
};

export type WorkspaceInsertInput = {
  parcelId: number;
  workspaceLocation: string;
  workspaceName?: string;
};
