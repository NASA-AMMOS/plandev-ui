import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { TimelineItemRef } from '../types/timeline';
import { resolveSectionDropEdge } from './timeline';

/** Payload every timeline row/section draggable carries. `sourceSectionId` null means root level. */
export type TimelineDragData = {
  itemId: number;
  itemType: TimelineItemRef['type'];
  sourceSectionId: number | null;
};

export type TimelineDropHandler = (
  sourceData: TimelineDragData,
  targetItemId: number,
  targetItemType: TimelineItemRef['type'],
  targetSectionId: number | null,
  edge: Edge | null,
) => void;

/** Params shared by the row/section draggable and drop target actions. */
export type TimelineItemParams = {
  itemId: number;
  itemType: TimelineItemRef['type'];
  sectionId: number | null;
};

/** The feedback classes the actions add. Also the list a cancelled drag has to sweep up. */
export const TIMELINE_DRAG_CLASSES = [
  'dragging',
  'drop-target-active',
  'drop-indicator-top',
  'drop-indicator-bottom',
  'section-accepting-row',
];

/**
 * The timeline and the timeline editor present the same hierarchy and so need the same four drag
 * actions. They differ only in which surfaces start a drag, so that is the one thing a caller
 * supplies. Everything else - the drop payload, the edge feedback, the cleanup bookkeeping - is
 * identical, and was duplicated between the two components before this.
 */
