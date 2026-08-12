import Ajv, { type ErrorObject } from 'ajv';
import type { ActivityDirective, ActivityType } from '../types/activity';
import type {
  BundleActivityDirective,
  BundleActivityType,
  BundleDuration,
  BundleResource,
  BundleSpan,
  BundleTimestamp,
  LoadedOfflineBundle,
  OfflineBundle,
} from '../types/offline-bundle';
import { OfflineBundleError } from '../types/offline-bundle';
import type { PlanSchema } from '../types/plan';
import type { Profile, ProfileSegment, ResourceType, SimulationDataset, Span } from '../types/simulation';
import bundleSchema from '../schemas/offline-bundle-schema-v1.json';

/** The bundle major version this loader understands. */
export const SUPPORTED_BUNDLE_MAJOR_VERSION = 1;

/** Synthetic dataset id. Spans, profiles and the SimulationDataset must agree on this. */
export const OFFLINE_DATASET_ID = 0;

const MICROSECONDS_PER_MS = 1000;
const MICROSECONDS_PER_SECOND = 1e6;
const MICROSECONDS_PER_MINUTE = 60 * MICROSECONDS_PER_SECOND;
const MICROSECONDS_PER_HOUR = 60 * MICROSECONDS_PER_MINUTE;

/**
 * Aerie/Postgres duration: optional sign, H:MM:SS with optional fractional seconds.
 * Hours are unbounded (a 30-hour plan is '30:00:00', not '1 day 06:00:00').
 */
const HMS_DURATION_RE = /^([+-])?(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)$/;
const ISO_DURATION_RE =
  /^([+-])?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
/** Aerie day-of-year timestamp, e.g. '2024-183T00:00:00.000'. */
const DOY_TIMESTAMP_RE = /^(\d{4})-(\d{1,3})T(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/;

/**
 * Producers commonly emit Aerie's existing snake_case plan.json field names.
 * Accepting both spellings means an unmodified plan.json can be pasted into a
 * bundle without a rename pass. Canonical (camelCase) always wins on conflict.
 */
const FIELD_ALIASES: Record<string, string> = {
  activity_directives: 'activityDirectives',
  activity_types: 'activityTypes',
  anchor_id: 'anchorId',
  anchored_to_start: 'anchoredToStart',
  bundle_version: 'bundleVersion',
  computed_attributes_value_schema: 'computedAttributesValueSchema',
  directive_id: 'directiveId',
  is_gap: 'isGap',
  model_id: 'modelId',
  parent_id: 'parentId',
  required_parameters: 'requiredParameters',
  start_offset: 'startOffset',
  start_time: 'startTime',
};

/**
 * Values addressed by key rather than by shape. Their contents belong to the
 * mission model or the user, so an alias-shaped key inside one (an activity
 * argument genuinely named `start_time`) must survive untouched.
 */
const OPAQUE_KEYS = new Set([
  'arguments',
  'attributes',
  'computedAttributesValueSchema',
  'dynamics',
  'metadata',
  'parameters',
  'schema',
  'view',
]);

/**
 * Rewrites known snake_case aliases to their canonical camelCase spelling,
 * recursively, stopping at {@link OPAQUE_KEYS} so user data passes through
 * verbatim.
 */
function normalizeAliases(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(entry => normalizeAliases(entry));
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    const canonical = FIELD_ALIASES[key] ?? key;
    // A canonical key already present in the source always wins over its alias.
    if (canonical !== key && Object.prototype.hasOwnProperty.call(source, canonical)) {
      continue;
    }
    result[canonical] = OPAQUE_KEYS.has(canonical) ? source[key] : normalizeAliases(source[key]);
  }

  return result;
}

/**
 * Parses any accepted duration spelling into whole microseconds.
 * @throws OfflineBundleError when the value cannot be interpreted.
 */
