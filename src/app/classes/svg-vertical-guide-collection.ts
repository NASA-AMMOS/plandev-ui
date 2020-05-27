import * as d3 from 'd3';
import { getUnixEpochTime } from '../functions';
import { Guide, TimeRange } from '../types';
import { calcBounds, SvgVerticalGuide } from './svg-vertical-guide';

type Overlap = {
  overlappingGuideIds: { [id: string]: SvgVerticalGuide };
  svgVerticalGuide: SvgVerticalGuide;
};

type OverlapMap = { [id: string]: Overlap };

/**
 * Convenience function for getting a tooltip string for a numbered guide.
 */
function numberedGuideTooltipText(svgVerticalGuide: SvgVerticalGuide) {
  const { numberedCount, guide } = svgVerticalGuide;
  const { label, timestamp } = guide;
  return `${numberedCount}. ${label.text} (${timestamp})<br>`;
}

export class SvgVerticalGuideCollection {
  public container: SVGGElement;
  public containerHeight: number;
  public containerWidth: number;
  public guides: SvgVerticalGuide[];
  public viewTimeRange: TimeRange;
  public xScale: d3.ScaleTime<number, number>;

  constructor(
    container: SVGGElement,
    containerHeight: number,
    containerWidth: number,
    guides: Guide[],
    viewTimeRange: TimeRange,
    xScale: d3.ScaleTime<number, number>,
  ) {
    this.container = container;
    this.containerHeight = containerHeight;
    this.containerWidth = containerWidth;
    this.viewTimeRange = viewTimeRange;
    this.xScale = xScale;
    this.clearAll();
    this.setGuides(guides);
  }

  /**
   * Removes all guides from the document.
   */
  clearAll() {
    d3.select(this.container).selectAll(`.guide-group`).remove();
  }

  /**
   * Add all guides to the document, update the labels, then update the tooltips.
   * We draw in reverse order so we can update the label with ellipsis properly.
   */
  drawAll(visible = true) {
    for (let i = this.guides.length - 1; i >= 0; --i) {
      const curr = this.guides[i];
      const prev = this.guides[i + 1];
      curr.draw(visible);
      curr.updateLabelWithEllipsis(prev);
    }
    this.updateNumberedGuideTooltips();
  }

  /**
   * Loop through all the guides (sorted time ascending)
   * and draw them so their bounding-boxes are available on the document.
   * For each guide, determine if it's circle overlaps with it's previous
   * neighbor. If there is an overlap we record it in a map.
   * If we encounter a previous node already in the overlap map,
   * then we add all of it's overlapping children to the current node,
   * and remove the previous node from the overlap map.
   * This takes care of transitive overlaps.
   */
  getOverlapMap(): OverlapMap {
    this.guides.sort((a, b) => a.guide.time - b.guide.time);
    const overlapMap: OverlapMap = {};
    for (let i = 0; i < this.guides.length; ++i) {
      const curr = this.guides[i];
      const prev = this.guides[i - 1];
      curr.draw(false);
      overlapMap[curr.id] = {
        overlappingGuideIds: {},
        svgVerticalGuide: curr,
      };
      if (prev) {
        const bounds = calcBounds(prev.circle, curr.circle);
        if (bounds && bounds.percentage > 10) {
          if (overlapMap[prev.id]) {
            overlapMap[curr.id].overlappingGuideIds = {
              ...overlapMap[curr.id].overlappingGuideIds,
              ...overlapMap[prev.id].overlappingGuideIds,
            };
            delete overlapMap[prev.id];
          }
          overlapMap[curr.id] = {
            overlappingGuideIds: {
              ...overlapMap[curr.id].overlappingGuideIds,
              [prev.id]: prev,
            },
            svgVerticalGuide: curr,
          };
        }
      }
    }
    this.clearAll();
    return overlapMap;
  }

  /**
   * Set up SVG guides.
   * First transform Guides into SvgVerticalGuides,
   * calculate the UNIX time of each guide, and use our x-scale
   * to calculate the initial guide position.
   * Then we remove (via filter) any guides that do not fall in the given draw area.
   * Finally we determine which guides are overlapping and
   * update our list of guides accordingly with correct tooltip information.
   */
  setGuides(guides: Guide[]) {
    this.guides = guides
      .map(guide => {
        const time = getUnixEpochTime(guide.timestamp);
        return new SvgVerticalGuide(
          this.containerHeight,
          this.containerWidth,
          {
            ...guide,
            position: this.xScale(time),
            time,
          },
          this.container,
        );
      })
      .filter(
        ({ guide }) =>
          guide.position >= 0 && guide.position <= this.containerWidth,
      );

    const overlapMap = this.getOverlapMap();
    const newGuides = Object.values(overlapMap);
    this.guides = [];

    for (const { svgVerticalGuide, overlappingGuideIds } of newGuides) {
      const overlappingGuides = Object.values(overlappingGuideIds);
      const overlappingGuidesLength = overlappingGuides.length;

      if (overlappingGuidesLength) {
        let tooltips = [svgVerticalGuide.guide];
        svgVerticalGuide.collapsedCount += overlappingGuidesLength;
        tooltips = tooltips.concat(overlappingGuides.map(({ guide }) => guide));
        tooltips.sort((a, b) => a.time - b.time);
        svgVerticalGuide.tooltipText = tooltips
          .map(({ label, timestamp }) => `${label.text} (${timestamp})`)
          .join('<br>');
      }

      this.guides.push(svgVerticalGuide);
    }
  }

  /**
   * Build a tooltip string for numbered guides.
   */
  updateNumberedGuideTooltips() {
    let tooltipMap = {};
    let i = this.guides.length - 1;

    while (i >= 0) {
      let curr = this.guides[i];

      if (curr.numberedCount === 1) {
        const ids = [curr.id];
        let tooltipText = numberedGuideTooltipText(curr);
        curr = this.guides[--i];

        // Accumulate tooltip text for numbered tooltips from 1..n.
        while (i >= 0 && curr.numberedCount !== 0 && curr.numberedCount !== 1) {
          ids.push(curr.id);
          tooltipText += numberedGuideTooltipText(curr);
          curr = this.guides[--i];
        }

        // Map the accumulated tooltip text to the given guide ids.
        tooltipMap = {
          ...tooltipMap,
          ...ids.reduce((map, id) => {
            map[id] = tooltipText;
            return map;
          }, {}),
        };
      } else {
        --i;
      }
    }

    // Set the tooltip text based on the tooltip map.
    for (const guide of this.guides) {
      const tooltip: string | undefined = tooltipMap[guide.id];
      if (tooltip) {
        guide.tooltipText = tooltip;
      }
    }
  }
}
