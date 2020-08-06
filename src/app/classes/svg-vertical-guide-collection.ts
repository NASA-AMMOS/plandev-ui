import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import * as d3 from 'd3';
import { Guide, TimeRange } from '../types';
import { calcBounds, SvgVerticalGuide } from './svg-vertical-guide';

type Overlap = {
  overlappingGuideIds: { [id: string]: SvgVerticalGuide };
  svgVerticalGuide: SvgVerticalGuide;
};

type OverlapMap = { [id: string]: Overlap };

export class SvgVerticalGuideCollection {
  public bandContainer: HTMLDivElement;
  public container: SVGGElement;
  public containerHeight: number;
  public containerWidth: number;
  public guides: SvgVerticalGuide[];
  public viewTimeRange: TimeRange;
  public xScale: d3.ScaleTime<number, number>;

  constructor(
    bandContainer: HTMLDivElement,
    container: SVGGElement,
    containerHeight: number,
    containerWidth: number,
    guides: Guide[],
    viewTimeRange: TimeRange,
    xScale: d3.ScaleTime<number, number>,
  ) {
    this.bandContainer = bandContainer;
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
   * Add all guides to the document and update the labels.
   * We draw in reverse order so we can update the label with ellipsis properly.
   */
  drawAll(visible = true) {
    for (let i = this.guides.length - 1; i >= 0; --i) {
      const curr = this.guides[i];
      const prev = this.guides[i + 1];
      curr.draw(visible);
      curr.updateLabelWithEllipsis(prev);
    }
    this.drawGuideLines();
  }

  /**
   * Attach guide lines to child bands.
   */
  drawGuideLines() {
    d3.select(this.bandContainer)
      .selectAll('app-band .interaction-container .vertical-guide-group')
      .selectAll('.guide--vertical')
      .data(this.guides)
      .join(
        enter => {
          const lineGroup = enter
            .append('g')
            .attr('class', 'guide--vertical')
            .attr('id', ({ guide }) => guide.id);
          lineGroup
            .append('line')
            .attr('class', 'guide--vertical-line')
            .attr('x1', ({ guide }) => guide.x)
            .attr('y1', 0)
            .attr('x2', ({ guide }) => guide.x)
            .attr('y2', 300)
            .attr('stroke', 'gray')
            .attr('stroke-dasharray', 2);
          return lineGroup;
        },
        update => {
          update
            .select('.guide--vertical-line')
            .attr('x1', ({ guide }) => guide.x)
            .attr('x2', ({ guide }) => guide.x);
          return update;
        },
      );
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
  getOverlaps(): Overlap[] {
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
    return Object.values(overlapMap);
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
    this.guides = [];
    for (const guide of guides) {
      const time = getUnixEpochTime(guide.timestamp);

      if (time >= this.viewTimeRange.start && time <= this.viewTimeRange.end) {
        const svgVerticalGuide = new SvgVerticalGuide(
          this.container,
          this.containerHeight,
          this.containerWidth,
          {
            ...guide,
            time,
            x: this.xScale(time),
          },
        );

        this.guides.push(svgVerticalGuide);
      }
    }

    const overlaps = this.getOverlaps();
    this.guides = [];
    for (const { svgVerticalGuide, overlappingGuideIds } of overlaps) {
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
}