export function parseDurationToMicroseconds(duration: BundleDuration, context = 'duration'): number {
  if (typeof duration === 'number') {
    if (!Number.isFinite(duration)) {
      throw new OfflineBundleError(`Invalid ${context}: ${duration}`);
    }
    return Math.round(duration);
  }

  if (typeof duration !== 'string' || duration.trim() === '') {
    throw new OfflineBundleError(`Invalid ${context}: ${JSON.stringify(duration)}`);
  }

  const trimmed = duration.trim();

  const hms = HMS_DURATION_RE.exec(trimmed);
  if (hms !== null) {
    const [, sign, hours, minutes, seconds] = hms;
    const magnitude =
      Number(hours) * MICROSECONDS_PER_HOUR +
      Number(minutes) * MICROSECONDS_PER_MINUTE +
      Number(seconds) * MICROSECONDS_PER_SECOND;
    return Math.round(sign === '-' ? -magnitude : magnitude);
  }

  const iso = ISO_DURATION_RE.exec(trimmed);
  // 'P'/'PT' alone parses but carries no components; treat it as malformed.
  if (iso !== null && trimmed.replace(/^[+-]/, '') !== 'P' && trimmed.replace(/^[+-]/, '') !== 'PT') {
    const [, sign, days, hours, minutes, seconds] = iso;
    const magnitude =
      Number(days ?? 0) * 24 * MICROSECONDS_PER_HOUR +
      Number(hours ?? 0) * MICROSECONDS_PER_HOUR +
      Number(minutes ?? 0) * MICROSECONDS_PER_MINUTE +
      Number(seconds ?? 0) * MICROSECONDS_PER_SECOND;
    return Math.round(sign === '-' ? -magnitude : magnitude);
  }

  throw new OfflineBundleError(`Invalid ${context}: ${JSON.stringify(duration)}`);
}

/**
 * Renders whole microseconds as an unsigned Postgres interval string, the
 * spelling `postgres-interval` (and therefore `getIntervalInMs`) expects.
 * Hours are not rolled into days: 24 hours renders as '24:00:00.000000'.
 */
export function microsecondsToInterval(microseconds: number): string {
  const negative = microseconds < 0;
  const magnitude = Math.abs(Math.round(microseconds));

  const hours = Math.floor(magnitude / MICROSECONDS_PER_HOUR);
  const minutes = Math.floor((magnitude % MICROSECONDS_PER_HOUR) / MICROSECONDS_PER_MINUTE);
  const seconds = Math.floor((magnitude % MICROSECONDS_PER_MINUTE) / MICROSECONDS_PER_SECOND);
  const fraction = magnitude % MICROSECONDS_PER_SECOND;

  const hh = `${hours}`.padStart(2, '0');
  const mm = `${minutes}`.padStart(2, '0');
  const ss = `${seconds}`.padStart(2, '0');
  const ffffff = `${fraction}`.padStart(6, '0');

  return `${negative ? '-' : ''}${hh}:${mm}:${ss}.${ffffff}`;
}

/**
 * Parses an ISO-8601 or Aerie day-of-year timestamp into epoch milliseconds.
 * @throws OfflineBundleError when the value cannot be interpreted.
 */
export function parseTimestampToMs(timestamp: BundleTimestamp, context = 'timestamp'): number {
  if (typeof timestamp !== 'string' || timestamp.trim() === '') {
    throw new OfflineBundleError(`Invalid ${context}: ${JSON.stringify(timestamp)}`);
  }

  const trimmed = timestamp.trim();

  const doy = DOY_TIMESTAMP_RE.exec(trimmed);
  if (doy !== null) {
    const [, year, dayOfYear, hours, minutes, seconds] = doy;
    const wholeSeconds = Math.floor(Number(seconds));
    const milliseconds = Math.round((Number(seconds) - wholeSeconds) * 1000);
    // Day-of-year is 1-based, so day 1 is January 1st.
    const epoch = Date.UTC(Number(year), 0, 1, Number(hours), Number(minutes), wholeSeconds, milliseconds);
    return epoch + (Number(dayOfYear) - 1) * 24 * 60 * 60 * 1000;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    throw new OfflineBundleError(`Invalid ${context}: ${JSON.stringify(timestamp)}`);
  }
  return parsed;
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map(error => {
    const path = error.instancePath === '' ? '(root)' : error.instancePath;
    return `${path} ${error.message ?? 'is invalid'}`;
  });
}

/**
 * Parses raw JSON text into a validated bundle. Performs alias normalization,
 * JSON Schema validation, and a major-version compatibility check.
 * @throws OfflineBundleError with per-field details on any failure.
 */
export function parseOfflineBundle(text: string): OfflineBundle {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new OfflineBundleError(`Bundle is not valid JSON: ${(error as Error).message}`);
  }

  const normalized = normalizeAliases(raw) as OfflineBundle;

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(bundleSchema);
  if (!validate(normalized)) {
    throw new OfflineBundleError('Bundle does not match the offline bundle schema', formatAjvErrors(validate.errors));
  }

  const major = Number(normalized.bundleVersion.split('.')[0]);
  if (major !== SUPPORTED_BUNDLE_MAJOR_VERSION) {
    throw new OfflineBundleError(
      `Unsupported bundle version ${normalized.bundleVersion}. This build understands major version ${SUPPORTED_BUNDLE_MAJOR_VERSION}.`,
    );
  }

  return normalized;
}

