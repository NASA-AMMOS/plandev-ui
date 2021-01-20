import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import { select } from 'd3-selection';
import {
  ActivityPoint,
  ConstraintViolation,
  LinePoint,
  MouseOverConstraintViolations,
  MouseOverPoints,
  Point,
  XRangePoint,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-tooltip',
  template: '',
})
export class TimelineTooltipComponent implements OnChanges {
  @Input()
  mouseOverConstraintViolations: MouseOverConstraintViolations | undefined;

  @Input()
  mouseOverPoints: MouseOverPoints | undefined;

  constraintViolations: ConstraintViolation[] = [];
  points: Point[] = [];
  tooltipClass = 'aerie-timeline-tooltip';

  ngOnChanges(changes: SimpleChanges) {
    if (changes.mouseOverConstraintViolations) {
      this.onMouseOverConstraintViolations(this.mouseOverConstraintViolations);
    }

    if (changes.mouseOverPoints) {
      this.onMouseOverPoints(this.mouseOverPoints);
    }
  }

  hide() {
    select(`.${this.tooltipClass}`)
      .style('opacity', 0)
      .style('z-index', -1)
      .html('');
  }

  onMouseOverConstraintViolations(
    event: MouseOverConstraintViolations | undefined,
  ) {
    if (event) {
      const { constraintViolations, e } = event;
      this.constraintViolations = constraintViolations;
      this.show(e);
    }
  }

  onMouseOverPoints(event: MouseOverPoints | undefined) {
    if (event) {
      const { points, e } = event;
      this.points = points;
      this.show(e);
    }
  }

  show(event: MouseEvent): void {
    if (this.constraintViolations.length || this.points.length) {
      const text = this.tooltipText();
      const tooltip = this.tooltip();
      tooltip.html(text); // Set html so we can calculate the true tooltip width.

      const { pageX, pageY } = event;
      const pointerOffset = 10;

      let xPosition = pageX + pointerOffset;
      let yPosition = pageY + pointerOffset;
      tooltip
        .style('opacity', 0.8)
        .style('left', `${xPosition}px`)
        .style('top', `${yPosition}px`)
        .style('z-index', 5);

      const node = tooltip.node() as HTMLElement;
      const { height, width, x, y } = node.getBoundingClientRect();

      if (x + width > window.innerWidth) {
        xPosition -= width;
      }
      if (y + height > window.innerHeight) {
        yPosition -= height;
      }

      tooltip.style('left', `${xPosition}px`).style('top', `${yPosition}px`);
    } else {
      this.hide();
    }
  }

  tooltip() {
    const tooltip = select(`.${this.tooltipClass}`);
    if (tooltip.empty()) {
      const body = select('body');
      return body
        .append('div')
        .attr('class', this.tooltipClass)
        .style('background-color', 'rgba(0, 0, 0, 0.8)')
        .style('border-radius', '4px')
        .style('box-shadow', '0px 4px 4px rgba(0, 0, 0, 0.25)')
        .style('color', 'white')
        .style('display', 'block')
        .style('font-family', 'Roboto')
        .style('opacity', 0)
        .style('padding', '8px')
        .style('pointer-events', 'none')
        .style('position', 'absolute')
        .style('z-index', -1);
    } else {
      return tooltip;
    }
  }

  tooltipText() {
    let text = '';
    if (this.points.length) {
      text += this.tooltipTextForPoints();
    }
    if (this.constraintViolations.length) {
      if (this.points.length) {
        text += '<hr>';
      }
      text += this.tooltipTextForConstraintViolations();
    }
    return text;
  }

  tooltipTextForActivityPoint(point: ActivityPoint): string {
    const { id, x } = point;
    const labelText = point.label?.text || '';
    return `
      <div>
        Id: ${id}
        <br>
        Activity Type: ${labelText}
        <br>
        Start: ${getDoyTimestamp(x)}
      </div>
    `;
  }

  tooltipTextForConstraintViolations(): string {
    let tooltipText = '';

    this.constraintViolations.forEach(
      (constraintViolation: ConstraintViolation, i: number) => {
        const { message, name } = constraintViolation.constraint;
        const text = `
          <div>
            Constraint Violation ${i + 1}
            <br>
            Constraint Name: ${name}
            <br>
            Message: ${message}
          </div>
        `;
        tooltipText = `${tooltipText} ${text}`;
        if (i !== this.constraintViolations.length - 1) {
          tooltipText += `<hr>`;
        }
      },
    );

    return tooltipText;
  }

  tooltipTextForLinePoint(point: LinePoint): string {
    const { id, x, y } = point;
    return `
      <div>
        Id: ${id}
        <br>
        Time: ${getDoyTimestamp(x)}
        <br>
        Value: ${y}
      </div>
    `;
  }

  tooltipTextForPoints(): string {
    let tooltipText = '';

    this.points.forEach((point: Point, i: number) => {
      if (point.type === 'activity') {
        tooltipText = `
          ${tooltipText}
          ${this.tooltipTextForActivityPoint(point as ActivityPoint)}
        `;
      }
      if (point.type === 'line') {
        tooltipText = `
          ${tooltipText}
          ${this.tooltipTextForLinePoint(point as LinePoint)}
        `;
      }
      if (point.type === 'x-range') {
        tooltipText = `
          ${tooltipText}
          ${this.tooltipTextForXRangePoint(point as XRangePoint)}
        `;
      }
      if (i !== this.points.length - 1) {
        tooltipText += `<hr>`;
      }
    });

    return tooltipText;
  }

  tooltipTextForXRangePoint(point: XRangePoint): string {
    const { id, x } = point;
    return `
      <div>
        Id: ${id}
        <br>
        Start: ${getDoyTimestamp(x)}
        <br>
        Value: ${point.label.text}
      </div>
    `;
  }
}

@NgModule({
  declarations: [TimelineTooltipComponent],
  exports: [TimelineTooltipComponent],
})
export class TimelineTooltipModule {}
