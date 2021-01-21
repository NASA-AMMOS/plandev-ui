import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { ScaleTime } from 'd3-scale';
import {
  ConstraintViolation,
  TimeRange,
  VerticalGuide,
  XAxisTick,
} from '../../types';
import { TimelineSharedConstraintViolationsModule } from './timeline-shared-constraint-violations.component';
import { TimelineXAxisBrushModule } from './timeline-x-axis-brush.component';
import { TimelineXAxisVerticalGuidesModule } from './timeline-x-axis-vertical-guides.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-x-axis',
  styles: [
    `
      :host {
        display: flex;
      }

      svg {
        height: 100%;
        width: 100%;
      }

      text {
        pointer-events: none;
        user-select: none;
      }
    `,
  ],
  template: `
    <svg [attr.style]="'height:' + drawHeight + 'px;'">
      <g [attr.transform]="'translate(' + marginLeft + ',' + 0 + ')'">
        <g [attr.transform]="'translate(' + 0 + ',' + 0 + ')'">
          <g
            aerie-timeline-x-axis-brush
            [drawHeight]="20"
            [drawWidth]="drawWidth"
            [type]="'max'"
            [viewTimeRange]="viewTimeRange"
            [xScaleMax]="xScaleMax"
            [xScaleView]="xScaleView"
            [yOffset]="10"
            (updateViewTimeRange)="updateViewTimeRange.emit($event)"
          ></g>
        </g>
        <g
          [attr.transform]="
            'translate(' + 0 + ',' + constraintViolationsRowYOffset + ')'
          "
        >
          <g
            aerie-timeline-shared-constraint-violations
            [constraintViolations]="constraintViolations"
            [drawHeight]="drawHeight"
            [drawWidth]="drawWidth"
            [viewTimeRange]="viewTimeRange"
            [xScaleView]="xScaleView"
          ></g>
        </g>
        <g
          [attr.transform]="
            'translate(' + 0 + ',' + verticalGuidesRowYOffset + ')'
          "
        >
          <g
            class="label"
            [attr.transform]="'translate(' + labelsXOffset + ',' + 0 + ')'"
          >
            <text
              fill="rgb(0, 0, 0)"
              font-size="10"
              text-anchor="middle"
              dy="0.5em"
            >
              GUIDES
            </text>
          </g>
          <g
            aerie-timeline-x-axis-vertical-guides
            [drawHeight]="drawHeight"
            [drawWidth]="drawWidth"
            [verticalGuides]="verticalGuides"
            [viewTimeRange]="viewTimeRange"
            [xScaleView]="xScaleView"
            (collapsedVerticalGuides)="collapsedVerticalGuides.emit($event)"
          ></g>
        </g>
        <g [attr.transform]="'translate(' + 0 + ',' + axisRowYOffset + ')'">
          <g
            aerie-timeline-x-axis-brush
            [drawHeight]="30"
            [drawWidth]="drawWidth"
            [type]="'view'"
            [viewTimeRange]="viewTimeRange"
            [xScaleMax]="xScaleMax"
            [xScaleView]="xScaleView"
            [yOffset]="-6"
            (updateViewTimeRange)="updateViewTimeRange.emit($event)"
          ></g>
          <g fill="none" font-size="10" text-anchor="middle">
            <g
              class="label"
              [attr.transform]="'translate(' + labelsXOffset + ',' + 0 + ')'"
            >
              <text fill="rgb(0, 0, 0)" dy="0.5em">YEAR-DAY</text>
            </g>
            <g
              class="label"
              [attr.transform]="'translate(' + labelsXOffset + ',' + 20 + ')'"
            >
              <text fill="rgb(0, 0, 0)" dy="0.5em">TIME</text>
            </g>
            <ng-container *ngFor="let tick of xTicksView">
              <g
                class="tick"
                [attr.transform]="
                  'translate(' + xScaleView(tick.date) + ',' + 0 + ')'
                "
              >
                <text fill="currentColor" dy="0.5em">{{ tick.yearDay }}</text>
              </g>
              <g
                class="tick"
                [attr.transform]="
                  'translate(' + xScaleView(tick.date) + ',' + 20 + ')'
                "
              >
                <text fill="currentColor" dy="0.5em">{{ tick.time }}</text>
              </g>
            </ng-container>
          </g>
        </g>
      </g>
    </svg>
  `,
})
export class TimelineXAxisComponent {
  @Input()
  constraintViolations: ConstraintViolation[];

  @Input()
  drawHeight = 90;

  @Input()
  drawWidth: number;

  @Input()
  marginLeft: number;

  @Input()
  verticalGuides: VerticalGuide[];

  @Input()
  viewTimeRange: TimeRange | undefined;

  @Input()
  xScaleMax: ScaleTime<number, number>;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @Input()
  xTicksView: XAxisTick[] = [];

  @Output()
  collapsedVerticalGuides: EventEmitter<VerticalGuide[]> = new EventEmitter<
    VerticalGuide[]
  >();

  @Output()
  updateViewTimeRange: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  axisRowYOffset = 55;
  constraintViolationsRowYOffset = 20;
  labelsXOffset = -60;
  verticalGuidesRowYOffset = 35;
}

@NgModule({
  declarations: [TimelineXAxisComponent],
  exports: [TimelineXAxisComponent],
  imports: [
    CommonModule,
    TimelineSharedConstraintViolationsModule,
    TimelineXAxisBrushModule,
    TimelineXAxisVerticalGuidesModule,
  ],
})
export class TimelineXAxisModule {}