function toActivityDirective(
  directive: BundleActivityDirective,
  planId: number,
  planStartMs: number,
): ActivityDirective {
  const startOffsetUs = parseDurationToMicroseconds(
    directive.startOffset,
    `activity directive ${directive.id} startOffset`,
  );
  const timestamp = new Date(planStartMs).toISOString();

  return {
    anchor_id: directive.anchorId ?? null,
    anchored_to_start: directive.anchoredToStart ?? true,
    arguments: directive.arguments ?? {},
    created_at: timestamp,
    created_by: '',
    id: directive.id,
    last_modified_arguments_at: timestamp,
    last_modified_at: timestamp,
    last_modified_by: null,
    metadata: directive.metadata ?? {},
    name: directive.name ?? directive.type,
    plan_id: planId,
    source_scheduling_goal_id: null,
    source_scheduling_goal_invocation_id: null,
    start_offset: microsecondsToInterval(startOffsetUs),
    start_time_ms: planStartMs + startOffsetUs / MICROSECONDS_PER_MS,
    tags: [],
    type: directive.type,
  };
}

function toActivityType(activityType: BundleActivityType): ActivityType {
  const parameters = Object.entries(activityType.parameters ?? {}).reduce(
    (map, [name, parameter], index) => {
      map[name] = {
        order: parameter.order ?? index,
        schema: parameter.schema,
        ...(parameter.unit ? { unit: parameter.unit } : {}),
      };
      return map;
    },
    {} as ActivityType['parameters'],
  );

  return {
    computed_attributes_value_schema: activityType.computedAttributesValueSchema ?? { items: {}, type: 'struct' },
    description: activityType.description,
    name: activityType.name,
    parameters,
    required_parameters: activityType.requiredParameters ?? [],
    subsystem_tag: null,
  };
}

/**
 * Spans are emitted relative to simulation start but consumed relative to plan
 * start, so every offset is rebased by the gap between the two.
 *
 * The writer emits `directiveId`, `arguments` and `attributes` flat; the UI
 * expects them nested under `attributes`. `childIds` is deliberately dropped —
 * `createSpanUtilityMaps` rederives the hierarchy from `parent_id`.
 */
function toSpan(span: BundleSpan, simulationStartMs: number, planStartMs: number): Span {
  const startOffsetUs = parseDurationToMicroseconds(span.startOffset, `span ${span.id} startOffset`);
  const durationUs =
    span.duration === undefined ? 0 : parseDurationToMicroseconds(span.duration, `span ${span.id} duration`);

  const startMs = simulationStartMs + startOffsetUs / MICROSECONDS_PER_MS;
  const durationMs = durationUs / MICROSECONDS_PER_MS;
  const planRelativeOffsetUs = (startMs - planStartMs) * MICROSECONDS_PER_MS;

  return {
    attributes: {
      arguments: span.arguments ?? {},
      computedAttributes: span.attributes ?? {},
      ...(span.directiveId === null || span.directiveId === undefined ? {} : { directiveId: span.directiveId }),
    },
    dataset_id: OFFLINE_DATASET_ID,
    duration: microsecondsToInterval(durationUs),
    durationMs,
    endMs: startMs + durationMs,
    parent_id: span.parentId ?? null,
    span_id: span.id,
    startMs,
    start_offset: microsecondsToInterval(planRelativeOffsetUs),
    type: span.type,
  };
}

/**
 * Converts a bundle resource into the UI's Profile shape.
 *
 * This is the format's sharpest edge: bundle segments carry `extent` (their own
 * duration, a delta) while the UI reads cumulative `start_offset` values and
 * infers each segment's end from the *next* segment's offset. Getting this
 * wrong produces a plausible-looking but silently wrong timeline, so the
 * prefix sum happens here and nowhere else.
 */
function toProfile(resource: BundleResource, index: number, simulationStartMs: number, planStartMs: number): Profile {
  const baseOffsetUs = (simulationStartMs - planStartMs) * MICROSECONDS_PER_MS;

  let cursorUs = baseOffsetUs;
  const profile_segments: ProfileSegment[] = resource.segments.map(segment => {
    const startOffsetUs = cursorUs;
    cursorUs += parseDurationToMicroseconds(segment.extent, `resource ${resource.name} segment extent`);

    return {
      dataset_id: OFFLINE_DATASET_ID,
      dynamics: segment.dynamics ?? null,
      is_gap: segment.isGap ?? (segment.dynamics === null || segment.dynamics === undefined),
      profile_id: index,
      start_offset: microsecondsToInterval(startOffsetUs),
    };
  });

  return {
    dataset_id: OFFLINE_DATASET_ID,
    // `duration` closes the final segment, so it is the profile's plan-relative end.
    duration: microsecondsToInterval(cursorUs),
    id: index,
    name: resource.name,
    profile_segments,
    type: { schema: resource.schema, type: resource.type },
  };
}

