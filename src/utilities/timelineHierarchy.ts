/**
 * The timeline hierarchy: where every row and section sits. This module is the only place that
 * knows how, so the store, the drag and drop code and the menus all go through it.
 *
 * The representation is `timeline.items` (the ordered root: rows and sections) plus
 * `section.rowIds` (the ordered rows of each section). `timeline.rows` holds the row definitions
 * and is not touched here; creating or deleting a row definition is the caller's job.
 *
 * The invariant: every row is placed exactly once - at the root, or in exactly one section - and
 * every section appears exactly once at the root. `validateTimelineHierarchy` checks it.
 *
 * Everything here is pure and returns a new hierarchy. Invalid destinations (nesting a section,
 * an unknown section) throw; an item that is not in the hierarchy is reported with `null` by the
 * operations that need to find it.
 */

import type { Timeline, TimelineDropEdge, TimelineItemRef, TimelineSection } from '../types/timeline';

export type TimelineHierarchy = Pick<Timeline, 'items' | 'sections'>;

/**
 * A place to put an item: the root (`container` null) or a section's rows. `index` is a position
 * in that list once the item being moved is out of it; omitted means the end.
 */
export type TimelineDestination = { container: number | null; index?: number };

type Location = { container: number | null; index: number };

const isSame = (a: TimelineItemRef, b: TimelineItemRef) => a.type === b.type && a.id === b.id;
const rowRef = (id: number): TimelineItemRef => ({ id, type: 'row' });

/** The ordered list of one container as refs, whether it is the root or a section. */
function listContainer(hierarchy: TimelineHierarchy, container: number | null): TimelineItemRef[] {
  return container === null
    ? hierarchy.items
    : (hierarchy.sections.find(section => section.id === container)?.rowIds ?? []).map(rowRef);
}

function editContainer(
  hierarchy: TimelineHierarchy,
  container: number | null,
  edit: (list: TimelineItemRef[]) => TimelineItemRef[],
): TimelineHierarchy {
  if (container === null) {
    return { ...hierarchy, items: edit(hierarchy.items) };
  }
  return {
    ...hierarchy,
    sections: hierarchy.sections.map(section =>
      section.id === container ? { ...section, rowIds: edit(section.rowIds.map(rowRef)).map(ref => ref.id) } : section,
    ),
  };
}

/** Where an item currently is, or null if the hierarchy does not place it. */
export function findItem(hierarchy: TimelineHierarchy, item: TimelineItemRef): Location | null {
  if (item.type === 'row') {
    const section = hierarchy.sections.find(s => s.rowIds.includes(item.id));
    if (section) {
      return { container: section.id, index: section.rowIds.indexOf(item.id) };
    }
  }
  const index = hierarchy.items.findIndex(candidate => isSame(candidate, item));
  return index > -1 ? { container: null, index } : null;
}

/**
 * The destination next to `anchor`, in whichever container holds it. Pass `moving` when the item
 * being moved is in that same list, so the index is counted without it. An anchor that is not in
 * the hierarchy gives the end of the root.
 */
export function placeBeside(
  hierarchy: TimelineHierarchy,
  anchor: TimelineItemRef,
  edge: TimelineDropEdge,
  moving?: TimelineItemRef,
): TimelineDestination {
  const location = findItem(hierarchy, anchor);
  if (!location) {
    return { container: null };
  }
  const siblings = listContainer(hierarchy, location.container).filter(ref => !moving || !isSame(ref, moving));
  const index = siblings.findIndex(ref => isSame(ref, anchor));
  return { container: location.container, index: edge === 'bottom' ? index + 1 : index };
}

/** Places an item that is not in the hierarchy yet. Sections only go at the root. */
export function insertItem(
  hierarchy: TimelineHierarchy,
  item: TimelineItemRef,
  destination: TimelineDestination,
): TimelineHierarchy {
  const { container, index } = destination;
  if (item.type === 'section' && container !== null) {
    throw new Error('A section cannot be placed inside another section');
  }
  if (container !== null && !hierarchy.sections.some(section => section.id === container)) {
    throw new Error(`Section ${container} does not exist`);
  }
  return editContainer(hierarchy, container, list => {
    const at = index ?? list.length;
    return [...list.slice(0, at), item, ...list.slice(at)];
  });
}

/** Takes an item's ref out of its container; a section's definition and rows are left alone. */
function detach(hierarchy: TimelineHierarchy, item: TimelineItemRef): TimelineHierarchy {
  return {
    items: hierarchy.items.filter(candidate => !isSame(candidate, item)),
    sections:
      item.type === 'row'
        ? hierarchy.sections.map(section =>
            section.rowIds.includes(item.id)
              ? { ...section, rowIds: section.rowIds.filter(id => id !== item.id) }
              : section,
          )
        : hierarchy.sections,
  };
}

/**
 * Takes an item out of the hierarchy. Removing a section also removes its definition; the rows
 * it held are left unplaced, so the caller either deletes them or uses `flattenSection` instead.
 */
export function removeItem(hierarchy: TimelineHierarchy, item: TimelineItemRef): TimelineHierarchy {
  const { items, sections } = detach(hierarchy, item);
  return { items, sections: item.type === 'section' ? sections.filter(section => section.id !== item.id) : sections };
}

/**
 * Moves a placed item to a new destination - the one operation behind every drag, nudge and menu
 * move. A section keeps its rows. Null if the item is not in the hierarchy.
 */
