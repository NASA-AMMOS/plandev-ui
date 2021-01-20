import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import {
  clampWidth,
  clampWindow,
  getConstraintViolationsWithinTime,
} from '../../functions';
import {
  ConstraintViolation,
  MouseOverConstraintViolations,
  TimeRange,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-constraint-violations',
  styles: [
    `
      svg {
        height: 100%;
        position: absolute;
        width: 100%;
        z-index: 1;
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
  mousemove: MouseEvent;

  @Input()
  mouseout: MouseEvent;

  @Input()
  viewTimeRange: TimeRange | undefined;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @Output()
  mouseOverConstraintViolations: EventEmitter<MouseOverConstraintViolations> = new EventEmitter<MouseOverConstraintViolations>();

  @ViewChild('g', { static: true })
  g: ElementRef<SVGGElement>;

  ngOnChanges(changes: SimpleChanges) {
    let shouldDraw = false;

    if (
      changes.constraintViolations ||
      changes.drawHeight ||
      changes.drawWidth ||
      changes.viewTimeRange ||
      changes.xScaleView
    ) {
      shouldDraw = true;
    }

    if (changes.mousemove) {
      this.onMousemove(this.mousemove);
    }

    if (changes.mouseout) {
      this.onMouseout(this.mouseout);
    }

    if (shouldDraw) {
      this.draw();
    }
  }

  draw() {
    const { nativeElement } = this.g;
    const g = select(nativeElement);
    const constraintViolationClass = 'constraint-violation';
    g.selectAll(`.${constraintViolationClass}`).remove();

    const constraintViolations = this.constraintViolations || [];
    const heightPadding = 20;
    const yOffset = -10;

    for (const constraintViolation of constraintViolations) {
      const { windows } = constraintViolation;
      const group = g.append('g').attr('class', constraintViolationClass);

      for (const window of windows) {
        const { end, start } = clampWindow(window, this.viewTimeRange);
        const xStart = this.xScaleView(start);
        const xEnd = this.xScaleView(end);
        const width = clampWidth(xEnd - xStart);
        group
          .append('rect')
          .attr('fill', '#B00020')
          .attr('fill-opacity', 0.15)
          .attr('height', this.drawHeight + heightPadding)
          .attr('width', width)
          .attr('x', xStart)
          .attr('y', yOffset);
      }
    }
  }

  onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      const unixEpochTime = this.xScaleView.invert(offsetX).getTime();
      const constraintViolations = getConstraintViolationsWithinTime(
        this.constraintViolations,
        unixEpochTime,
      );
      this.mouseOverConstraintViolations.emit({ constraintViolations, e });
    }
  }

  onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      this.mouseOverConstraintViolations.emit({ constraintViolations: [], e });
    }
  }
}

@NgModule({
  declarations: [TimelineRowConstraintViolationsComponent],
  exports: [TimelineRowConstraintViolationsComponent],
  imports: [CommonModule],
})
export class TimelineRowConstraintViolationsModule {}