/**
 * Fabricates a terminal SimulationDataset. `status: 'success'` and a matching
 * `dataset_id` are load-bearing: `createProfileSubscription` uses them to decide
 * a simulation has settled, which is what closes the final profile segment at
 * `duration` instead of leaving it open-ended.
 */
function toSimulationDataset(
  bundle: OfflineBundle,
  simulationStartMs: number,
  simulationEndMs: number,
): SimulationDataset {
  const requestedAt = new Date(simulationStartMs).toISOString();

  return {
    arguments: {},
    canceled: bundle.simulation.canceled ?? false,
    dataset_id: OFFLINE_DATASET_ID,
    extent: { extent: microsecondsToInterval((simulationEndMs - simulationStartMs) * MICROSECONDS_PER_MS) },
    id: OFFLINE_DATASET_ID,
    model_id: bundle.plan.modelId ?? 0,
    model_revision: 0,
    plan_revision: 0,
    reason: null,
    requested_at: requestedAt,
    requested_by: '',
    simulation_end_time: new Date(simulationEndMs).toISOString(),
    simulation_revision: 0,
    simulation_start_time: new Date(simulationStartMs).toISOString(),
    status: 'success',
  };
}

function toPlanSchema(bundle: OfflineBundle, planStartMs: number, planDurationUs: number): PlanSchema {
  const timestamp = new Date(planStartMs).toISOString();

  return {
    child_plans: [],
    collaborators: [],
    constraint_specification: [],
    created_at: timestamp,
    duration: microsecondsToInterval(planDurationUs),
    id: bundle.plan.id ?? 0,
    is_locked: true,
    model: null,
    model_id: bundle.plan.modelId ?? null,
    name: bundle.plan.name,
    owner: '',
    parent_plan: null,
    revision: 0,
    scheduling_specification: null,
    simulations: [{ id: OFFLINE_DATASET_ID, simulation_datasets: [{ id: OFFLINE_DATASET_ID, plan_revision: 0 }] }],
    start_time: timestamp,
    tags: [],
    updated_at: timestamp,
    updated_by: '',
  };
}

/**
 * Transforms a validated bundle into the store-ready shapes the offline plan
 * route hydrates. All time arithmetic is resolved here so that nothing
 * downstream needs to know the bundle format existed.
 */
export function transformOfflineBundle(bundle: OfflineBundle): LoadedOfflineBundle {
  const planStartMs = parseTimestampToMs(bundle.plan.startTime, 'plan startTime');
  const planDurationUs = parseDurationToMicroseconds(bundle.plan.duration, 'plan duration');
  const simulationStartMs = parseTimestampToMs(bundle.simulation.simulationStartTime, 'simulationStartTime');
  const simulationEndMs = parseTimestampToMs(bundle.simulation.simulationEndTime, 'simulationEndTime');

  if (simulationEndMs < simulationStartMs) {
    throw new OfflineBundleError('simulationEndTime is before simulationStartTime');
  }

  const planId = bundle.plan.id ?? 0;
  const resources = bundle.simulation.resources ?? [];
  const profiles = resources.map((resource, index) => toProfile(resource, index, simulationStartMs, planStartMs));

  return {
    activityDirectives: bundle.activityDirectives.map(directive => toActivityDirective(directive, planId, planStartMs)),
    activityTypes: (bundle.activityTypes ?? []).map(toActivityType),
    plan: toPlanSchema(bundle, planStartMs, planDurationUs),
    profiles,
    resourceTypes: resources.map(({ name, schema }): ResourceType => ({ name, schema })),
    simulationDataset: toSimulationDataset(bundle, simulationStartMs, simulationEndMs),
    spans: (bundle.simulation.spans ?? []).map(span => toSpan(span, simulationStartMs, planStartMs)),
    view: bundle.view ?? null,
  };
}

/**
 * Parses and transforms bundle JSON text in one step.
 * @throws OfflineBundleError on any validation or conversion failure.
 */
export function loadOfflineBundle(text: string): LoadedOfflineBundle {
  return transformOfflineBundle(parseOfflineBundle(text));
}
