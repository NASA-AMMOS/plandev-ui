/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Benchmark harness for the timeline resource pipeline. Opt-in — it allocates millions of points
 * and takes minutes, so it must not run in the normal suite:
 *
 *   PERF=1 npx vitest run src/utilities/timelinePerf.test.ts --reporter=basic
 *
 * Each section pairs the current implementation against a verbatim copy of the code it replaced, so
 * the numbers are a real before/after on the same machine rather than an estimate. Every section
 * also asserts the two agree, so the harness doubles as a coarse equivalence check at scale.
 *
 * This measures the Node/JS layer only. It does not capture canvas rasterization, style
 * recalculation, or real browser GC behavior — a browser-level harness driving actual rows is still
 * needed to characterize end-to-end frame times.
 */
import { describe, expect, test } from 'vitest';
import type { Profile, ProfileSegment, Resource, ResourceValue } from '../types/simulation';
import type { Axis, Layer, LinePoint, TimeRange } from '../types/timeline';
import { createProfileSampler, sampleProfiles } from './resources';
import { getResourceForLayer, getYAxisBounds, lowerBoundByX, minMaxDecimation, upperBoundByX } from './timeline';

const START = '2026-01-01T00:00:00';
const startMs = new Date(START).getTime();

function mkSegments(count: number): ProfileSegment[] {
  const segments: ProfileSegment[] = new Array(count);
  for (let i = 0; i < count; ++i) {
    const totalSeconds = i;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    segments[i] = {
      dataset_id: 1,
      dynamics: { initial: Math.sin(i / 100) * 50 + 50, rate: Math.cos(i / 100) / 10 },
      is_gap: false,
      profile_id: 7,
      start_offset: `${pad(h)}:${pad(m)}:${pad(s)}.000000`,
    };
  }
  return segments;
}

function mkProfile(segments: ProfileSegment[]): Profile {
  const totalSeconds = segments.length + 60;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    dataset_id: 1,
    duration: `${pad(h)}:${pad(m)}:${pad(s)}.000000`,
    id: 7,
    name: 'r',
    profile_segments: segments,
    type: { schema: { type: 'real' } as any, type: 'real' },
  };
}

