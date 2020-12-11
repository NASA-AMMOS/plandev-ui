import type { ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { Constraint, Selection, TimeRange, Violation } from '../types';

export class SvgConstraintViolation {
  public constraint: Constraint;
  public container: Selection<SVGGElement>;
  public containerHeight: number;
  public containerWidth: number;
  public group: Selection<SVGGElement>;
  public id: string;
  public marginTop: number;
  public rect: Selection<SVGRectElement>;
  public tooltipText: string;
  public viewTimeRange: TimeRange;
  public windows: TimeRange[];
  public xScale: ScaleTime<number, number>;

  constructor(
    container: SVGGElement,
    containerHeight: number,
    containerId: string,
    containerWidth: number,
    marginTop: number,
    viewTimeRange: TimeRange,
    violation: Violation,
    xScale: ScaleTime<number, number>,
  ) {
    this.constraint = violation.constraint;
    this.container = select(container);
    this.containerHeight = containerHeight;
    this.containerWidth = containerWidth;
    this.group = this.container.select(`#${violation.constraint.name}`);
    this.id = `${containerId}-${violation.constraint.name}`;
    this.marginTop = marginTop;
    this.tooltipText = violation.constraint.message;
    this.viewTimeRange = viewTimeRange;
    this.windows = violation.windows.filter(
      ({ start, end }) =>
        start <= this.viewTimeRange.end && end >= this.viewTimeRange.start,
    );
    this.xScale = xScale;
  }

  /**
   * Clamp width to 1 if it is 0 or less so we always
   * draw at least a line.
   */
  clampWidth(width: number): number {
    const floorWidth = Math.floor(width);
    return floorWidth > 0 ? floorWidth : 1;
  }

  /**
   * Make sure the window is between the current view time range
   * so we don't draw out of bounds.
   */
  clampWindow(window: TimeRange): TimeRange {
    let start = window.start;
    let end = window.end;

    if (start < this.viewTimeRange.start) {
      start = this.viewTimeRange.start;
    }

    if (end > this.viewTimeRange.end) {
      end = this.viewTimeRange.end;
    }

    return { end, start };
  }

  /**
   * Append constraint violation group to the container group.
   */
  draw() {
    this.container.select(`#${this.id}`).remove();
    this.group = this.container
      .append('g')
      .attr('class', 'constraint-violation-group')
      .attr('id', this.id);
    for (const window of this.windows) {
      const { start, end } = this.clampWindow(window);
      const xStart = this.xScale(start);
      const xEnd = this.xScale(end);
      const width = this.clampWidth(xEnd - xStart);
      this.rect = this.group
        .append('rect')
        .attr('class', 'constraint-violation-rect')
        .attr('fill', '#B00020')
        .attr('fill-opacity', 0.15)
        .attr('height', this.containerHeight)
        .attr('width', width)
        .attr('x', xStart)
        .attr('y', -this.marginTop);
    }
  }
}
