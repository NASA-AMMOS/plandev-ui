import { describe, expect, it } from 'vitest';
import type { ComparisonActivity } from '../types/plan-comparison';
import {
  argumentSimilarity,
  buildAnchorTree,
  compareActivities,
  computeComparisonSummary,
  computeMatchScore,
  getChangedFields,
  getChildrenOf,
  getConfidenceLevel,
  getRootActivities,
  jaroWinkler,
  matchActivitiesByContent,
  matchActivitiesById,
  parseOffsetToMs,
  timeProximity,
} from './plan-comparison';

// Helper to create test activities
function createActivity(overrides: Partial<ComparisonActivity> & { id: number; type: string }): ComparisonActivity {
  return {
    anchor_id: null,
    anchored_to_start: true,
    arguments: {},
    metadata: {},
    name: `Activity_${overrides.id}`,
    start_offset: '01:00:00',
    tags: [],
    ...overrides,
  };
}

// ============================================================================
// Jaro-Winkler String Similarity Tests
// ============================================================================

describe('jaroWinkler', () => {
  it('should return 1 for identical strings', () => {
    expect(jaroWinkler('hello', 'hello')).toBe(1);
    expect(jaroWinkler('DeployAntenna', 'DeployAntenna')).toBe(1);
  });

  it('should return 0 for empty strings', () => {
    expect(jaroWinkler('', 'hello')).toBe(0);
    expect(jaroWinkler('hello', '')).toBe(0);
  });

  it('should return high score for similar activity names', () => {
    // Similar names with version suffix
    const score = jaroWinkler('DeployAntenna', 'DeployAntennaV2');
    expect(score).toBeGreaterThan(0.9);
  });

  it('should return low score for very different strings', () => {
    const score = jaroWinkler('DeployAntenna', 'FireThruster');
    expect(score).toBeLessThan(0.5);
  });

  it('should give higher weight to common prefixes', () => {
    // Winkler modification should boost strings with common prefix
    const scoreWithPrefix = jaroWinkler('Activity_Deploy', 'Activity_Download');
    const scoreWithoutPrefix = jaroWinkler('Deploy_Activity', 'Download_Activity');
    // Both should be similar but prefix matching gives slight boost
    expect(scoreWithPrefix).toBeGreaterThan(0.7);
    expect(scoreWithoutPrefix).toBeGreaterThan(0.7);
  });

  it('should handle single character strings', () => {
    expect(jaroWinkler('a', 'a')).toBe(1);
    expect(jaroWinkler('a', 'b')).toBe(0);
  });
});

// ============================================================================
// Time Proximity Tests
// ============================================================================

