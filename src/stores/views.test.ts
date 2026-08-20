import { get } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ViewDefaultSectionColor } from '../constants/view';
import type { Timeline } from '../types/timeline';
import type { View } from '../types/view';
import {
  selectedTimelineId,
  view,
  viewAddFilterToRow,
  viewAddSection,
  viewDeleteSection,
  viewReorderTimelineItems,
  viewUpdateSection,
} from './views';

// $app/* and $env/* are SvelteKit virtual modules, pulled in through the store's subscription
// layer. None of it runs here; the mocks only keep the import graph loadable outside a build.
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));

/**
 * A view holding one timeline: row 10, section 100 [rows 11, 12], row 13. Only the fields the
 * section operations read are filled in; the rest of a real view is irrelevant here.
 */
function buildView(): View {
  const timeline = {
    id: 0,
    items: [
      { id: 10, type: 'row' },
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
    ],
    marginLeft: 250,
    marginRight: 30,
    rows: [10, 11, 12, 13].map(id => ({ id, layers: [], name: `Row ${id}`, yAxes: [] })),
    sections: [{ collapsed: false, color: ViewDefaultSectionColor, id: 100, name: 'A', rowIds: [11, 12] }],
    verticalGuides: [],
  } as unknown as Timeline;

  return {
    definition: { plan: { activityTables: [], timelines: [timeline] } },
    id: 1,
    name: 'Test View',
  } as unknown as View;
}

function currentTimeline(): Timeline {
  return get(view)!.definition.plan.timelines[0];
}

/**
 * The invariant every hierarchy mutation has to preserve: each row appears exactly once, at the
 * root in `items` or inside exactly one section, and `items` holds no ref to something that is
 * gone. Both ways rows have silently vanished - added to `rows` but not `items`, and a deleted
 * section taking its rows' only reference with it - violate it, so assert it after any mutation
 * rather than spot-checking outcomes.
 */
function expectConsistentHierarchy(): void {
  const timeline = currentTimeline();
  const placements = new Map<number, string[]>();

  timeline.rows.forEach(row => placements.set(row.id, []));
  timeline.items.forEach(item => {
    if (item.type === 'row') {
      expect(placements.has(item.id), `items references row ${item.id}, which does not exist`).toBe(true);
      placements.get(item.id)?.push('root');
    } else {
      expect(
        timeline.sections.some(section => section.id === item.id),
        `items references section ${item.id}, which does not exist`,
      ).toBe(true);
    }
  });
  timeline.sections.forEach(section => {
    section.rowIds.forEach(rowId => {
      expect(placements.has(rowId), `section ${section.id} references row ${rowId}, which does not exist`).toBe(true);
      placements.get(rowId)?.push(`section ${section.id}`);
    });
    expect(
      timeline.items.some(item => item.type === 'section' && item.id === section.id),
      `section ${section.id} is missing from items`,
    ).toBe(true);
  });

  placements.forEach((places, rowId) => {
    expect(places, `row ${rowId} should appear exactly once`).toHaveLength(1);
  });
}

describe('view section stores', () => {
  beforeEach(() => {
    view.set(buildView());
    selectedTimelineId.set(0);
  });

  test('the fixture starts consistent', () => {
    expectConsistentHierarchy();
  });

  test('viewAddSection appends a section to both the section list and the item order', () => {
    const created = viewAddSection(0, 'Payload');

    expect(created?.name).toBe('Payload');
    expect(currentTimeline().sections.map(s => s.name)).toEqual(['A', 'Payload']);
    expect(currentTimeline().items.at(-1)).toEqual({ id: created?.id, type: 'section' });

    expectConsistentHierarchy();
  });

  test('viewAddSection gives the new section the default color', () => {
    // Sections are created colored rather than null, so the picker shows what is rendered.
    expect(viewAddSection(0)?.color).toBe(ViewDefaultSectionColor);
  });

  test('viewAddSection can insert directly after an item instead of appending', () => {
    // "Insert Section" in a row's context menu lands the section where the user clicked.
    const created = viewAddSection(0, 'Payload', { id: 10, type: 'row' });

    expect(currentTimeline().items).toEqual([
      { id: 10, type: 'row' },
      { id: created?.id, type: 'section' },
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
    ]);

    expectConsistentHierarchy();
  });

  test('viewAddSection appends when the anchor is not in the item order', () => {
    const created = viewAddSection(0, 'Payload', { id: 999, type: 'row' });

    expect(currentTimeline().items.at(-1)).toEqual({ id: created?.id, type: 'section' });
  });

  test('viewUpdateSection edits one field of one section', () => {
    viewUpdateSection('name', 'Renamed', 100, 0);
    viewUpdateSection('color', '#ff0000', 100, 0);

    expect(currentTimeline().sections[0]).toMatchObject({ color: '#ff0000', name: 'Renamed' });
    // The rows it holds are not disturbed by a field edit.
    expect(currentTimeline().sections[0].rowIds).toEqual([11, 12]);

    expectConsistentHierarchy();
  });

  test('viewUpdateSection leaves other sections alone', () => {
    const other = viewAddSection(0, 'Other');
    viewUpdateSection('name', 'Renamed', 100, 0);

    expect(currentTimeline().sections.find(s => s.id === other?.id)?.name).toBe('Other');
  });

  test('viewDeleteSection keeps the rows, in place, where the section was', () => {
    viewDeleteSection(100, true, 0);

    expect(currentTimeline().sections).toEqual([]);
    // The freed rows take the section's slot rather than being appended to the end, so deleting
    // a section does not scramble the timeline's vertical order.
    expect(currentTimeline().items).toEqual([
      { id: 10, type: 'row' },
      { id: 11, type: 'row' },
      { id: 12, type: 'row' },
      { id: 13, type: 'row' },
    ]);

    expectConsistentHierarchy();
  });

  test('viewDeleteSection can drop the rows with the section', () => {
    viewDeleteSection(100, false, 0);

    expect(currentTimeline().sections).toEqual([]);
    expect(currentTimeline().items).toEqual([
      { id: 10, type: 'row' },
      { id: 13, type: 'row' },
    ]);

    expectConsistentHierarchy();
  });

  test('viewAddFilterToRow registers a brand new row in the item order', () => {
    // "New Row +" in the layer picker takes this path. It used to add to `rows` only, so the row
    // existed in the store and opened its editor while rendering nowhere.
    const before = currentTimeline().rows.length;

    viewAddFilterToRow([{ name: '/a/resource' }] as never, 'activity');

    expect(currentTimeline().rows.length).toBe(before + 1);
    expectConsistentHierarchy();
  });

  test('viewReorderTimelineItems writes items and sections together', () => {
    viewReorderTimelineItems(
      [
        { id: 100, type: 'section' },
        { id: 10, type: 'row' },
        { id: 13, type: 'row' },
      ],
      0,
      [{ collapsed: false, color: null, id: 100, name: 'A', rowIds: [12, 11] }],
    );

    expect(currentTimeline().items[0]).toEqual({ id: 100, type: 'section' });
    expect(currentTimeline().sections[0].rowIds).toEqual([12, 11]);

    expectConsistentHierarchy();
  });

  test('section operations leave the timeline’s rows untouched', () => {
    // Sections only ever describe grouping. Every row keeps existing in timeline.rows whatever
    // happens to the section that referenced it.
    const before = currentTimeline().rows.map(r => r.id);

    viewAddSection(0, 'Another');
    viewUpdateSection('collapsed', true, 100, 0);
    viewDeleteSection(100, true, 0);

    expect(currentTimeline().rows.map(r => r.id)).toEqual(before);
  });
});
