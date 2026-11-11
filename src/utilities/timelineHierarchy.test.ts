import { describe, expect, test } from 'vitest';
import type { Timeline, TimelineItemRef } from '../types/timeline';
import {
  addSection,
  applyTimelineItemDrop,
  findItem,
  flattenSection,
  getRenderableTimelineItems,
  insertItem,
  moveItem,
  placeBeside,
  removeItem,
  shiftItem,
  validateTimelineHierarchy,
  type TimelineHierarchy,
} from './timelineHierarchy';

const row = (id: number): TimelineItemRef => ({ id, type: 'row' });
const sec = (id: number): TimelineItemRef => ({ id, type: 'section' });
const section = (id: number, rowIds: number[]) => ({ collapsed: false, color: null, id, name: `S${id}`, rowIds });

/**
 * Root: row 10, section 100 [11, 12], row 13, section 200 [14], section 300 [] (empty).
 * Ids are spread apart so a mix-up between a row id and a section id cannot pass by accident.
 */
function build(): TimelineHierarchy {
  return {
    items: [row(10), sec(100), row(13), sec(200), sec(300)],
    sections: [section(100, [11, 12]), section(200, [14]), section(300, [])],
  };
}
const ROW_IDS = [10, 11, 12, 13, 14];

/** The whole layout as one comparable value: root order, with each section's rows nested. */
function layout(h: TimelineHierarchy): (number | { [section: number]: number[] })[] {
  return h.items.map(item =>
    item.type === 'row' ? item.id : { [item.id]: h.sections.find(s => s.id === item.id)?.rowIds ?? [] },
  );
}

function expectValid(h: TimelineHierarchy | null, rowIds = ROW_IDS) {
  expect(h).not.toBeNull();
  expect(validateTimelineHierarchy(h as TimelineHierarchy, rowIds)).toEqual([]);
}

describe('validateTimelineHierarchy', () => {
  test('accepts a consistent hierarchy', () => {
    expect(validateTimelineHierarchy(build(), ROW_IDS)).toEqual([]);
  });

  test.each([
    [
      'a row placed nowhere',
      (h: TimelineHierarchy) => (h.items = h.items.filter(i => i.id !== 10)),
      /row 10 .*nowhere/,
    ],
    ['a row at root and in a section', (h: TimelineHierarchy) => h.items.push(row(11)), /row 11 is placed 2 times/],
    ['a row in two sections', (h: TimelineHierarchy) => h.sections[1].rowIds.push(11), /row 11 is placed 2 times/],
    ['a ref to a missing row', (h: TimelineHierarchy) => h.items.push(row(99)), /row 99, which does not exist/],
    ['a ref to a missing section', (h: TimelineHierarchy) => h.items.push(sec(99)), /section 99, which does not exist/],
    [
      'a section missing from the root',
      (h: TimelineHierarchy) => (h.items = h.items.filter(i => i.id !== 100)),
      /section 100 appears 0/,
    ],
    ['a section listed twice', (h: TimelineHierarchy) => h.items.push(sec(100)), /section 100 appears 2/],
  ])('reports %s', (_name, break_, expected) => {
    const h = build();
    break_(h);
    expect(validateTimelineHierarchy(h, ROW_IDS).join('\n')).toMatch(expected);
  });
});

