import type { ActivityDirective, ActivityDirectiveId } from './activity';
import type { ArgumentsMap } from './parameter';
import type { Tag } from './tags';

/**
 * Raw activity data from GraphQL for comparison
 */
export type ComparisonActivityRaw = {
  anchor_id: number | null;
  anchored_to_start: boolean;
  arguments: ArgumentsMap;
  id: ActivityDirectiveId;
  metadata: Record<string, unknown>;
  name: string;
  start_offset: string;
  tags: { tag: Tag }[];
  type: string;
};

/**
 * Plan data returned from GET_PLAN_FOR_COMPARISON query
 */
export type PlanForComparison = {
  activity_directives: ComparisonActivityRaw[];
  duration: string;
  id: number;
  model_id: number;
  name: string;
  start_time: string;
};

/**
 * Snapshot metadata returned from GET_SNAPSHOT_FOR_COMPARISON query
 */
export type SnapshotForComparison = {
  model_id: number;
  plan: {
    duration: string;
    name: string;
    start_time: string;
  };
  plan_id: number;
  revision: number;
  snapshot_id: number;
  snapshot_name: string;
  taken_at: string;
};

/**
 * Source for comparison - either a plan or a snapshot
 */
export type ComparisonSource =
  | { name: string; planId: number; type: 'plan' }
  | { name: string; planId: number; snapshotId: number; type: 'snapshot' };

/**
 * Normalized activity structure for comparison
 * Contains only the fields needed for matching and diffing
 */
export type ComparisonActivity = {
  anchor_id: number | null;
  anchored_to_start: boolean;
  arguments: ArgumentsMap;
  id: ActivityDirectiveId;
  metadata: Record<string, unknown>;
  name: string;
  start_offset: string;
  tags: Tag[];
  type: string;
};

/**
 * Type of match between two activities
 */
export type MatchType =
  | 'exact' // Same type, name, start_offset - may have param changes
  | 'moved' // Same type, name - different start_offset
  | 'modified' // Matched with changes (params, metadata, etc.)
  | 'reanchored' // Same activity but different anchor parent
  | 'fuzzy' // Matched via fuzzy scoring
  | 'ambiguous'; // Multiple possible matches with similar scores

/**
 * Confidence level for a match
 */
export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low';

/**
 * Result of matching two activities
 */
export type ActivityMatch = {
  changedFields: string[];
  confidence: number; // 0-1 score
  confidenceLevel: MatchConfidence;
  leftActivity: ComparisonActivity;
  matchType: MatchType;
  rightActivity: ComparisonActivity;
};

/**
 * Result of activity comparison - either matched, added, or deleted
 */
export type ActivityComparisonResult =
  | {
      changeType: 'matched';
      changedFields: string[];
      confidence: number;
      confidenceLevel: MatchConfidence;
      leftActivity: ComparisonActivity;
      matchType: MatchType;
      rightActivity: ComparisonActivity;
    }
  | {
      activity: ComparisonActivity;
      changeType: 'added';
    }
  | {
      activity: ComparisonActivity;
      changeType: 'deleted';
    };

/**
 * Summary statistics for plan comparison
 */
export type PlanComparisonSummary = {
  added: number;
  deleted: number;
  matched: {
    ambiguous: number;
    exact: number;
    fuzzy: number;
    modified: number;
    moved: number;
    total: number;
    unchanged: number;
  };
  modified: number;
  total: number;
};

/**
 * Full comparison result between two plans/snapshots
 */
export type PlanComparisonResult = {
  leftSource: ComparisonSource;
  results: ActivityComparisonResult[];
  rightSource: ComparisonSource;
  summary: PlanComparisonSummary;
};

/**
 * Anchor tree structure for efficient child lookups
 * Maps parent activity ID to list of child activities
 */
export type AnchorTree = Map<ActivityDirectiveId | null, ComparisonActivity[]>;

/**
 * Matching strategy to use
 */
export type MatchingStrategy = 'id' | 'content';

/**
 * Options for the comparison algorithm
 */
export type ComparisonOptions = {
  /** Threshold for accepting a fuzzy match (default: 0.85) */
  fuzzyHighThreshold?: number;
  /** Threshold below which to treat as separate add/delete (default: 0.65) */
  fuzzyLowThreshold?: number;
  /** Whether to include unchanged activities in results (default: true) */
  includeUnchanged?: boolean;
  /** Matching strategy - 'id' for snapshots, 'content' for plan vs plan */
  strategy: MatchingStrategy;
};

/**
 * Convert an ActivityDirective to a ComparisonActivity
 */
export function toComparisonActivity(activity: ActivityDirective): ComparisonActivity {
  return {
    anchor_id: activity.anchor_id,
    anchored_to_start: activity.anchored_to_start,
    arguments: activity.arguments,
    id: activity.id,
    metadata: activity.metadata,
    name: activity.name,
    start_offset: activity.start_offset,
    tags: activity.tags.map(t => t.tag),
    type: activity.type,
  };
}

/**
 * Normalize a start_offset string to ensure consistent comparison.
 * Removes trailing microseconds/nanoseconds precision that may differ between sources.
 * "00:00:00.000000" -> "00:00:00"
 * "01:30:00.123456" -> "01:30:00.123"
 */
function normalizeStartOffset(offset: string): string {
  if (!offset) {
    return offset;
  }

  // If there's no decimal point, return as-is
  const dotIndex = offset.indexOf('.');
  if (dotIndex === -1) {
    return offset;
  }

  // Get the fractional part
  const fractionalPart = offset.slice(dotIndex + 1);

  // If fractional part is all zeros, remove it entirely
  if (/^0+$/.test(fractionalPart)) {
    return offset.slice(0, dotIndex);
  }

  // Otherwise, trim to 3 decimal places (milliseconds) for consistency
  // and remove trailing zeros
  const trimmedFraction = fractionalPart.slice(0, 3).replace(/0+$/, '');
  if (trimmedFraction === '') {
    return offset.slice(0, dotIndex);
  }
  return `${offset.slice(0, dotIndex)}.${trimmedFraction}`;
}

/**
 * Convert a raw GraphQL activity response to a ComparisonActivity
 */
export function rawToComparisonActivity(activity: ComparisonActivityRaw): ComparisonActivity {
  return {
    anchor_id: activity.anchor_id,
    anchored_to_start: activity.anchored_to_start,
    arguments: activity.arguments,
    id: activity.id,
    metadata: activity.metadata,
    name: activity.name,
    start_offset: normalizeStartOffset(activity.start_offset),
    tags: activity.tags.map(t => t.tag),
    type: activity.type,
  };
}
