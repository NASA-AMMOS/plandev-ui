import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter as E,
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
  ConstraintViolation,
  MouseOverConstraintViolations,
  TimeRange,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'g[aerie-timeline-shared-constraint-violations]',
  template: `<svg:g #g />`,
})
export class TimelineSharedConstraintViolationsComponent implements OnChanges {
  @Input() constraintViolations: ConstraintViolation[];
  @Input() drawHeight: number;
  @Input() drawWidth: number;
  @Input() marginLeft: number;
  @Input() mousemove: MouseEvent;
  @Input() mouseout: MouseEvent;
  @Input() viewTimeRange: TimeRange;
  @Input() xScaleView: ScaleTime<number, number>;

  @Output()
  mouseOverConstraintViolations: E<MouseOverConstraintViolations> = new E();

  @ViewChild('g', { static: true }) g: ElementRef<SVGGElement>;

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

  clampWindow(window: TimeRange) {
    const { end, start } = window;
    const xStart = this.xScaleView(start);
    const xEnd = this.xScaleView(end);
    const clampedStart = xStart < 0 ? 0 : xStart;
    const clampedEnd = xEnd > this.drawWidth ? this.drawWidth : xEnd;
    const width = clampedEnd - clampedStart;
    const clampedWidth = width <= 0 ? 5 : width;
    return { start: clampedStart, width: clampedWidth };
  }

  draw() {
    const { nativeElement } = this.g;
    const g = select(nativeElement);
    const constraintViolationClass = 'constraint-violation';
    g.selectAll(`.${constraintViolationClass}`).remove();

    const constraintViolations = this.constraintViolations || [];

    for (const constraintViolation of constraintViolations) {
      const { windows } = constraintViolation;
      const filteredWindows = windows.filter(({ start, end }) => {
        if (this.viewTimeRange) {
          return (
            start <= this.viewTimeRange.end && end >= this.viewTimeRange.start
          );
        }
        return false;
      });

      if (filteredWindows.length) {
        const group = g.append('g').attr('class', constraintViolationClass);

        for (const window of filteredWindows) {
          const { start, width } = this.clampWindow(window);
          group
            .append('rect')
            .attr('fill', '#B00020')
            .attr('fill-opacity', 0.15)
            .attr('height', this.drawHeight)
            .attr('width', width)
            .attr('x', start)
            .attr('y', 0);
        }
      }
    }
  }

  onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x } = e;
      const offsetX = this.marginLeft ? x - this.marginLeft : x;
      const constraintViolations = [];

      for (const constraintViolation of this.constraintViolations || []) {
        const { windows } = constraintViolation;
        let count = 0;

        for (const window of windows) {
          const { start, width } = this.clampWindow(window);
          const end = start + width;
          if (start <= offsetX && offsetX <= end) {
            ++count;
          }
        }

        if (count > 0) {
          constraintViolations.push(constraintViolation);
        }
      }

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
  declarations: [TimelineSharedConstraintViolationsComponent],
  exports: [TimelineSharedConstraintViolationsComponent],
  imports: [CommonModule],
})
export class TimelineSharedConstraintViolationsModule {}