describe('moveItem', () => {
  // Every case is a move on `build()`; each result is also checked against the invariant.
  test.each<[string, TimelineItemRef, Parameters<typeof moveItem>[2], ReturnType<typeof layout>]>([
    [
      'root row to root start',
      row(13),
      { container: null, index: 0 },
      [13, 10, { 100: [11, 12] }, { 200: [14] }, { 300: [] }],
    ],
    ['root row to root end', row(10), { container: null }, [{ 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }, 10]],
    ['root row into a section', row(10), { container: 100 }, [{ 100: [11, 12, 10] }, 13, { 200: [14] }, { 300: [] }]],
    [
      'root row into an empty section',
      row(10),
      { container: 300 },
      [{ 100: [11, 12] }, 13, { 200: [14] }, { 300: [10] }],
    ],
    [
      'root row into the middle of a section',
      row(13),
      { container: 100, index: 1 },
      [10, { 100: [11, 13, 12] }, { 200: [14] }, { 300: [] }],
    ],
    [
      'section row to root',
      row(11),
      { container: null, index: 1 },
      [10, 11, { 100: [12] }, 13, { 200: [14] }, { 300: [] }],
    ],
    [
      'last row of a section to root, leaving it empty',
      row(14),
      { container: null },
      [10, { 100: [11, 12] }, 13, { 200: [] }, { 300: [] }, 14],
    ],
    ['section A to section B', row(11), { container: 200 }, [10, { 100: [12] }, 13, { 200: [14, 11] }, { 300: [] }]],
    [
      'section A to the start of section B',
      row(12),
      { container: 200, index: 0 },
      [10, { 100: [11] }, 13, { 200: [12, 14] }, { 300: [] }],
    ],
    [
      'reorder within a section',
      row(12),
      { container: 100, index: 0 },
      [10, { 100: [12, 11] }, 13, { 200: [14] }, { 300: [] }],
    ],
    [
      'reorder a section among the root',
      sec(200),
      { container: null, index: 0 },
      [{ 200: [14] }, 10, { 100: [11, 12] }, 13, { 300: [] }],
    ],
    [
      'a section to the root end',
      sec(100),
      { container: null },
      [10, 13, { 200: [14] }, { 300: [] }, { 100: [11, 12] }],
    ],
  ])('%s', (_name, item, destination, expected) => {
    const next = moveItem(build(), item, destination);
    expectValid(next);
    expect(layout(next as TimelineHierarchy)).toEqual(expected);
  });

  test('is null for an item that is not in the hierarchy', () => {
    expect(moveItem(build(), row(99), { container: null })).toBeNull();
    expect(moveItem(build(), sec(99), { container: null })).toBeNull();
  });

  test('refuses to nest a section or use a section that does not exist', () => {
    expect(() => moveItem(build(), sec(100), { container: 200 })).toThrow(/inside another section/);
    expect(() => moveItem(build(), row(10), { container: 99 })).toThrow(/does not exist/);
  });

  test('does not confuse a row id with a section id', () => {
    const h: TimelineHierarchy = { items: [row(100), sec(100)], sections: [section(100, [])] };
    expect(moveItem(h, sec(100), { container: null, index: 0 })?.items).toEqual([sec(100), row(100)]);
  });

  test('never mutates the hierarchy it was given', () => {
    const h = build();
    const before = JSON.stringify(h);
    moveItem(h, row(11), { container: 200 });
    moveItem(h, sec(100), { container: null });
    expect(JSON.stringify(h)).toBe(before);
  });

  test('moving N rows into a section composes from the same primitive', () => {
    const next = [row(10), row(13), row(14)].reduce<TimelineHierarchy>(
      (h, item) => moveItem(h, item, { container: 300 }) ?? h,
      build(),
    );
    expectValid(next);
    expect(layout(next)).toEqual([{ 100: [11, 12] }, { 200: [] }, { 300: [10, 13, 14] }]);
  });
});

describe('placeBeside', () => {
  test.each([
    ['above a root row', row(13), 'top', { container: null, index: 2 }],
    ['below a root row', row(13), 'bottom', { container: null, index: 3 }],
    ['above a section', sec(200), 'top', { container: null, index: 3 }],
    ['inside the container of a grouped row', row(12), 'bottom', { container: 100, index: 2 }],
    ['at the end of the root for an anchor that is gone', row(99), 'top', { container: null }],
  ] as const)('%s', (_name, anchor, edge, expected) => {
    expect(placeBeside(build(), anchor, edge)).toEqual(expected);
  });

  test('counts the index without the item being moved', () => {
    // Row 10 is above row 13 at the root; once it is lifted out, 13 sits one place earlier.
    expect(placeBeside(build(), row(13), 'bottom', row(10))).toEqual({ container: null, index: 2 });
  });
});

describe('insertItem', () => {
  test.each([
    ['at the root end', row(50), { container: null }, [10, { 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }, 50]],
    [
      'first at the root',
      row(50),
      { container: null, index: 0 },
      [50, 10, { 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }],
    ],
    ['last in a section', row(50), { container: 100 }, [10, { 100: [11, 12, 50] }, 13, { 200: [14] }, { 300: [] }]],
    [
      'first in a section',
      row(50),
      { container: 100, index: 0 },
      [10, { 100: [50, 11, 12] }, 13, { 200: [14] }, { 300: [] }],
    ],
    ['into an empty section', row(50), { container: 300 }, [10, { 100: [11, 12] }, 13, { 200: [14] }, { 300: [50] }]],
  ] as const)('%s', (_name, item, destination, expected) => {
    const next = insertItem(build(), item, destination);
    expectValid(next, [...ROW_IDS, 50]);
    expect(layout(next)).toEqual(expected);
  });

  test('after a neighbor, in its container', () => {
    const h = build();
    expect(layout(insertItem(h, row(50), placeBeside(h, row(11), 'bottom')))).toEqual([
      10,
      { 100: [11, 50, 12] },
      13,
      { 200: [14] },
      { 300: [] },
    ]);
  });

  test('refuses an unknown section and a nested section', () => {
    expect(() => insertItem(build(), row(50), { container: 99 })).toThrow(/does not exist/);
    expect(() => insertItem(build(), sec(50), { container: 100 })).toThrow(/inside another section/);
  });
});

