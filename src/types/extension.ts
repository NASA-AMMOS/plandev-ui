import type { ActivityDirective } from './activity';
import type { Span } from './simulation';

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
  selectedActivityDirective: ActivityDirective | null;
  selectedSimulatedActivity?: Span | null;
  simulationDatasetId: number | null;
};

export type ExtensionResponse = {
  message: string;
  success: boolean;
  trace?: string;
  url?: string;
};

export type ExtensionRole = {
  extension_id: number;
  role: string;
};