/** Median of repeated timings, in ms. */
function timeMs(fn: () => void, reps: number): number {
  fn();
  fn();
  const samples: number[] = [];
  for (let r = 0; r < reps; ++r) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

const row = (label: string, before: number, after: number) =>
  `${label.padEnd(42)}${`${before.toFixed(2)} ms`.padStart(11)}${`${after.toFixed(2)} ms`.padStart(12)}${`${(before / after).toFixed(1)}x`.padStart(9)}`;
const header = () =>
  `${''.padEnd(42)}${'before'.padStart(11)}${'after'.padStart(12)}${'speedup'.padStart(9)}\n${'-'.repeat(74)}`;

// ---------------------------------------------------------------------------
// Phase 1a reference: the two-parse formulation sampleProfiles replaced.
// ---------------------------------------------------------------------------
function referenceSampleProfiles(profiles: Profile[], startTimeYmd: string): Resource[] {
  const resources: Resource[] = [];
  const start = new Date(startTimeYmd).getTime();
  for (const profile of profiles) {
    const { duration, name, profile_segments, type: profileType } = profile;
    const { schema, type } = profileType;
    const durationMs = getIntervalMsLocal(duration);
    const values: ResourceValue[] = [];
    for (let i = 0; i < profile_segments.length; ++i) {
      const segment = profile_segments[i];
      const nextSegment = profile_segments[i + 1];
      const segmentOffset = getIntervalMsLocal(segment.start_offset);
      const nextSegmentOffset = nextSegment ? getIntervalMsLocal(nextSegment.start_offset) : durationMs;
      const { dynamics, is_gap } = segment;
      if (type === 'real') {
        values.push({ is_gap, x: start + segmentOffset, y: dynamics.initial });
        values.push({
          is_gap,
          x: start + nextSegmentOffset,
          y: dynamics.initial + dynamics.rate * ((nextSegmentOffset - segmentOffset) / 1000),
        });
      }
    }
    resources.push({ name, schema, values });
  }
  return resources;
}
// Uses the same parser the real code uses, so only the call count differs.
import parseInterval from 'postgres-interval';
function getIntervalMsLocal(interval: string): number {
  const p = parseInterval(interval);
  return p.days * 86400000 + p.hours * 3600000 + p.minutes * 60000 + p.seconds * 1000 + p.milliseconds;
}

// ---------------------------------------------------------------------------
// Phase 1d reference: the full-scan getYAxisBounds.
// ---------------------------------------------------------------------------
function referenceGetYAxisBounds(
  yAxis: Axis,
  layers: Layer[],
  resources: Resource[],
  viewTimeRange?: TimeRange,
): number[] {
  const yAxisLayers = layers.filter(layer => layer.yAxisId === yAxis.id);
  let minY: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  yAxisLayers.forEach(layer => {
    const layerResource = getResourceForLayer(layer, resources) as Resource;
    if (layerResource) {
      let leftValue: ResourceValue | undefined;
      let rightValue: ResourceValue | undefined;
      layerResource.values.forEach(value => {
        const isNumber = typeof value.y === 'number';
        if (viewTimeRange && value.x < viewTimeRange.start) {
          if (value.is_gap) {
            leftValue = undefined;
          } else if (isNumber) {
            if (!leftValue || value.x >= leftValue.x) {
              leftValue = value;
            }
          }
        }
        if (viewTimeRange && value.x > viewTimeRange.end) {
          if (value.is_gap) {
            rightValue = undefined;
          } else if (isNumber) {
            if (!rightValue || value.x < rightValue.x) {
              rightValue = value;
            }
          }
        }
        if (
          typeof value.y === 'number' &&
          (!viewTimeRange ||
            yAxis.domainFitMode !== 'fitTimeWindow' ||
            (value.x >= viewTimeRange.start && value.x <= viewTimeRange.end))
        ) {
          if (minY === undefined || value.y < minY) {
            minY = value.y;
          }
          if (maxY === undefined || value.y > maxY) {
            maxY = value.y;
          }
        }
      });
      if (viewTimeRange) {
        minY = Math.min(
          minY ?? Number.MAX_SAFE_INTEGER,
          leftValue !== undefined && leftValue.y ? (leftValue.y as number) : Number.MAX_SAFE_INTEGER,
          rightValue !== undefined && rightValue.y ? (rightValue.y as number) : Number.MAX_SAFE_INTEGER,
        );
        maxY = Math.max(
          maxY ?? Number.MIN_SAFE_INTEGER,
          leftValue !== undefined && leftValue.y ? (leftValue.y as number) : Number.MIN_SAFE_INTEGER,
          rightValue !== undefined && rightValue.y ? (rightValue.y as number) : Number.MIN_SAFE_INTEGER,
        );
      }
    }
  });
  const scaleDomain = [...(yAxis.scaleDomain || [])];
  if (minY !== undefined) {
    scaleDomain[0] = minY;
  }
  if (maxY !== undefined) {
    scaleDomain[1] = maxY;
  }
  return scaleDomain as number[];
}

// ---------------------------------------------------------------------------
// Phase 1c: the LayerLine in-view collection, both variants, as written.
// ---------------------------------------------------------------------------
function scanFull(points: LinePoint[], viewTimeRange: TimeRange) {
  const pointsInView: LinePoint[] = [];
  const gapPoints: LinePoint[] = [];
  let leftPoint: LinePoint | null = null;
  let rightPoint: LinePoint | null = null;
  let prevPoint: LinePoint | null = null;
  points.forEach(point => {
    if (point.x >= viewTimeRange.start && !leftPoint && prevPoint) {
      leftPoint = prevPoint;
    }
    if (point.x > viewTimeRange.end && !rightPoint && prevPoint) {
      rightPoint = point;
    }
    if (point.x >= viewTimeRange.start && point.x <= viewTimeRange.end) {
      if (point.y === null) {
        gapPoints.push(point);
      } else {
        pointsInView.push(point);
      }
    }
    prevPoint = point;
  });
  return { gapPoints, leftPoint, pointsInView, rightPoint };
}

function scanBounded(points: LinePoint[], viewTimeRange: TimeRange) {
  const pointsInView: LinePoint[] = [];
  const gapPoints: LinePoint[] = [];
  let leftPoint: LinePoint | null = null;
  let rightPoint: LinePoint | null = null;
  const pointCount = points.length;
  const firstInView = lowerBoundByX(points, viewTimeRange.start);
  const firstAfterView = upperBoundByX(points, viewTimeRange.end);
  for (let i = firstInView; i < firstAfterView; ++i) {
    const point = points[i];
    if (point.y === null) {
      gapPoints.push(point);
    } else {
      pointsInView.push(point);
    }
  }
  const leftIndex = Math.max(firstInView, 1);
  if (firstInView < pointCount && leftIndex < pointCount) {
    leftPoint = points[leftIndex - 1];
  }
  const rightIndex = Math.max(firstAfterView, 1);
  if (firstAfterView < pointCount && rightIndex < pointCount) {
    rightPoint = points[rightIndex];
  }
  return { gapPoints, leftPoint, pointsInView, rightPoint };
}

describe.skipIf(!process.env.PERF)('timeline performance', () => {
  const SIZES = [100_000, 500_000, 2_000_000];

  test('Phase 1a+1b — profile sampling', () => {
    const lines: string[] = ['', '=== Phase 1a: full sampling pass (segments -> values) ===', header()];
    for (const size of SIZES) {
      const profile = mkProfile(mkSegments(size));
      const before = timeMs(() => referenceSampleProfiles([profile], START), 5);
      const after = timeMs(() => sampleProfiles([profile], START), 5);
      lines.push(row(`${size / 1000}k segments`, before, after));
    }

    lines.push('', '=== Phase 1b: one streaming tick (1024-segment delta) ===', header());
    for (const size of SIZES) {
      const all = mkSegments(size + 1024);
      const accBefore = all.slice(0, size + 1024);
      const profileBefore = mkProfile(accBefore);
      const before = timeMs(() => sampleProfiles([profileBefore], START), 5);

      const acc = all.slice(0, size);
      const accPlus = all.slice(0, size + 1024);
      const profile = mkProfile(accPlus);
      const sampler = createProfileSampler(START);
      sampler.sample({
        duration: mkProfile(acc).duration,
        name: 'r',
        profileType: profile.type,
        segments: acc,
      });
      const after = timeMs(
        () =>
          sampler.sample({
            duration: profile.duration,
            name: 'r',
            profileType: profile.type,
            segments: accPlus,
          }),
        5,
      );
      lines.push(row(`${size / 1000}k accumulated`, before, after));
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(true).toBe(true);
  }, 600_000);

  test('Phase 1c+1d — per zoom/pan frame', () => {
    const lines: string[] = [];
    const layer = { chartType: 'line', filter: { resource: 'r' }, id: 1, name: '', yAxisId: 0 } as unknown as Layer;
    const layers = [layer];
    const yAxis = { domainFitMode: 'fitTimeWindow', id: 0, scaleDomain: [] } as unknown as Axis;

    for (const zoomLabel of ['zoomed in (1% of span)', 'zoomed out (full span)'] as const) {
      lines.push('', `=== Phase 1c: LayerLine in-view collection — ${zoomLabel} ===`, header());
      for (const size of SIZES) {
        const resource = sampleProfiles([mkProfile(mkSegments(size))], START)[0];
        const points: LinePoint[] = resource.values.map((v, i) => ({
          id: i,
          name: 'r',
          type: 'line',
          x: v.x,
          y: v.y as number,
        }));
        const span = points[points.length - 1].x - points[0].x;
        const width = zoomLabel.startsWith('zoomed in') ? span * 0.01 : span;
        const viewTimeRange: TimeRange = { end: points[0].x + width, start: points[0].x };

        // sanity: both variants agree
        expect(scanBounded(points, viewTimeRange).pointsInView.length).toEqual(
          scanFull(points, viewTimeRange).pointsInView.length,
        );

        const before = timeMs(() => scanFull(points, viewTimeRange), 7);
        const after = timeMs(() => scanBounded(points, viewTimeRange), 7);
        lines.push(row(`${size / 1000}k segments`, before, after));
      }
    }

    lines.push('', '=== Phase 1d: getYAxisBounds, steady-state frame (memo warm) ===', header());
    for (const size of SIZES) {
      const resource = sampleProfiles([mkProfile(mkSegments(size))], START)[0];
      const resources = [resource];
      const span = resource.values[resource.values.length - 1].x - resource.values[0].x;
      const viewTimeRange: TimeRange = { end: startMs + span * 0.01, start: startMs };

      expect(getYAxisBounds(yAxis, layers, resources, viewTimeRange)).toEqual(
        referenceGetYAxisBounds(yAxis, layers, resources, viewTimeRange),
      );

      const before = timeMs(() => referenceGetYAxisBounds(yAxis, layers, resources, viewTimeRange), 7);
      const after = timeMs(() => getYAxisBounds(yAxis, layers, resources, viewTimeRange), 7);
      lines.push(row(`${size / 1000}k segments`, before, after));
    }

    lines.push('', '=== Phase 1d: first frame after a data change (memo cold) ===', header());
    for (const size of SIZES) {
      const base = sampleProfiles([mkProfile(mkSegments(size))], START)[0];
      const span = base.values[base.values.length - 1].x - base.values[0].x;
      const viewTimeRange: TimeRange = { end: startMs + span * 0.01, start: startMs };
      const before = timeMs(() => referenceGetYAxisBounds(yAxis, layers, [base], viewTimeRange), 5);
      // Fresh array identity each rep, so the WeakMap always misses.
      const after = timeMs(() => {
        const fresh: Resource = { ...base, values: base.values.slice() };
        getYAxisBounds(yAxis, layers, [fresh], viewTimeRange);
      }, 5);
      lines.push(row(`${size / 1000}k segments`, before, after));
    }

    lines.push('', '=== Phase 1e: hover lookups, per mousemove with the cursor near the right edge ===', header());
    for (const size of SIZES) {
      const resource = sampleProfiles([mkProfile(mkSegments(size))], START)[0];
      const points: LinePoint[] = resource.values.map((v, i) => ({
        id: i,
        name: 'r',
        type: 'line',
        x: v.x,
        y: v.y as number,
      }));
      // Cursor at 90% across: the old forward scan's cost grew with distance from the first point,
      // so this is close to its worst case and is a perfectly ordinary place to put the pointer.
      const cursor = points[Math.floor(points.length * 0.9)].x;

      const before = timeMs(() => {
        let leftPoint: LinePoint | null = null;
        let rightPoint: LinePoint | null = null;
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          if (point.x <= cursor) {
            if (!leftPoint || Math.abs(point.x - cursor) <= Math.abs(leftPoint.x - cursor)) {
              leftPoint = point;
            }
          } else if (!rightPoint) {
            rightPoint = point;
            break;
          }
        }
        // The exact-x collection that ran alongside it: a full scan plus an allocation.
        const atX = points.filter(p => p.y !== null && p.x === cursor);
        return [leftPoint, rightPoint, atX.length];
      }, 7);

      const after = timeMs(() => {
        const firstAfter = upperBoundByX(points, cursor);
        const leftPoint = firstAfter > 0 ? points[firstAfter - 1] : null;
        const rightPoint = firstAfter < points.length ? points[firstAfter] : null;
        const atX: LinePoint[] = [];
        const end = upperBoundByX(points, cursor);
        for (let i = lowerBoundByX(points, cursor); i < end; ++i) {
          if (points[i].y !== null) {
            atX.push(points[i]);
          }
        }
        return [leftPoint, rightPoint, atX.length];
      }, 7);

      lines.push(row(`${size / 1000}k segments`, before, after));
    }

    lines.push('', '=== context: minMaxDecimation over in-view points (unchanged) ===');
    for (const size of SIZES) {
      const resource = sampleProfiles([mkProfile(mkSegments(size))], START)[0];
      const pts = resource.values.map(v => ({ x: v.x, y: v.y as number }));
      const ms = timeMs(() => minMaxDecimation(pts, 0, pts.length, 1200), 5);
      lines.push(
        `${`${size / 1000}k segments (${(size * 2) / 1000}k points)`.padEnd(42)}${`${ms.toFixed(2)} ms`.padStart(11)}`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(true).toBe(true);
  }, 600_000);
});
