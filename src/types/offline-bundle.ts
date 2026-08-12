import type { ActivityDirective, ActivityType } from './activity';
import type { ActivityMetadata } from './activity-metadata';
import type { ArgumentsMap } from './parameter';
import type { PlanSchema } from './plan';
import type { ValueSchema } from './schema';
import type { Profile, ResourceType, SimulationDataset, Span } from './simulation';
import type { ViewDefinition } from './view';

/**
 * A span of time in the bundle format. Producers may emit an Aerie signed
 * duration ('+11:39:55.219000'), a Postgres interval ('02:27:15.059'), an
 * ISO-8601 duration ('PT2H27M15.059S'), or an integer count of microseconds.
 */
export type BundleDuration = string | number;

/**
 * An absolute instant. ISO-8601 or Aerie day-of-year ('2024-183T00:00:00').
 */
export type BundleTimestamp = string;

export type BundlePlan = {
  duration: BundleDuration;
  id?: number;
  modelId?: number;
  name: string;
  startTime: BundleTimestamp;
};

export type BundleActivityType = {
  computedAttributesValueSchema?: ValueSchema;
  description?: string;
  name: string;
  parameters?: Record<string, { order?: number; schema: ValueSchema; unit?: string }>;
  requiredParameters?: string[];
  subsystem?: string;
};

export type BundleActivityDirective = {
  anchorId?: number | null;
  anchoredToStart?: boolean;
  arguments?: ArgumentsMap;
  id: number;
  metadata?: ActivityMetadata;
  name?: string;
  startOffset: BundleDuration;
  type: string;
};

export type BundleSpan = {
  arguments?: ArgumentsMap;
  attributes?: ArgumentsMap;
  directiveId?: number | null;
  duration?: BundleDuration;
  id: number;
  parentId?: number | null;
  startOffset: BundleDuration;
  type: string;
};

/**
 * `extent` is the segment's OWN duration — a delta, not a cumulative offset.
 * This is the single most error-prone field in the format: the Aerie UI
 * consumes cumulative `start_offset` values, so the loader must prefix-sum
 * these before handing them to `sampleProfiles`.
 */
export type BundleResourceSegment = {
  dynamics?: unknown;
  extent: BundleDuration;
  isGap?: boolean;
};

export type BundleResource = {
  name: string;
  schema: ValueSchema;
  segments: BundleResourceSegment[];
  type: 'discrete' | 'real';
};

export type BundleSimulation = {
  canceled?: boolean;
  resources?: BundleResource[];
  simulationEndTime: BundleTimestamp;
  simulationStartTime: BundleTimestamp;
  spans?: BundleSpan[];
};

export type OfflineBundle = {
  activityDirectives: BundleActivityDirective[];
  activityTypes?: BundleActivityType[];
  bundleVersion: string;
  plan: BundlePlan;
  simulation: BundleSimulation;
  view?: ViewDefinition;
};

/**
 * Everything the offline plan route needs, shaped to match what
 * `routes/plans/[id]/+page.ts` returns from the live backend.
 */
export type LoadedOfflineBundle = {
  activityDirectives: ActivityDirective[];
  activityTypes: ActivityType[];
  plan: PlanSchema;
  profiles: Profile[];
  resourceTypes: ResourceType[];
  simulationDataset: SimulationDataset;
  spans: Span[];
  view: ViewDefinition | null;
};

export class OfflineBundleError extends Error {
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(details.length > 0 ? `${message}\n${details.join('\n')}` : message);
    this.name = 'OfflineBundleError';
    this.details = details;
  }
}
