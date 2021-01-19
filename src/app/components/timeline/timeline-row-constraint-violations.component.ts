import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgModule,
  OnChanges,
  ViewChild,
} from '@angular/core';
import { ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { ConstraintViolation, TimeRange } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-constraint-violations',
  styles: [
    `
      svg {
        height: 100%;
        position: absolute;
        width: 100%;
        z-index: -2;
      }
    `,
  ],
  template: `
    <svg>
      <g
        #g
        [attr.transform]="'translate(' + marginLeft + ',' + marginTop + ')'"
      ></g>
    </svg>
  `,
})
export class TimelineRowConstraintViolationsComponent implements OnChanges {
  @Input()
  constraintViolations: ConstraintViolation[];

  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  marginLeft: number;

  @Input()
  marginTop: number;

  @Input()
  viewTimeRange: TimeRange | undefined;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @ViewChild('g', { static: true })
  g: ElementRef<SVGGElement>;

  ngOnChanges() {
    this.draw();
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

  draw() {
    const { nativeElement } = this.g;
    const g = select(nativeElement);
    const constraintViolationClass = 'constraint-violation';
    g.selectAll(`.${constraintViolationClass}`).remove();

    const constraintViolations = this.constraintViolations || [];
    for (const constraintViolation of constraintViolations) {
      const { windows } = constraintViolation;
      const group = g.append('g').attr('class', constraintViolationClass);

      for (const window of windows) {
        const { end, start } = this.clampWindow(window);
        const xStart = this.xScaleView(start);
        const xEnd = this.xScaleView(end);
        const width = this.clampWidth(xEnd - xStart);
        group
          .append('rect')
          .attr('fill', '#B00020')
          .attr('fill-opacity', 0.15)
          .attr('height', this.drawHeight)
          .attr('width', width)
          .attr('x', xStart)
          .attr('y', 0);
      }
    }
  }
}

@NgModule({
  declarations: [TimelineRowConstraintViolationsComponent],
  exports: [TimelineRowConstraintViolationsComponent],
  imports: [CommonModule],
})
export class TimelineRowConstraintViolationsModule {}