export function moveItem(
  hierarchy: TimelineHierarchy,
  item: TimelineItemRef,
  destination: TimelineDestination,
): TimelineHierarchy | null {
  return findItem(hierarchy, item) ? insertItem(detach(hierarchy, item), item, destination) : null;
}

/** Moves an item one place within its own container. Null at either end, or if not placed. */
export function shiftItem(
  hierarchy: TimelineHierarchy,
  item: TimelineItemRef,
  direction: 'down' | 'up',
): TimelineHierarchy | null {
  const location = findItem(hierarchy, item);
  const neighbor =
    location && listContainer(hierarchy, location.container)[location.index + (direction === 'up' ? -1 : 1)];
  return neighbor
    ? moveItem(hierarchy, item, placeBeside(hierarchy, neighbor, direction === 'up' ? 'top' : 'bottom', item))
    : null;
}

/** Adds a new section, with any rows it already lists, at the root. */
export function addSection(
  hierarchy: TimelineHierarchy,
  section: TimelineSection,
  destination: TimelineDestination = { container: null },
): TimelineHierarchy {
  return insertItem(
    { ...hierarchy, sections: [...hierarchy.sections, section] },
    { id: section.id, type: 'section' },
    destination,
  );
}

/** Removes a section and puts its rows, in order, where the section was. */
export function flattenSection(hierarchy: TimelineHierarchy, sectionId: number): TimelineHierarchy {
  const section = hierarchy.sections.find(s => s.id === sectionId);
  if (!section) {
    return hierarchy;
  }
  const rows = section.rowIds.map(rowRef);
  const at = hierarchy.items.findIndex(item => isSame(item, { id: sectionId, type: 'section' }));
  const items =
    at < 0
      ? [...hierarchy.items, ...rows]
      : [...hierarchy.items.slice(0, at), ...rows, ...hierarchy.items.slice(at + 1)];
  return { items, sections: hierarchy.sections.filter(s => s.id !== sectionId) };
}

/**
 * Turns a drop into a move. `edge` is the side of `target` the pointer was nearest; null means
 * dropped onto a section itself, which puts a row inside it. Null when the drop changes nothing
 * or is not allowed: onto itself, a row onto its own section, a section into a section.
 */
export function applyTimelineItemDrop(
  hierarchy: TimelineHierarchy,
  drop: { edge: TimelineDropEdge | null; source: TimelineItemRef; target: TimelineItemRef },
): TimelineHierarchy | null {
  const { edge, source, target } = drop;

  if (isSame(source, target)) {
    return null;
  }

  if (source.type === 'row' && target.type === 'section' && edge === null) {
    if (findItem(hierarchy, source)?.container === target.id) {
      return null;
    }
    return moveItem(hierarchy, source, { container: target.id });
  }

  // Sections do not nest, so a row inside a section is not a place for one.
  if (source.type === 'section' && (findItem(hierarchy, target)?.container ?? null) !== null) {
    return null;
  }

  return moveItem(hierarchy, source, placeBeside(hierarchy, target, edge ?? 'top', source));
}

/**
 * The item order with everything unrenderable dropped: refs to rows or sections that no longer
 * exist, repeats of a ref, and rows a section has also claimed.
 *
 * Mutations keep `items` consistent themselves; this heals a view already written inconsistently.
 * A stale ref is worse than invisible - ids are handed out as max+1 over what exists, so a reused
 * id collides with its ghost and the keyed each throws, taking the whole timeline down.
 */
export function getRenderableTimelineItems(timeline: Pick<Timeline, 'items' | 'rows' | 'sections'>): TimelineItemRef[] {
  const rowIds = new Set((timeline.rows || []).map(row => row.id));
  const sectionIds = new Set((timeline.sections || []).map(section => section.id));
  const groupedRowIds = new Set((timeline.sections || []).flatMap(section => section.rowIds));
  const seen = new Set<string>();

  return (timeline.items || []).filter(item => {
    const key = `${item.type}-${item.id}`;
    if (seen.has(key)) {
      return false;
    }
    if (item.type === 'section' ? !sectionIds.has(item.id) : !rowIds.has(item.id) || groupedRowIds.has(item.id)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Every way the hierarchy breaks the invariant, as readable strings; empty when it holds. For
 * tests and dev assertions - nothing at runtime repairs what this reports.
 */
export function validateTimelineHierarchy(hierarchy: TimelineHierarchy, rowIds: number[]): string[] {
  const problems: string[] = [];
  const known = new Set(rowIds);
  const placements = new Map<number, string[]>(rowIds.map(id => [id, []]));
  const place = (id: number, where: string) => {
    if (known.has(id)) {
      placements.get(id)?.push(where);
    } else {
      problems.push(`${where} references row ${id}, which does not exist`);
    }
  };

  const sectionRefs = new Map<number, number>();
  hierarchy.items.forEach(item => {
    if (item.type === 'row') {
      place(item.id, 'root');
    } else {
      sectionRefs.set(item.id, (sectionRefs.get(item.id) ?? 0) + 1);
      if (!hierarchy.sections.some(section => section.id === item.id)) {
        problems.push(`root references section ${item.id}, which does not exist`);
      }
    }
  });
  hierarchy.sections.forEach(section => {
    section.rowIds.forEach(id => place(id, `section ${section.id}`));
    if (sectionRefs.get(section.id) !== 1) {
      problems.push(`section ${section.id} appears ${sectionRefs.get(section.id) ?? 0} times at the root`);
    }
  });
  placements.forEach((where, id) => {
    if (where.length !== 1) {
      problems.push(`row ${id} is placed ${where.length} times (${where.join(', ') || 'nowhere'})`);
    }
  });

  return problems;
}
