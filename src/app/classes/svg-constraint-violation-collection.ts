import type { ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { TimeRange, Violation } from '../types';
import { SvgConstraintViolation } from './svg-constraint-violation';

export class SvgConstraintViolationCollection {
  public container: SVGGElement;
  public containerId: string;
  public containerHeight: number;
  public containerWidth: number;
  public marginTop: number;
  public viewTimeRange: TimeRange;
  public violations: SvgConstraintViolation[];
  public xScale: ScaleTime<number, number>;

  constructor(
    container: SVGGElement,
    containerId: string,
    containerHeight: number,
    containerWidth: number,
    marginTop: number,
    viewTimeRange: TimeRange,
    violations: Violation[],
    xScale: ScaleTime<number, number>,
  ) {
    this.container = container;
    this.containerId = containerId;
    this.containerHeight = containerHeight;
    this.containerWidth = containerWidth;
    this.marginTop = marginTop;
    this.viewTimeRange = viewTimeRange;
    this.xScale = xScale;
    this.clearAll();
    this.setViolations(violations);
  }

  /**
   * Removes all violations from the document.
   */
  clearAll() {
    select(this.container).selectAll(`.constraint-violation-group`).remove();
  }

  /**
   * Attach all violations to the document.
   */
  drawAll() {
    for (const violation of this.violations) {
      violation.draw();
    }
  }

  /**
   * Generate a unique tooltip string for each violation.
   */
  getTooltipText(unixEpochTime: number): string {
    let tooltipText = '';
    for (const violation of this.violations) {
      const { windows } = violation;
      let count = 0;
      for (const window of windows) {
        const { start, end } = window;
        if (start <= unixEpochTime && unixEpochTime <= end) {
          ++count;
        }
      }
      if (count > 0) {
        tooltipText += `<hr>(${count}) ${violation.constraint.message}<br>`;
      }
    }
    return tooltipText;
  }

  /**
   * Map violations into svg constraint violations so we can draw them.
   */
  setViolations(violations: Violation[]) {
    this.violations = violations.map(
      violation =>
        new SvgConstraintViolation(
          this.container,
          this.containerHeight,
          this.containerId,
          this.containerWidth,
          this.marginTop,
          this.viewTimeRange,
          violation,
          this.xScale,
        ),
    );
  }
}
