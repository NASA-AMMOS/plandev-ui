export type Extension = {
  description: string;
  extension_roles: ExtensionRole[];
  id: number;
  label: string;
  updated_at: string;
  url: string;
};

export type ExtensionPayload = {
  gateway?: string;
  hasura?: string;
  planId: number;
  selectedActivityDirectiveId: number | null;
  simulationDatasetId: number | null;
};

export type ExtensionResponse = {
  message: string;
  success: boolean;
  url: string;
};

export type ExtensionRole = {
  extension_id: number;
  role: string;
};