describe('removeItem', () => {
  test.each([
    ['a root row', row(10), [{ 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }]],
    ['a grouped row', row(11), [10, { 100: [12] }, 13, { 200: [14] }, { 300: [] }]],
    ['the only row of a section', row(14), [10, { 100: [11, 12] }, 13, { 200: [] }, { 300: [] }]],
    ['an empty section', sec(300), [10, { 100: [11, 12] }, 13, { 200: [14] }]],
    ['an item that is not there', row(99), [10, { 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }]],
  ] as const)('%s', (_name, item, expected) => {
    expect(layout(removeItem(build(), item))).toEqual(expected);
  });

  test('removing a section drops its definition and leaves its rows for the caller', () => {
    const next = removeItem(build(), sec(100));
    expect(next.sections.map(s => s.id)).toEqual([200, 300]);
    expect(validateTimelineHierarchy(next, ROW_IDS).join()).toMatch(/row 11 .*nowhere/);
  });
});

describe('flattenSection', () => {
  test.each([
    ['promotes rows into the section position, in order', 100, [10, 11, 12, 13, { 200: [14] }, { 300: [] }]],
    ['removes an empty section', 300, [10, { 100: [11, 12] }, 13, { 200: [14] }]],
    ['leaves everything alone for an unknown section', 99, [10, { 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }]],
  ])('%s', (_name, sectionId, expected) => {
    const next = flattenSection(build(), sectionId);
    expectValid(next);
    expect(layout(next)).toEqual(expected);
  });

  test('flattening every section ungroups the whole timeline', () => {
    const h = build();
    const next = h.sections.reduce((acc, s) => flattenSection(acc, s.id), h);
    expectValid(next);
    expect(next).toEqual({ items: [row(10), row(11), row(12), row(13), row(14)], sections: [] });
  });

  test('a section missing from the root has its rows appended rather than dropped', () => {
    const h = build();
    h.items = h.items.filter(item => item.id !== 100);
    expect(flattenSection(h, 100).items.slice(-2)).toEqual([row(11), row(12)]);
  });
});

describe('addSection', () => {
  test('appends by default and can be placed after another item', () => {
    const created = section(400, []);
    expect(layout(addSection(build(), created)).at(-1)).toEqual({ 400: [] });

    const h = build();
    const next = addSection(h, created, placeBeside(h, row(10), 'bottom'));
    expectValid(next);
    expect(next.items[1]).toEqual(sec(400));
  });

  test('can bring along rows that are not placed yet', () => {
    const next = addSection(build(), section(400, [20, 21]));
    expectValid(next, [...ROW_IDS, 20, 21]);
  });
});

describe('shiftItem', () => {
  test('moves a root row or section past its neighbor in both directions', () => {
    expect(shiftItem(build(), row(10), 'down')?.items.slice(0, 2)).toEqual([sec(100), row(10)]);
    expect(shiftItem(build(), sec(200), 'up')?.items.slice(2, 4)).toEqual([sec(200), row(13)]);
  });

  test('moves a grouped row within its own section only', () => {
    const down = shiftItem(build(), row(11), 'down');
    expect(down?.sections[0].rowIds).toEqual([12, 11]);
    expect(down?.items).toEqual(build().items);
  });

  test('refuses past either end of a container, and never leaves a section', () => {
    expect(shiftItem(build(), row(11), 'up')).toBeNull();
    expect(shiftItem(build(), row(12), 'down')).toBeNull();
    expect(shiftItem(build(), row(14), 'up')).toBeNull();
    expect(shiftItem(build(), row(10), 'up')).toBeNull();
    expect(shiftItem(build(), sec(300), 'down')).toBeNull();
  });

  test('refuses something that is not there', () => {
    expect(shiftItem(build(), row(99), 'up')).toBeNull();
  });
});

