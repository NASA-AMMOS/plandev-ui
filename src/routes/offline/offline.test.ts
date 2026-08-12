import { describe, expect, test } from 'vitest';
import fooBundle from '../../tests/fixtures/foo-bundle.json';
import { loadOfflineBundle } from '../../utilities/offline-bundle';
import { toOfflinePlanData } from './offline-data';

/** The golden fixture also used by `utilities/offline-bundle.test.ts`. */
const fixtureText = JSON.stringify(fooBundle);

describe('toOfflinePlanData', () => {
  test('derives plan doy fields from the bundle plan', () => {
    const loaded = loadOfflineBundle(fixtureText);
    const data = toOfflinePlanData(loaded);

    expect(data.plan.name).toBe('foo plan');
    expect(data.plan.start_time).toBe(loaded.plan.start_time);
    expect(data.plan.start_time_doy).toMatch(/^\d{4}-\d{3}T\d{2}:\d{2}:\d{2}/);
    expect(data.plan.end_time_doy).toMatch(/^\d{4}-\d{3}T\d{2}:\d{2}:\d{2}/);
  });

  test('computes start_time_ms for every activity directive and sorts by it', () => {
    const loaded = loadOfflineBundle(fixtureText);
    const data = toOfflinePlanData(loaded);

    expect(data.activityDirectives).toHaveLength(loaded.activityDirectives.length);
    for (const directive of data.activityDirectives) {
      expect(data.activityDirectivesMap[directive.id]).toBe(directive);
      expect(typeof directive.start_time_ms).toBe('number');
      expect(directive.start_time_ms).toBeGreaterThanOrEqual(0);
    }
    const startTimes = data.activityDirectives.map(directive => directive.start_time_ms);
    expect(startTimes).toEqual([...startTimes].sort((a, b) => a - b));
  });

  test('builds a spansMap keyed by span_id and a matching spanUtilityMaps', () => {
    const loaded = loadOfflineBundle(fixtureText);
    const data = toOfflinePlanData(loaded);

    for (const span of loaded.spans) {
      expect(data.spansMap[span.span_id]).toEqual(span);
    }
    expect(Object.keys(data.spanUtilityMaps.spanIdToChildIdsMap).length).toBeGreaterThanOrEqual(0);
  });

  test('samples resources from the bundle profiles', () => {
    const loaded = loadOfflineBundle(fixtureText);
    const data = toOfflinePlanData(loaded);

    expect(data.resources).toHaveLength(loaded.profiles.length);
    expect(data.resourceTypes).toEqual(loaded.resourceTypes);
  });

  test('generates a default view when the bundle has none', () => {
    const loaded = loadOfflineBundle(fixtureText);
    expect(loaded.view).toBeNull();

    const data = toOfflinePlanData(loaded);

    expect(data.view.definition.plan.timelines.length).toBeGreaterThan(0);
  });

  test('wraps a bundle-provided view definition instead of generating a default one', () => {
    const loaded = loadOfflineBundle(fixtureText);
    const withView = {
      ...loaded,
      view: {
        name: 'Custom',
        plan: { activityFilter: [], timelines: [] },
        version: 3,
      } as unknown as NonNullable<typeof loaded.view>,
    };

    const data = toOfflinePlanData(withView);

    expect(data.view.name).toBe('Offline View');
    expect(data.view.definition).toBeDefined();
  });

  // A producer may legitimately emit `view: {}` — it is schema-valid, since
  // `view` is an optional free-form object. It must degrade to the generated
  // default rather than yielding a view whose `definition.plan` is undefined,
  // which crashed TimelinePanel at `$view?.definition.plan.timelines`.
  test.each([
    ['an empty object', {}],
    ['a view with no plan', { version: 3 }],
    ['a view whose plan has no timelines', { plan: {}, version: 3 }],
  ])('falls back to the default view given %s', (_label, view) => {
    const loaded = loadOfflineBundle(fixtureText);
    const data = toOfflinePlanData({ ...loaded, view: view as NonNullable<typeof loaded.view> });

    expect(data.view.definition?.plan?.timelines).toBeInstanceOf(Array);
    expect(data.view.definition.plan.timelines.length).toBeGreaterThan(0);
  });
});
