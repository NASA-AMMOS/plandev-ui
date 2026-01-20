import type { ActivityDirectiveId } from '../types/activity';
import type {
  ActivityComparisonResult,
  ActivityMatch,
  AnchorTree,
  ComparisonActivity,
  ComparisonOptions,
  MatchConfidence,
  MatchType,
  PlanComparisonSummary,
} from '../types/plan-comparison';
import { changedKeys } from './generic';

// Default thresholds for fuzzy matching
const DEFAULT_FUZZY_HIGH_THRESHOLD = 0.85;
const DEFAULT_FUZZY_LOW_THRESHOLD = 0.65;

/**
 * Jaro-Winkler string similarity algorithm
 * Returns a score between 0 (no similarity) and 1 (exact match)
 * Gives more weight to strings that match from the beginning
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) {return 1;}
  if (s1.length === 0 || s2.length === 0) {return 0;}

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) {continue;}
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) {return 0;}

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) {continue;}
    while (!s2Matches[k]) {k++;}
    if (s1[i] !== s2[k]) {transpositions++;}
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification - boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) {prefix++;}
    else {break;}
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate time proximity between two start_offset values
 * Returns a score between 0 (very different) and 1 (identical)
 * @param offset1 - First offset (ISO 8601 duration string)
 * @param offset2 - Second offset (ISO 8601 duration string)
 * @param planDurationMs - Plan duration in milliseconds for normalization
 */
export function timeProximity(offset1: string, offset2: string, planDurationMs: number): number {
  if (offset1 === offset2) {return 1;}

  const ms1 = parseOffsetToMs(offset1);
  const ms2 = parseOffsetToMs(offset2);

  if (ms1 === null || ms2 === null) {return 0;}

  const diff = Math.abs(ms1 - ms2);
  // Normalize by plan duration, cap at 1 hour for reasonable comparison
  const maxDiff = Math.min(planDurationMs, 3600000); // 1 hour max
  return Math.max(0, 1 - diff / maxDiff);
}

/**
 * Parse a PostgreSQL interval string to milliseconds
 * Handles formats like '01:30:00', '-00:15:00', '1 day 02:00:00'
 */