export function createTimelineDragActions(options: {
  /** Whether a press at this element should begin a drag, rather than reach the control under it. */
  isDragSurface: (element: Element | null) => boolean;
  /** Applies the resulting hierarchy. Called once per drop, by whichever target handled it. */
  onDrop: TimelineDropHandler;
}) {
  const { isDragSurface, onDrop } = options;

  // Every action registers its teardown here so the component can release them all on destroy. A
  // Set rather than an array so an action's own destroy() can drop just its entry; as an array it
  // only ever grew, holding every detached row alive through a session's worth of reorders.
  const cleanupFunctions: Set<() => void> = new Set();

  /**
   * Wraps a library cleanup in the Svelte action contract, tracking it for bulk teardown. The
   * Set doubles as the "still registered" flag: `delete` reports whether this entry was still
   * there, so a cleanup runs exactly once whether it is reached through destroy() or destroyAll().
   */
  function toAction<Params>(cleanup: () => void, setParams: (next: Params) => void) {
    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        if (cleanupFunctions.delete(cleanup)) {
          cleanup();
        }
      },
      update(nextParams: Params) {
        setParams(nextParams);
      },
    };
  }

  function updateDropIndicator(node: HTMLElement, edge: Edge | null) {
    node.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
    if (edge === 'top') {
      node.classList.add('drop-indicator-top');
    } else if (edge === 'bottom') {
      node.classList.add('drop-indicator-bottom');
    }
  }

  function removeDropIndicator(node: HTMLElement) {
    node.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
  }

  /** Reads the geometry off the DOM; the decision itself lives in a tested utility. */
  function sectionDropEdge(element: Element, clientY: number, sourceData: TimelineDragData) {
    return resolveSectionDropEdge(element.getBoundingClientRect(), clientY, sourceData.itemType);
  }

  /** A row or a section, draggable from whichever surfaces the caller counts as a handle. */
  function makeDraggable(node: HTMLElement, initialParams: TimelineItemParams) {
    let params = initialParams;

    const cleanup = draggable({
      canDrag: ({ input }) => isDragSurface(document.elementFromPoint(input.clientX, input.clientY)),
      element: node,
      getInitialData: () =>
        ({
          itemId: params.itemId,
          itemType: params.itemType,
          sourceSectionId: params.sectionId,
        }) as TimelineDragData,
      onDragStart: () => node.classList.add('dragging'),
      onDrop: () => node.classList.remove('dragging'),
    });

    return toAction<TimelineItemParams>(cleanup, next => (params = next));
  }

  /** A row, which accepts a drop above or below itself. */
  function makeDropTarget(node: HTMLElement, initialParams: TimelineItemParams) {
    let params = initialParams;

    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => {
        const sourceData = source.data as TimelineDragData;
        // Only our own row and section draggables; activity drags land elsewhere.
        if (sourceData.itemType !== 'section' && sourceData.itemType !== 'row') {
          return false;
        }
        // Sections do not nest, and nothing drops onto itself.
        if (sourceData.itemType === 'section' && params.sectionId !== null) {
          return false;
        }
        return !(sourceData.itemId === params.itemId && sourceData.itemType === params.itemType);
      },
      element: node,
      getData: ({ element, input }) =>
        attachClosestEdge(
          { itemId: params.itemId, itemType: params.itemType, sectionId: params.sectionId },
          { allowedEdges: ['top', 'bottom'], element, input },
        ),
      onDrag: ({ self }) => updateDropIndicator(node, extractClosestEdge(self.data)),
      onDragEnter: ({ self }) => {
        node.classList.add('drop-target-active');
        updateDropIndicator(node, extractClosestEdge(self.data));
      },
      onDragLeave: () => {
        node.classList.remove('drop-target-active');
        removeDropIndicator(node);
      },
      onDrop: ({ self, source }) => {
        node.classList.remove('drop-target-active');
        removeDropIndicator(node);
        onDrop(
          source.data as TimelineDragData,
          params.itemId,
          params.itemType,
          params.sectionId,
          extractClosestEdge(self.data),
        );
      },
    });

    return toAction<TimelineItemParams>(cleanup, next => (params = next));
  }

  /**
   * A section header is both a reorder target (its edges) and a container that accepts rows
   * dropped onto its middle. Both have to live in a SINGLE drop target: two registered on one
   * element leaves only the last active, which swallowed the top edge and made the slot above a
   * leading section unreachable.
   */
  function makeSectionDropTarget(node: HTMLElement, initialParams: { sectionId: number }) {
    let params = initialParams;

    function showFeedback(edge: Edge | null) {
      if (edge === null) {
        removeDropIndicator(node);
        node.classList.add('section-accepting-row');
      } else {
        node.classList.remove('section-accepting-row');
        updateDropIndicator(node, edge);
      }
    }

    function clearFeedback() {
      node.classList.remove('section-accepting-row', 'drop-target-active');
      removeDropIndicator(node);
    }

    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => {
        const sourceData = source.data as TimelineDragData;
        if (sourceData.itemType !== 'row' && sourceData.itemType !== 'section') {
          return false;
        }
        // A section cannot be dropped onto itself, but a row already inside this section can
        // still be dragged to an edge to move it back out to the root level.
        return !(sourceData.itemType === 'section' && sourceData.itemId === params.sectionId);
      },
      element: node,
      onDrag: ({ location, self, source }) => {
        showFeedback(sectionDropEdge(self.element, location.current.input.clientY, source.data as TimelineDragData));
      },
      onDragEnter: ({ location, self, source }) => {
        node.classList.add('drop-target-active');
        showFeedback(sectionDropEdge(self.element, location.current.input.clientY, source.data as TimelineDragData));
      },
      onDragLeave: clearFeedback,
      onDrop: ({ location, self, source }) => {
        const sourceData = source.data as TimelineDragData;
        const edge = sectionDropEdge(self.element, location.current.input.clientY, sourceData);
        clearFeedback();
        onDrop(sourceData, params.sectionId, 'section', null, edge);
      },
    });

    return toAction<{ sectionId: number }>(cleanup, next => (params = next));
  }

  /**
   * The "Drag a row here" placeholder, which otherwise pointed at a spot that accepted nothing.
   * Everything landing here goes INTO the section (edge null); its header edges do the reordering.
   */
  function makeEmptySectionDropTarget(node: HTMLElement, initialParams: { sectionId: number }) {
    let params = initialParams;

    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => (source.data as TimelineDragData).itemType === 'row',
      element: node,
      onDragEnter: () => node.classList.add('section-accepting-row'),
      onDragLeave: () => node.classList.remove('section-accepting-row'),
      onDrop: ({ source }) => {
        node.classList.remove('section-accepting-row');
        onDrop(source.data as TimelineDragData, params.sectionId, 'section', null, null);
      },
    });

    return toAction<{ sectionId: number }>(cleanup, next => (params = next));
  }

  /**
   * Clears feedback classes left behind when a drag is cancelled and the target's own callbacks do
   * not fire. Scoped to the given root: the timeline and the editor use the same class names.
   */
  function clearDragFeedback(root: HTMLElement | undefined | null) {
    if (!root) {
      return;
    }
    TIMELINE_DRAG_CLASSES.forEach(cls =>
      root.querySelectorAll(`.${cls}`).forEach(element => element.classList.remove(cls)),
    );
  }

  /**
   * Releases every action still registered. The actions' own destroy() calls are what normally
   * run; this covers a teardown where the component goes away before its children unmount.
   */
  function destroyAll() {
    [...cleanupFunctions].forEach(cleanup => {
      if (cleanupFunctions.delete(cleanup)) {
        cleanup();
      }
    });
  }

  return {
    clearDragFeedback,
    destroyAll,
    makeDraggable,
    makeDropTarget,
    makeEmptySectionDropTarget,
    makeSectionDropTarget,
    removeDropIndicator,
    /** For an action outside this set - the y-axis list - that still wants the same bookkeeping. */
    toAction,
    updateDropIndicator,
  };
}