describe('applyTimelineItemDrop', () => {
  const drop = (source: TimelineItemRef, target: TimelineItemRef, edge: 'bottom' | 'top' | null) =>
    applyTimelineItemDrop(build(), { edge, source, target });

  test.each([
    ['a root row above another', row(13), row(10), 'top', [13, 10, { 100: [11, 12] }, { 200: [14] }, { 300: [] }]],
    ['a root row below another', row(10), row(13), 'bottom', [{ 100: [11, 12] }, 13, 10, { 200: [14] }, { 300: [] }]],
    ['a root row into a section', row(10), sec(100), null, [{ 100: [11, 12, 10] }, 13, { 200: [14] }, { 300: [] }]],
    ['a row into an empty section', row(10), sec(300), null, [{ 100: [11, 12] }, 13, { 200: [14] }, { 300: [10] }]],
    ['a grouped row out to the root', row(11), row(10), 'top', [11, 10, { 100: [12] }, 13, { 200: [14] }, { 300: [] }]],
    [
      'a grouped row out by its own section edge',
      row(11),
      sec(100),
      'top',
      [10, 11, { 100: [12] }, 13, { 200: [14] }, { 300: [] }],
    ],
    ['a row between sections', row(11), row(14), 'bottom', [10, { 100: [12] }, 13, { 200: [14, 11] }, { 300: [] }]],
    ['a row within its section', row(12), row(11), 'top', [10, { 100: [12, 11] }, 13, { 200: [14] }, { 300: [] }]],
    ['a section against another', sec(200), sec(100), 'top', [10, { 200: [14] }, { 100: [11, 12] }, 13, { 300: [] }]],
    ['a section onto a root row', sec(200), row(10), 'top', [{ 200: [14] }, 10, { 100: [11, 12] }, 13, { 300: [] }]],
    [
      'a row onto a root row that is gone, appending',
      row(10),
      row(99),
      'bottom',
      [{ 100: [11, 12] }, 13, { 200: [14] }, { 300: [] }, 10],
    ],
  ] as const)('%s', (_name, source, target, edge, expected) => {
    const next = drop(source, target, edge);
    expectValid(next);
    expect(layout(next as TimelineHierarchy)).toEqual(expected);
  });

  test.each([
    ['onto itself', row(10), row(10), 'top'],
    ['a section onto itself', sec(100), sec(100), 'bottom'],
    ['a row onto the section it is already in', row(11), sec(100), null],
    ['a section into a section', sec(200), row(11), 'bottom'],
  ] as const)('is a no-op for %s', (_name, source, target, edge) => {
    expect(drop(source, target, edge)).toBeNull();
  });

  test('is null when the dragged item is not in the hierarchy', () => {
    expect(
      applyTimelineItemDrop({ items: [], sections: [] }, { edge: 'top', source: row(10), target: row(99) }),
    ).toBeNull();
  });

  test('never mutates the hierarchy it was given', () => {
    const h = build();
    const before = JSON.stringify(h);
    applyTimelineItemDrop(h, { edge: null, source: row(11), target: sec(200) });
    expect(JSON.stringify(h)).toBe(before);
  });
});

describe('findItem', () => {
  test.each([
    [row(10), { container: null, index: 0 }],
    [row(12), { container: 100, index: 1 }],
    [sec(200), { container: null, index: 3 }],
    [row(99), null],
    [sec(99), null],
  ] as const)('%j', (item, expected) => {
    expect(findItem(build(), item)).toEqual(expected);
  });
});

describe('getRenderableTimelineItems', () => {
  function buildTimeline() {
    return {
      items: [row(10), sec(100)],
      rows: [{ id: 10 }, { id: 11 }] as Timeline['rows'],
      sections: [section(100, [11])],
    };
  }

  test('passes a consistent hierarchy through untouched', () => {
    const timeline = buildTimeline();
    expect(getRenderableTimelineItems(timeline)).toEqual(timeline.items);
  });

  test('drops a ref to a section that no longer exists', () => {
    const timeline = buildTimeline();
    timeline.sections = [];
    expect(getRenderableTimelineItems(timeline)).toEqual([row(10)]);
  });

  test('drops a ref to a row that no longer exists', () => {
    const timeline = buildTimeline();
    timeline.rows = [{ id: 11 }] as Timeline['rows'];
    expect(getRenderableTimelineItems(timeline)).toEqual([sec(100)]);
  });

  test('drops a duplicate ref, keeping the first', () => {
    // The crash this exists for: a ghost `section-0` left in items, plus a new section that
    // reuses id 0, is two entries keyed `section-0` - which throws out of the keyed each.
    const timeline = buildTimeline();
    timeline.items = [sec(100), row(10), sec(100)];
    expect(getRenderableTimelineItems(timeline)).toEqual([sec(100), row(10)]);
  });

  test('a row and a section may share an id without colliding', () => {
    const timeline = buildTimeline();
    timeline.items = [sec(100), row(100)];
    timeline.rows = [{ id: 100 }] as Timeline['rows'];
    expect(getRenderableTimelineItems(timeline)).toHaveLength(2);
  });

  test('drops a root ref to a row a section has also claimed', () => {
    const timeline = buildTimeline();
    timeline.items = [row(11), sec(100)];
    expect(getRenderableTimelineItems(timeline)).toEqual([sec(100)]);
  });

  test('tolerates a timeline with nothing in it', () => {
    expect(getRenderableTimelineItems({ items: [], rows: [], sections: [] })).toEqual([]);
  });
});