export function parseOffsetToMs(offset: string): number | null {
  if (!offset) {return null;}

  try {
    // Handle negative offsets
    const isNegative = offset.startsWith('-');
    const cleanOffset = isNegative ? offset.slice(1) : offset;

    // Try to parse as HH:MM:SS or HH:MM:SS.mmm
    const timeMatch = cleanOffset.match(/^(\d+):(\d+):(\d+)(?:\.(\d+))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseInt(timeMatch[3], 10);
      const millis = timeMatch[4] ? parseInt(timeMatch[4].padEnd(3, '0').slice(0, 3), 10) : 0;
      const ms = (hours * 3600 + minutes * 60 + seconds) * 1000 + millis;
      return isNegative ? -ms : ms;
    }

    // Handle more complex formats with days
    const dayMatch = cleanOffset.match(/^(\d+)\s*days?\s*(\d+):(\d+):(\d+)(?:\.(\d+))?$/i);
    if (dayMatch) {
      const days = parseInt(dayMatch[1], 10);
      const hours = parseInt(dayMatch[2], 10);
      const minutes = parseInt(dayMatch[3], 10);
      const seconds = parseInt(dayMatch[4], 10);
      const millis = dayMatch[5] ? parseInt(dayMatch[5].padEnd(3, '0').slice(0, 3), 10) : 0;
      const ms = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000 + millis;
      return isNegative ? -ms : ms;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate similarity between two argument objects
 * Returns a score between 0 (completely different) and 1 (identical)
 */
export function argumentSimilarity(args1: Record<string, unknown>, args2: Record<string, unknown>): number {
  const keys1 = Object.keys(args1);
  const keys2 = Object.keys(args2);
  const allKeys = new Set([...keys1, ...keys2]);

  if (allKeys.size === 0) {return 1;}

  let matchingKeys = 0;
  for (const key of allKeys) {
    if (JSON.stringify(args1[key]) === JSON.stringify(args2[key])) {
      matchingKeys++;
    }
  }

  return matchingKeys / allKeys.size;
}

/**
 * Compute a weighted match score between two activities
 */
export function computeMatchScore(
  a1: ComparisonActivity,
  a2: ComparisonActivity,
  planDurationMs: number,
): { changedFields: string[]; score: number } {
  // Type must match for any comparison
  if (a1.type !== a2.type) {
    return { changedFields: [], score: 0 };
  }

  const nameSimilarity = jaroWinkler(a1.name, a2.name);
  const timeSimilarity = timeProximity(a1.start_offset, a2.start_offset, planDurationMs);
  const argSimilarity = argumentSimilarity(a1.arguments, a2.arguments);

  // Weighted score: name is most important, then time, then args
  const score = nameSimilarity * 0.5 + timeSimilarity * 0.3 + argSimilarity * 0.2;

  // Compute changed fields
  const changedFields = getChangedFields(a1, a2);

  return { changedFields, score };
}

/**
 * Get list of fields that differ between two activities
 * Note: We ignore 'anchor_id' because activity IDs are auto-generated per-plan
 * and won't match across different plans. The anchor chain structure is already
 * handled by the matching algorithm (Stage 3: Anchor Chain Propagation).
 */
export function getChangedFields(a1: ComparisonActivity, a2: ComparisonActivity): string[] {
  // Ignore id and anchor_id since these are plan-specific identifiers
  // Arguments, metadata, and tags are handled separately below
  const ignoreKeys: (keyof ComparisonActivity)[] = ['id', 'anchor_id', 'arguments', 'metadata', 'tags'];

  const baseChanges = changedKeys(a1, a2, ignoreKeys);
  const argChanges = changedKeys(a1.arguments, a2.arguments).map(k => `arguments.${k}`);
  const metaChanges = changedKeys(a1.metadata, a2.metadata).map(k => `metadata.${k}`);

  // Compare tags
  const tags1 = new Set(a1.tags.map(t => t.id));
  const tags2 = new Set(a2.tags.map(t => t.id));
  const tagsChanged = tags1.size !== tags2.size || [...tags1].some(id => !tags2.has(id));

  return [...baseChanges, ...argChanges, ...metaChanges, ...(tagsChanged ? ['tags'] : [])];
}

/**
 * Get confidence level from numeric score
 */
export function getConfidenceLevel(score: number, highThreshold: number, lowThreshold: number): MatchConfidence {
  if (score >= 1) {return 'exact';}
  if (score >= highThreshold) {return 'high';}
  if (score >= lowThreshold) {return 'medium';}
  return 'low';
}

/**
 * Build an anchor tree for efficient parent→children lookups
 */
export function buildAnchorTree(activities: ComparisonActivity[]): AnchorTree {
  const tree: AnchorTree = new Map();

  // Initialize with null (root level)
  tree.set(null, []);

  for (const activity of activities) {
    const parentId = activity.anchor_id;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(activity);
  }

  return tree;
}

/**
 * Get root activities (not anchored to another activity)
 */
export function getRootActivities(activities: ComparisonActivity[]): ComparisonActivity[] {
  return activities.filter(a => a.anchor_id === null);
}

/**
 * Get children of a parent activity from the anchor tree
 */
export function getChildrenOf(parentId: ActivityDirectiveId, tree: AnchorTree): ComparisonActivity[] {
  return tree.get(parentId) || [];
}

// ============================================================================
// Multi-Stage Matching Algorithm
// ============================================================================

/**
 * Stage 1: Exact matching
 * Match activities where type, name, AND start_offset are identical
 */
function exactMatch(
  leftActivities: ComparisonActivity[],
  rightActivities: ComparisonActivity[],
): { matched: ActivityMatch[]; unmatchedLeft: ComparisonActivity[]; unmatchedRight: ComparisonActivity[] } {
  const matched: ActivityMatch[] = [];
  const unmatchedLeft: ComparisonActivity[] = [];
  const rightByKey = new Map<string, ComparisonActivity[]>();

  // Build lookup by (type, name, start_offset)
  for (const activity of rightActivities) {
    const key = `${activity.type}|||${activity.name}|||${activity.start_offset}`;
    if (!rightByKey.has(key)) {
      rightByKey.set(key, []);
    }
    rightByKey.get(key)!.push(activity);
  }

  const matchedRightIds = new Set<ActivityDirectiveId>();

  for (const leftActivity of leftActivities) {
    const key = `${leftActivity.type}|||${leftActivity.name}|||${leftActivity.start_offset}`;
    const candidates = rightByKey.get(key) || [];
    const availableCandidates = candidates.filter(c => !matchedRightIds.has(c.id));

    if (availableCandidates.length === 0) {
      unmatchedLeft.push(leftActivity);
      continue;
    }

    // Find the best matching candidate - prefer one with identical arguments
    let bestCandidate = availableCandidates[0];
    let bestChangedFields = getChangedFields(leftActivity, bestCandidate);

    for (const candidate of availableCandidates) {
      const changedFields = getChangedFields(leftActivity, candidate);
      // Prefer candidates with fewer differences
      if (changedFields.length < bestChangedFields.length) {
        bestCandidate = candidate;
        bestChangedFields = changedFields;
      }
      // If we found a perfect match (no changes), use it immediately
      if (changedFields.length === 0) {
        break;
      }
    }

    matchedRightIds.add(bestCandidate.id);
    matched.push({
      changedFields: bestChangedFields,
      confidence: 1,
      confidenceLevel: 'exact',
      leftActivity,
      matchType: bestChangedFields.length > 0 ? 'modified' : 'exact',
      rightActivity: bestCandidate,
    });
  }

  const unmatchedRight = rightActivities.filter(a => !matchedRightIds.has(a.id));

  return { matched, unmatchedLeft, unmatchedRight };
}

/**
 * Stage 2: Unique anchor matching (Patience algorithm)
 * Match activities that appear exactly once in each plan by (type, name)
 */
function uniqueAnchorMatch(
  leftActivities: ComparisonActivity[],
  rightActivities: ComparisonActivity[],
  _planDurationMs: number,
): { matched: ActivityMatch[]; unmatchedLeft: ComparisonActivity[]; unmatchedRight: ComparisonActivity[] } {
  const matched: ActivityMatch[] = [];

  // Count occurrences by (type, name) in each plan
  const leftCounts = new Map<string, ComparisonActivity[]>();
  const rightCounts = new Map<string, ComparisonActivity[]>();

  for (const activity of leftActivities) {
    const key = `${activity.type}|||${activity.name}`;
    if (!leftCounts.has(key)) {
      leftCounts.set(key, []);
    }
    leftCounts.get(key)!.push(activity);
  }

  for (const activity of rightActivities) {
    const key = `${activity.type}|||${activity.name}`;
    if (!rightCounts.has(key)) {
      rightCounts.set(key, []);
    }
    rightCounts.get(key)!.push(activity);
  }

  const matchedLeftIds = new Set<ActivityDirectiveId>();
  const matchedRightIds = new Set<ActivityDirectiveId>();

  // Find unique anchors - activities with same (type, name) appearing exactly once in each plan
  for (const [key, leftList] of leftCounts) {
    const rightList = rightCounts.get(key);
    if (leftList.length === 1 && rightList?.length === 1) {
      const leftActivity = leftList[0];
      const rightActivity = rightList[0];

      matchedLeftIds.add(leftActivity.id);
      matchedRightIds.add(rightActivity.id);

      const changedFields = getChangedFields(leftActivity, rightActivity);
      const isMoved = leftActivity.start_offset !== rightActivity.start_offset;

      let matchType: MatchType = 'exact';
      if (isMoved && changedFields.length > 1) {
        matchType = 'modified';
      } else if (isMoved) {
        matchType = 'moved';
      } else if (changedFields.length > 0) {
        matchType = 'modified';
      }

      matched.push({
        changedFields,
        confidence: isMoved ? 0.95 : 1,
        confidenceLevel: isMoved ? 'high' : 'exact',
        leftActivity,
        matchType,
        rightActivity,
      });
    }
  }

  const unmatchedLeft = leftActivities.filter(a => !matchedLeftIds.has(a.id));
  const unmatchedRight = rightActivities.filter(a => !matchedRightIds.has(a.id));

  return { matched, unmatchedLeft, unmatchedRight };
}

/**
 * Stage 3: Anchor chain propagation
 * For matched parents, match their children by (type, name) and relative offset
 */
function propagateAnchorChains(
  parentMatches: ActivityMatch[],
  leftTree: AnchorTree,
  rightTree: AnchorTree,
  planDurationMs: number,
): ActivityMatch[] {
  const additionalMatches: ActivityMatch[] = [];

  for (const parentMatch of parentMatches) {
    const leftChildren = getChildrenOf(parentMatch.leftActivity.id, leftTree);
    const rightChildren = getChildrenOf(parentMatch.rightActivity.id, rightTree);

    if (leftChildren.length === 0 && rightChildren.length === 0) {continue;}

    // Match children by (type, name) - within the matched parent context
    const rightChildByKey = new Map<string, ComparisonActivity[]>();
    for (const child of rightChildren) {
      const key = `${child.type}|||${child.name}`;
      if (!rightChildByKey.has(key)) {
        rightChildByKey.set(key, []);
      }
      rightChildByKey.get(key)!.push(child);
    }

    const matchedRightChildIds = new Set<ActivityDirectiveId>();

    for (const leftChild of leftChildren) {
      const key = `${leftChild.type}|||${leftChild.name}`;
      const candidates = rightChildByKey.get(key) || [];

      // Find best match among unmatched candidates
      let bestMatch: { activity: ComparisonActivity; score: number } | null = null;
      for (const candidate of candidates) {
        if (matchedRightChildIds.has(candidate.id)) {continue;}

        // Prefer same offset
        if (leftChild.start_offset === candidate.start_offset) {
          bestMatch = { activity: candidate, score: 1 };
          break;
        }

        // Otherwise use proximity
        const { score } = computeMatchScore(leftChild, candidate, planDurationMs);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { activity: candidate, score };
        }
      }

      if (bestMatch && bestMatch.score >= 0.5) {
        matchedRightChildIds.add(bestMatch.activity.id);
        const changedFields = getChangedFields(leftChild, bestMatch.activity);
        const isMoved = leftChild.start_offset !== bestMatch.activity.start_offset;

        additionalMatches.push({
          changedFields,
          confidence: bestMatch.score,
          confidenceLevel: getConfidenceLevel(bestMatch.score, DEFAULT_FUZZY_HIGH_THRESHOLD, DEFAULT_FUZZY_LOW_THRESHOLD),
          leftActivity: leftChild,
          matchType: isMoved ? 'moved' : changedFields.length > 0 ? 'modified' : 'exact',
          rightActivity: bestMatch.activity,
        });

        // Recursively match grandchildren
        const grandchildMatches = propagateAnchorChains(
          [
            {
              changedFields,
              confidence: bestMatch.score,
              confidenceLevel: 'high',
              leftActivity: leftChild,
              matchType: 'exact',
              rightActivity: bestMatch.activity,
            },
          ],
          leftTree,
          rightTree,
          planDurationMs,
        );
        additionalMatches.push(...grandchildMatches);
      }
    }
  }

  return additionalMatches;
}

/**
 * Stage 4: Fuzzy matching
 * For remaining unmatched activities, use fuzzy scoring
 */
function fuzzyMatch(
  leftActivities: ComparisonActivity[],
  rightActivities: ComparisonActivity[],
  planDurationMs: number,
  highThreshold: number,
  lowThreshold: number,
): { matched: ActivityMatch[]; unmatchedLeft: ComparisonActivity[]; unmatchedRight: ComparisonActivity[] } {
  const matched: ActivityMatch[] = [];
  const matchedLeftIds = new Set<ActivityDirectiveId>();
  const matchedRightIds = new Set<ActivityDirectiveId>();

  // Group by type for efficiency
  const rightByType = new Map<string, ComparisonActivity[]>();
  for (const activity of rightActivities) {
    if (!rightByType.has(activity.type)) {
      rightByType.set(activity.type, []);
    }
    rightByType.get(activity.type)!.push(activity);
  }

  // For each left activity, find best matching right activity
  for (const leftActivity of leftActivities) {
    const candidates = rightByType.get(leftActivity.type) || [];
    let bestMatch: { activity: ComparisonActivity; changedFields: string[]; score: number } | null = null;

    for (const candidate of candidates) {
      if (matchedRightIds.has(candidate.id)) {continue;}

      const { changedFields, score } = computeMatchScore(leftActivity, candidate, planDurationMs);
      if (score >= lowThreshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { activity: candidate, changedFields, score };
      }
    }

    if (bestMatch) {
      matchedLeftIds.add(leftActivity.id);
      matchedRightIds.add(bestMatch.activity.id);

      const confidenceLevel = getConfidenceLevel(bestMatch.score, highThreshold, lowThreshold);
      const matchType: MatchType = confidenceLevel === 'medium' ? 'ambiguous' : 'fuzzy';

      matched.push({
        changedFields: bestMatch.changedFields,
        confidence: bestMatch.score,
        confidenceLevel,
        leftActivity,
        matchType,
        rightActivity: bestMatch.activity,
      });
    }
  }

  const unmatchedLeft = leftActivities.filter(a => !matchedLeftIds.has(a.id));
  const unmatchedRight = rightActivities.filter(a => !matchedRightIds.has(a.id));

  return { matched, unmatchedLeft, unmatchedRight };
}

// ============================================================================
// Main Comparison Functions
// ============================================================================

/**
 * Match activities by ID (for snapshot comparisons)
 */
export function matchActivitiesById(
  leftActivities: ComparisonActivity[],
  rightActivities: ComparisonActivity[],
): ActivityComparisonResult[] {
  const results: ActivityComparisonResult[] = [];
  const rightById = new Map(rightActivities.map(a => [a.id, a]));
  const matchedRightIds = new Set<ActivityDirectiveId>();

  for (const leftActivity of leftActivities) {
    const rightActivity = rightById.get(leftActivity.id);

    if (rightActivity) {
      matchedRightIds.add(rightActivity.id);
      const changedFields = getChangedFields(leftActivity, rightActivity);

      results.push({
        changeType: 'matched',
        changedFields,
        confidence: 1,
        confidenceLevel: 'exact',
        leftActivity,
        matchType: changedFields.length > 0 ? 'modified' : 'exact',
        rightActivity,
      });
    } else {
      results.push({
        activity: leftActivity,
        changeType: 'deleted',
      });
    }
  }

  // Add activities that exist only in right
  for (const rightActivity of rightActivities) {
    if (!matchedRightIds.has(rightActivity.id)) {
      results.push({
        activity: rightActivity,
        changeType: 'added',
      });
    }
  }

  return results;
}

/**
 * Match activities by content using multi-stage algorithm
 * Used for plan vs plan comparisons where IDs don't match
 */
export function matchActivitiesByContent(
  leftActivities: ComparisonActivity[],
  rightActivities: ComparisonActivity[],
  planDurationMs: number = 86400000, // Default 24 hours
  options: Partial<ComparisonOptions> = {},
): ActivityComparisonResult[] {
  const highThreshold = options.fuzzyHighThreshold ?? DEFAULT_FUZZY_HIGH_THRESHOLD;
  const lowThreshold = options.fuzzyLowThreshold ?? DEFAULT_FUZZY_LOW_THRESHOLD;
  const includeUnchanged = options.includeUnchanged ?? true;

  const results: ActivityComparisonResult[] = [];
  const allMatches: ActivityMatch[] = [];

  // Build anchor trees for chain propagation
  const leftTree = buildAnchorTree(leftActivities);
  const rightTree = buildAnchorTree(rightActivities);

  // Get root activities for initial matching
  const leftRoots = getRootActivities(leftActivities);
  const rightRoots = getRootActivities(rightActivities);

  // Stage 1: Exact matching (roots only)
  const stage1 = exactMatch(leftRoots, rightRoots);
  allMatches.push(...stage1.matched);

  // Stage 2: Unique anchor matching
  const stage2 = uniqueAnchorMatch(stage1.unmatchedLeft, stage1.unmatchedRight, planDurationMs);
  allMatches.push(...stage2.matched);

  // Stage 3: Anchor chain propagation
  const rootMatches = [...stage1.matched, ...stage2.matched];
  const chainMatches = propagateAnchorChains(rootMatches, leftTree, rightTree, planDurationMs);
  allMatches.push(...chainMatches);

  // Collect all matched IDs
  const matchedLeftIds = new Set(allMatches.map(m => m.leftActivity.id));
  const matchedRightIds = new Set(allMatches.map(m => m.rightActivity.id));

  // Stage 4: Fuzzy matching for remaining unmatched
  const remainingLeft = leftActivities.filter(a => !matchedLeftIds.has(a.id));
  const remainingRight = rightActivities.filter(a => !matchedRightIds.has(a.id));
  const stage4 = fuzzyMatch(remainingLeft, remainingRight, planDurationMs, highThreshold, lowThreshold);
  allMatches.push(...stage4.matched);

  // Convert matches to results
  for (const match of allMatches) {
    if (!includeUnchanged && match.matchType === 'exact' && match.changedFields.length === 0) {
      continue;
    }
    results.push({
      changeType: 'matched',
      changedFields: match.changedFields,
      confidence: match.confidence,
      confidenceLevel: match.confidenceLevel,
      leftActivity: match.leftActivity,
      matchType: match.matchType,
      rightActivity: match.rightActivity,
    });
  }

  // Add deleted activities
  for (const activity of stage4.unmatchedLeft) {
    results.push({
      activity,
      changeType: 'deleted',
    });
  }

  // Add added activities
  for (const activity of stage4.unmatchedRight) {
    results.push({
      activity,
      changeType: 'added',
    });
  }

  return results;
}

/**
 * Compute summary statistics from comparison results
 */
export function computeComparisonSummary(results: ActivityComparisonResult[]): PlanComparisonSummary {
  const summary: PlanComparisonSummary = {
    added: 0,
    deleted: 0,
    matched: {
      ambiguous: 0,
      exact: 0,
      fuzzy: 0,
      modified: 0,
      moved: 0,
      total: 0,
      unchanged: 0,
    },
    modified: 0,
    total: results.length,
  };

  for (const result of results) {
    if (result.changeType === 'added') {
      summary.added++;
    } else if (result.changeType === 'deleted') {
      summary.deleted++;
    } else if (result.changeType === 'matched') {
      summary.matched.total++;

      if (result.changedFields.length === 0) {
        summary.matched.unchanged++;
        summary.matched.exact++;
      } else {
        summary.modified++;
        switch (result.matchType) {
          case 'exact':
          case 'modified':
            summary.matched.modified++;
            break;
          case 'moved':
            summary.matched.moved++;
            break;
          case 'fuzzy':
            summary.matched.fuzzy++;
            break;
          case 'ambiguous':
            summary.matched.ambiguous++;
            break;
        }
      }
    }
  }

  return summary;
}

/**
 * Main comparison function
 */
export function compareActivities(
  leftActivities: ComparisonActivity[],
  rightActivities: ComparisonActivity[],
  options: ComparisonOptions,
  planDurationMs?: number,
): { results: ActivityComparisonResult[]; summary: PlanComparisonSummary } {
  let results: ActivityComparisonResult[];

  if (options.strategy === 'id') {
    results = matchActivitiesById(leftActivities, rightActivities);
  } else {
    results = matchActivitiesByContent(leftActivities, rightActivities, planDurationMs, options);
  }

  const summary = computeComparisonSummary(results);

  return { results, summary };
}