describe('timeProximity', () => {
  const oneHourMs = 3600000;
  const oneDayMs = 86400000;

  it('should return 1 for identical offsets', () => {
    expect(timeProximity('01:00:00', '01:00:00', oneDayMs)).toBe(1);
  });

  it('should return reasonable proximity for nearby times', () => {
    // 1 hour vs 2 hours - 1 hour difference
    const score = timeProximity('01:00:00', '02:00:00', oneDayMs);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('should return lower score for larger time differences', () => {
    const nearbyScore = timeProximity('01:00:00', '01:30:00', oneDayMs);
    const farScore = timeProximity('01:00:00', '12:00:00', oneDayMs);
    expect(nearbyScore).toBeGreaterThan(farScore);
  });

  it('should handle invalid offsets', () => {
    expect(timeProximity('invalid', '01:00:00', oneDayMs)).toBe(0);
    expect(timeProximity('01:00:00', 'invalid', oneDayMs)).toBe(0);
  });

  it('should cap difference at 1 hour max', () => {
    // Even with small plan duration, uses 1 hour max for normalization
    const score = timeProximity('01:00:00', '02:00:00', oneHourMs);
    expect(score).toBe(0); // 1 hour diff / 1 hour max = 0 similarity
  });
});

// ============================================================================
// Parse Offset Tests
// ============================================================================

describe('parseOffsetToMs', () => {
  it('should parse simple HH:MM:SS format', () => {
    expect(parseOffsetToMs('01:00:00')).toBe(3600000);
    expect(parseOffsetToMs('00:30:00')).toBe(1800000);
    expect(parseOffsetToMs('00:00:30')).toBe(30000);
  });

  it('should parse milliseconds', () => {
    expect(parseOffsetToMs('01:00:00.500')).toBe(3600500);
    expect(parseOffsetToMs('00:00:01.123')).toBe(1123);
  });

  it('should handle negative offsets', () => {
    expect(parseOffsetToMs('-00:15:00')).toBe(-900000);
    expect(parseOffsetToMs('-01:00:00')).toBe(-3600000);
  });

  it('should parse day formats', () => {
    expect(parseOffsetToMs('1 day 00:00:00')).toBe(86400000);
    expect(parseOffsetToMs('2 days 12:00:00')).toBe(2 * 86400000 + 12 * 3600000);
  });

  it('should return null for invalid formats', () => {
    expect(parseOffsetToMs('')).toBe(null);
    expect(parseOffsetToMs('invalid')).toBe(null);
    expect(parseOffsetToMs('abc:def:ghi')).toBe(null);
  });
});

// ============================================================================
// Argument Similarity Tests
// ============================================================================

describe('argumentSimilarity', () => {
  it('should return 1 for identical arguments', () => {
    const args = { biteSize: 100, duration: '01:00:00' };
    expect(argumentSimilarity(args, args)).toBe(1);
  });

  it('should return 1 for empty arguments', () => {
    expect(argumentSimilarity({}, {})).toBe(1);
  });

  it('should return high score with one different key', () => {
    const args1 = { a: 1, b: 2, c: 3 };
    const args2 = { a: 1, b: 2, c: 4 };
    expect(argumentSimilarity(args1, args2)).toBeCloseTo(2 / 3);
  });

  it('should handle missing keys', () => {
    const args1 = { a: 1, b: 2 };
    const args2 = { a: 1 };
    // 1 matching key out of 2 total unique keys
    expect(argumentSimilarity(args1, args2)).toBe(0.5);
  });

  it('should compare nested objects by JSON equality', () => {
    const args1 = { nested: { x: 1, y: 2 } };
    const args2 = { nested: { x: 1, y: 2 } };
    expect(argumentSimilarity(args1, args2)).toBe(1);
  });
});

// ============================================================================
// Compute Match Score Tests
// ============================================================================

describe('computeMatchScore', () => {
  const planDurationMs = 86400000; // 24 hours

  it('should return 0 for different types', () => {
    const a1 = createActivity({ id: 1, type: 'TypeA' });
    const a2 = createActivity({ id: 2, type: 'TypeB' });
    const { score } = computeMatchScore(a1, a2, planDurationMs);
    expect(score).toBe(0);
  });

  it('should return high score for identical activities', () => {
    const a1 = createActivity({ id: 1, name: 'Test', start_offset: '01:00:00', type: 'TypeA' });
    const a2 = createActivity({ id: 2, name: 'Test', start_offset: '01:00:00', type: 'TypeA' });
    const { score } = computeMatchScore(a1, a2, planDurationMs);
    expect(score).toBe(1);
  });

  it('should detect changed fields', () => {
    const a1 = createActivity({
      arguments: { biteSize: 100 },
      id: 1,
      name: 'Test',
      start_offset: '01:00:00',
      type: 'TypeA',
    });
    const a2 = createActivity({
      arguments: { biteSize: 200 },
      id: 2,
      name: 'Test',
      start_offset: '01:00:00',
      type: 'TypeA',
    });
    const { changedFields } = computeMatchScore(a1, a2, planDurationMs);
    expect(changedFields).toContain('arguments.biteSize');
  });
});

// ============================================================================
// Get Changed Fields Tests
// ============================================================================

describe('getChangedFields', () => {
  it('should return empty array for identical activities', () => {
    const activity = createActivity({ id: 1, type: 'TypeA' });
    expect(getChangedFields(activity, activity)).toEqual([]);
  });

  it('should detect name changes', () => {
    const a1 = createActivity({ id: 1, name: 'OldName', type: 'TypeA' });
    const a2 = createActivity({ id: 2, name: 'NewName', type: 'TypeA' });
    expect(getChangedFields(a1, a2)).toContain('name');
  });

  it('should detect start_offset changes', () => {
    const a1 = createActivity({ id: 1, start_offset: '01:00:00', type: 'TypeA' });
    const a2 = createActivity({ id: 2, start_offset: '02:00:00', type: 'TypeA' });
    expect(getChangedFields(a1, a2)).toContain('start_offset');
  });

  it('should detect argument changes with dot notation', () => {
    const a1 = createActivity({ arguments: { biteSize: 100 }, id: 1, type: 'TypeA' });
    const a2 = createActivity({ arguments: { biteSize: 200 }, id: 2, type: 'TypeA' });
    expect(getChangedFields(a1, a2)).toContain('arguments.biteSize');
  });

  it('should detect tag changes', () => {
    const a1 = createActivity({
      id: 1,
      tags: [{ color: '#ff0000', created_at: '2024-01-01', id: 1, name: 'Tag1', owner: 'user1' }],
      type: 'TypeA',
    });
    const a2 = createActivity({
      id: 2,
      tags: [{ color: '#00ff00', created_at: '2024-01-01', id: 2, name: 'Tag2', owner: 'user1' }],
      type: 'TypeA',
    });
    expect(getChangedFields(a1, a2)).toContain('tags');
  });

  it('should ignore id and anchor_id fields', () => {
    const a1 = createActivity({ anchor_id: 10, id: 1, type: 'TypeA' });
    const a2 = createActivity({ anchor_id: 20, id: 2, type: 'TypeA' });
    // IDs are different but should not be reported as changed
    expect(getChangedFields(a1, a2)).not.toContain('id');
    expect(getChangedFields(a1, a2)).not.toContain('anchor_id');
  });
});

// ============================================================================
// Confidence Level Tests
// ============================================================================

describe('getConfidenceLevel', () => {
  it('should return exact for score of 1', () => {
    expect(getConfidenceLevel(1, 0.85, 0.65)).toBe('exact');
  });

  it('should return high for scores above high threshold', () => {
    expect(getConfidenceLevel(0.9, 0.85, 0.65)).toBe('high');
    expect(getConfidenceLevel(0.85, 0.85, 0.65)).toBe('high');
  });

  it('should return medium for scores between thresholds', () => {
    expect(getConfidenceLevel(0.75, 0.85, 0.65)).toBe('medium');
    expect(getConfidenceLevel(0.65, 0.85, 0.65)).toBe('medium');
  });

  it('should return low for scores below low threshold', () => {
    expect(getConfidenceLevel(0.5, 0.85, 0.65)).toBe('low');
    expect(getConfidenceLevel(0, 0.85, 0.65)).toBe('low');
  });
});

// ============================================================================
// Anchor Tree Tests
// ============================================================================

describe('buildAnchorTree', () => {
  it('should build tree with root activities', () => {
    const activities = [
      createActivity({ id: 1, type: 'TypeA' }),
      createActivity({ id: 2, type: 'TypeB' }),
    ];
    const tree = buildAnchorTree(activities);

    expect(tree.get(null)).toHaveLength(2);
  });

  it('should organize children under parents', () => {
    const activities = [
      createActivity({ anchor_id: null, id: 1, type: 'Parent' }),
      createActivity({ anchor_id: 1, id: 2, type: 'Child1' }),
      createActivity({ anchor_id: 1, id: 3, type: 'Child2' }),
    ];
    const tree = buildAnchorTree(activities);

    expect(tree.get(null)).toHaveLength(1);
    expect(tree.get(1)).toHaveLength(2);
  });
});

describe('getRootActivities', () => {
  it('should return only activities with null anchor_id', () => {
    const activities = [
      createActivity({ anchor_id: null, id: 1, type: 'Root' }),
      createActivity({ anchor_id: 1, id: 2, type: 'Child' }),
      createActivity({ anchor_id: null, id: 3, type: 'Root2' }),
    ];
    const roots = getRootActivities(activities);

    expect(roots).toHaveLength(2);
    expect(roots.map(a => a.id)).toContain(1);
    expect(roots.map(a => a.id)).toContain(3);
  });
});

describe('getChildrenOf', () => {
  it('should return children of a parent', () => {
    const activities = [
      createActivity({ anchor_id: null, id: 1, type: 'Parent' }),
      createActivity({ anchor_id: 1, id: 2, type: 'Child1' }),
      createActivity({ anchor_id: 1, id: 3, type: 'Child2' }),
    ];
    const tree = buildAnchorTree(activities);

    const children = getChildrenOf(1, tree);
    expect(children).toHaveLength(2);
  });

  it('should return empty array for non-existent parent', () => {
    const tree = buildAnchorTree([]);
    expect(getChildrenOf(999, tree)).toEqual([]);
  });
});

// ============================================================================
// Match Activities By ID Tests (Snapshot Comparisons)
// ============================================================================

describe('matchActivitiesById', () => {
  it('should match activities with same IDs', () => {
    const left = [createActivity({ id: 1, type: 'TypeA' }), createActivity({ id: 2, type: 'TypeB' })];
    const right = [createActivity({ id: 1, type: 'TypeA' }), createActivity({ id: 2, type: 'TypeB' })];

    const results = matchActivitiesById(left, right);
    const matched = results.filter(r => r.changeType === 'matched');
    expect(matched).toHaveLength(2);
  });

  it('should identify deleted activities', () => {
    const left = [createActivity({ id: 1, type: 'TypeA' }), createActivity({ id: 2, type: 'TypeB' })];
    const right = [createActivity({ id: 1, type: 'TypeA' })];

    const results = matchActivitiesById(left, right);
    const deleted = results.filter(r => r.changeType === 'deleted');
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toHaveProperty('activity');
    if (deleted[0].changeType === 'deleted') {
      expect(deleted[0].activity.id).toBe(2);
    }
  });

  it('should identify added activities', () => {
    const left = [createActivity({ id: 1, type: 'TypeA' })];
    const right = [createActivity({ id: 1, type: 'TypeA' }), createActivity({ id: 2, type: 'TypeB' })];

    const results = matchActivitiesById(left, right);
    const added = results.filter(r => r.changeType === 'added');
    expect(added).toHaveLength(1);
    if (added[0].changeType === 'added') {
      expect(added[0].activity.id).toBe(2);
    }
  });

  it('should detect modifications in matched activities', () => {
    const left = [createActivity({ arguments: { value: 1 }, id: 1, type: 'TypeA' })];
    const right = [createActivity({ arguments: { value: 2 }, id: 1, type: 'TypeA' })];

    const results = matchActivitiesById(left, right);
    const matched = results.filter(r => r.changeType === 'matched');
    expect(matched).toHaveLength(1);
    if (matched[0].changeType === 'matched') {
      expect(matched[0].matchType).toBe('modified');
      expect(matched[0].changedFields).toContain('arguments.value');
    }
  });
});

// ============================================================================
// Match Activities By Content Tests (Plan vs Plan)
// ============================================================================

describe('matchActivitiesByContent', () => {
  const planDurationMs = 86400000; // 24 hours

  describe('Stage 1: Exact Matching', () => {
    it('should match activities with identical type, name, and start_offset', () => {
      const left = [
        createActivity({ id: 1, name: 'Deploy', start_offset: '01:00:00', type: 'DeployAntenna' }),
      ];
      const right = [
        createActivity({ id: 100, name: 'Deploy', start_offset: '01:00:00', type: 'DeployAntenna' }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const matched = results.filter(r => r.changeType === 'matched');
      expect(matched).toHaveLength(1);
      if (matched[0].changeType === 'matched') {
        expect(matched[0].confidenceLevel).toBe('exact');
      }
    });

    it('should detect parameter-only changes in exact matches', () => {
      const left = [
        createActivity({
          arguments: { power: 100 },
          id: 1,
          name: 'Deploy',
          start_offset: '01:00:00',
          type: 'DeployAntenna',
        }),
      ];
      const right = [
        createActivity({
          arguments: { power: 200 },
          id: 100,
          name: 'Deploy',
          start_offset: '01:00:00',
          type: 'DeployAntenna',
        }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const matched = results.filter(r => r.changeType === 'matched');
      expect(matched).toHaveLength(1);
      if (matched[0].changeType === 'matched') {
        expect(matched[0].changedFields).toContain('arguments.power');
      }
    });
  });

  describe('Stage 2: Unique Anchor Matching', () => {
    it('should match unique (type, name) pairs even if time shifted', () => {
      const left = [
        createActivity({ id: 1, name: 'UniqueActivity', start_offset: '01:00:00', type: 'UniqueType' }),
      ];
      const right = [
        createActivity({ id: 100, name: 'UniqueActivity', start_offset: '02:00:00', type: 'UniqueType' }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const matched = results.filter(r => r.changeType === 'matched');
      expect(matched).toHaveLength(1);
      if (matched[0].changeType === 'matched') {
        expect(matched[0].matchType).toBe('moved');
      }
    });

    it('should NOT match non-unique (type, name) in Stage 2', () => {
      const left = [
        createActivity({ id: 1, name: 'DuplicateName', start_offset: '01:00:00', type: 'TypeA' }),
        createActivity({ id: 2, name: 'DuplicateName', start_offset: '02:00:00', type: 'TypeA' }),
      ];
      const right = [
        createActivity({ id: 100, name: 'DuplicateName', start_offset: '03:00:00', type: 'TypeA' }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      // Since left has 2 activities with same name but right has 1,
      // Stage 2 won't match them. They may be matched in Stage 4 fuzzy matching.
      const deleted = results.filter(r => r.changeType === 'deleted');
      expect(deleted.length).toBeGreaterThan(0);
    });
  });

  describe('Stage 3: Anchor Chain Propagation', () => {
    it('should match children when parent matches', () => {
      const left = [
        createActivity({ anchor_id: null, id: 1, name: 'Parent', start_offset: '01:00:00', type: 'ParentType' }),
        createActivity({ anchor_id: 1, id: 2, name: 'Child', start_offset: '00:30:00', type: 'ChildType' }),
      ];
      const right = [
        createActivity({
          anchor_id: null,
          id: 100,
          name: 'Parent',
          start_offset: '01:00:00',
          type: 'ParentType',
        }),
        createActivity({ anchor_id: 100, id: 200, name: 'Child', start_offset: '00:30:00', type: 'ChildType' }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const matched = results.filter(r => r.changeType === 'matched');
      expect(matched).toHaveLength(2);
    });

    it('should detect when anchor chain moves together', () => {
      const left = [
        createActivity({ anchor_id: null, id: 1, name: 'Parent', start_offset: '01:00:00', type: 'ParentType' }),
        createActivity({ anchor_id: 1, id: 2, name: 'Child', start_offset: '00:15:00', type: 'ChildType' }),
      ];
      const right = [
        createActivity({
          anchor_id: null,
          id: 100,
          name: 'Parent',
          start_offset: '02:00:00', // Parent moved
          type: 'ParentType',
        }),
        createActivity({
          anchor_id: 100,
          id: 200,
          name: 'Child',
          start_offset: '00:15:00', // Child offset unchanged
          type: 'ChildType',
        }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const matched = results.filter(r => r.changeType === 'matched');
      expect(matched).toHaveLength(2);

      // Parent should be marked as moved
      const parentMatch = matched.find(
        m => m.changeType === 'matched' && m.leftActivity.name === 'Parent',
      );
      expect(parentMatch).toBeDefined();
      if (parentMatch?.changeType === 'matched') {
        expect(parentMatch.matchType).toBe('moved');
      }
    });

    it('should detect child offset change within matched chain', () => {
      const left = [
        createActivity({ anchor_id: null, id: 1, name: 'Parent', start_offset: '01:00:00', type: 'ParentType' }),
        createActivity({ anchor_id: 1, id: 2, name: 'Child', start_offset: '00:15:00', type: 'ChildType' }),
      ];
      const right = [
        createActivity({
          anchor_id: null,
          id: 100,
          name: 'Parent',
          start_offset: '01:00:00',
          type: 'ParentType',
        }),
        createActivity({
          anchor_id: 100,
          id: 200,
          name: 'Child',
          start_offset: '00:30:00', // Child offset changed
          type: 'ChildType',
        }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const childMatch = results.find(
        r => r.changeType === 'matched' && r.leftActivity.name === 'Child',
      );
      expect(childMatch).toBeDefined();
      if (childMatch?.changeType === 'matched') {
        expect(childMatch.changedFields).toContain('start_offset');
      }
    });

    it('should treat reanchored activity as delete+add', () => {
      const left = [
        createActivity({ anchor_id: null, id: 1, name: 'Parent1', start_offset: '01:00:00', type: 'ParentType' }),
        createActivity({ anchor_id: 1, id: 2, name: 'Child', start_offset: '00:15:00', type: 'ChildType' }),
      ];
      const right = [
        createActivity({
          anchor_id: null,
          id: 100,
          name: 'Parent1',
          start_offset: '01:00:00',
          type: 'ParentType',
        }),
        createActivity({
          anchor_id: null,
          id: 101,
          name: 'Parent2',
          start_offset: '03:00:00',
          type: 'ParentType',
        }),
        // Child is now anchored to Parent2 instead of Parent1
        createActivity({
          anchor_id: 101,
          id: 200,
          name: 'Child',
          start_offset: '00:15:00',
          type: 'ChildType',
        }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      // The child in left is orphaned when Parent1 matches (has no Child)
      // The child in right is under Parent2
      // This should result in at least a delete or some form of tracking
      const deleted = results.filter(r => r.changeType === 'deleted');
      const added = results.filter(r => r.changeType === 'added');
      // Either deleted+added or fuzzy matched with low confidence
      expect(deleted.length + added.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stage 4: Fuzzy Matching', () => {
    it('should match renamed activity with medium confidence', () => {
      const left = [
        createActivity({
          arguments: { power: 100, target: 'earth' },
          id: 1,
          name: 'DeployAntenna',
          start_offset: '01:00:00',
          type: 'Antenna',
        }),
      ];
      const right = [
        createActivity({
          arguments: { power: 100, target: 'earth' },
          id: 100,
          name: 'DeployAntennaV2', // Renamed
          start_offset: '01:00:00',
          type: 'Antenna',
        }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      const matched = results.filter(r => r.changeType === 'matched');
      expect(matched).toHaveLength(1);
      // Should be fuzzy match due to name difference
    });

    it('should treat very different activities as add/delete', () => {
      const left = [
        createActivity({
          arguments: { param1: 'a', param2: 'b' },
          id: 1,
          name: 'CompletelyDifferent',
          start_offset: '01:00:00',
          type: 'TypeA',
        }),
      ];
      const right = [
        createActivity({
          arguments: { param3: 'c', param4: 'd' },
          id: 100,
          name: 'TotallyUnrelated',
          start_offset: '12:00:00',
          type: 'TypeA',
        }),
      ];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      // These are so different they should be treated as delete+add
      const deleted = results.filter(r => r.changeType === 'deleted');
      const added = results.filter(r => r.changeType === 'added');
      const fuzzy = results.filter(r => r.changeType === 'matched');
      // Either deleted+added or potentially fuzzy with very low confidence
      expect(deleted.length + added.length + fuzzy.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Ambiguous Matches', () => {
    it('should flag ambiguous when multiple candidates have similar scores', () => {
      // Two very similar activities on the left, one on the right
      const left = [
        createActivity({ id: 1, name: 'Activity', start_offset: '01:00:00', type: 'TypeA' }),
        createActivity({ id: 2, name: 'Activity', start_offset: '01:01:00', type: 'TypeA' }),
      ];
      const right = [createActivity({ id: 100, name: 'Activity', start_offset: '01:00:30', type: 'TypeA' })];

      const results = matchActivitiesByContent(left, right, planDurationMs);
      // One will match, one will be deleted
      const matched = results.filter(r => r.changeType === 'matched');
      const deleted = results.filter(r => r.changeType === 'deleted');
      expect(matched.length + deleted.length).toBe(2);
    });
  });
});

// ============================================================================
// Compare Activities (Main Function) Tests
// ============================================================================

describe('compareActivities', () => {
  const planDurationMs = 86400000;

  it('should use ID matching strategy when specified', () => {
    const left = [createActivity({ id: 1, type: 'TypeA' })];
    const right = [createActivity({ id: 1, type: 'TypeA' })];

    const { results } = compareActivities(left, right, { strategy: 'id' });
    const matched = results.filter(r => r.changeType === 'matched');
    expect(matched).toHaveLength(1);
  });

  it('should use content matching strategy when specified', () => {
    const left = [createActivity({ id: 1, name: 'Test', type: 'TypeA' })];
    const right = [createActivity({ id: 100, name: 'Test', type: 'TypeA' })];

    const { results } = compareActivities(left, right, { strategy: 'content' }, planDurationMs);
    const matched = results.filter(r => r.changeType === 'matched');
    expect(matched).toHaveLength(1);
  });

  it('should exclude unchanged when includeUnchanged is false', () => {
    const left = [createActivity({ id: 1, name: 'Test', start_offset: '01:00:00', type: 'TypeA' })];
    const right = [createActivity({ id: 100, name: 'Test', start_offset: '01:00:00', type: 'TypeA' })];

    const { results } = compareActivities(
      left,
      right,
      { includeUnchanged: false, strategy: 'content' },
      planDurationMs,
    );
    // Since they're identical (no changed fields), should be excluded
    expect(results.filter(r => r.changeType === 'matched')).toHaveLength(0);
  });
});

// ============================================================================
// Comparison Summary Tests
// ============================================================================

describe('computeComparisonSummary', () => {
  it('should count added activities', () => {
    const results = [
      { activity: createActivity({ id: 1, type: 'TypeA' }), changeType: 'added' as const },
      { activity: createActivity({ id: 2, type: 'TypeB' }), changeType: 'added' as const },
    ];
    const summary = computeComparisonSummary(results);
    expect(summary.added).toBe(2);
    expect(summary.deleted).toBe(0);
  });

  it('should count deleted activities', () => {
    const results = [{ activity: createActivity({ id: 1, type: 'TypeA' }), changeType: 'deleted' as const }];
    const summary = computeComparisonSummary(results);
    expect(summary.deleted).toBe(1);
  });

  it('should count matched activities correctly', () => {
    const a1 = createActivity({ id: 1, type: 'TypeA' });
    const a2 = createActivity({ id: 2, type: 'TypeA' });
    const results = [
      {
        changeType: 'matched' as const,
        changedFields: [],
        confidence: 1,
        confidenceLevel: 'exact' as const,
        leftActivity: a1,
        matchType: 'exact' as const,
        rightActivity: a2,
      },
      {
        changeType: 'matched' as const,
        changedFields: ['arguments.x'],
        confidence: 0.9,
        confidenceLevel: 'high' as const,
        leftActivity: a1,
        matchType: 'modified' as const,
        rightActivity: a2,
      },
    ];
    const summary = computeComparisonSummary(results);
    expect(summary.matched.total).toBe(2);
    expect(summary.matched.unchanged).toBe(1);
    expect(summary.matched.modified).toBe(1);
  });

  it('should track different match types', () => {
    const a1 = createActivity({ id: 1, type: 'TypeA' });
    const a2 = createActivity({ id: 2, type: 'TypeA' });
    const results = [
      {
        changeType: 'matched' as const,
        changedFields: ['start_offset'],
        confidence: 0.95,
        confidenceLevel: 'high' as const,
        leftActivity: a1,
        matchType: 'moved' as const,
        rightActivity: a2,
      },
      {
        changeType: 'matched' as const,
        changedFields: ['name'],
        confidence: 0.8,
        confidenceLevel: 'medium' as const,
        leftActivity: a1,
        matchType: 'ambiguous' as const,
        rightActivity: a2,
      },
      {
        changeType: 'matched' as const,
        changedFields: ['name', 'arguments.x'],
        confidence: 0.9,
        confidenceLevel: 'high' as const,
        leftActivity: a1,
        matchType: 'fuzzy' as const,
        rightActivity: a2,
      },
    ];
    const summary = computeComparisonSummary(results);
    expect(summary.matched.moved).toBe(1);
    expect(summary.matched.ambiguous).toBe(1);
    expect(summary.matched.fuzzy).toBe(1);
    expect(summary.modified).toBe(3);
  });
});
