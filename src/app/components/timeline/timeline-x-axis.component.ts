import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { ScaleTime } from 'd3-scale';
import {
  ConstraintViolation,
  MouseOverConstraintViolations,
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
      <g #overlay [attr.transform]="'translate(' + marginLeft + ',' + 0 + ')'">
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
        <g [attr.transform]="'translate(' + 0 + ',' + violationsOffset + ')'">
          <g
            aerie-timeline-shared-constraint-violations
            [constraintViolations]="constraintViolations"
            [drawHeight]="drawHeight"
            [drawWidth]="drawWidth"
            [marginLeft]="marginLeft"
            [mousemove]="mousemove"
            [mouseout]="mouseout"
            [viewTimeRange]="viewTimeRange"
            [xScaleView]="xScaleView"
            (mouseOverConstraintViolations)="
              mouseOverConstraintViolations.emit($event)
            "
          ></g>
        </g>
        <g
          [attr.transform]="'translate(' + 0 + ',' + verticalGuidesOffset + ')'"
        >
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
        <g [attr.transform]="'translate(' + 0 + ',' + axisOffset + ')'">
          <g
            aerie-timeline-x-axis-brush
            [drawHeight]="30"
            [drawWidth]="drawWidth"
            [type]="'view'"
            [viewTimeRange]="viewTimeRange"
            [xScaleMax]="xScaleMax"
            [xScaleView]="xScaleView"
            [yOffset]="-6"
            (mouseOverConstraintViolations)="
              mouseOverConstraintViolations.emit($event)
            "
            (updateViewTimeRange)="updateViewTimeRange.emit($event)"
          ></g>
          <g fill="none" font-size="10" text-anchor="middle">
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
export class TimelineXAxisComponent
  implements AfterViewInit, OnChanges, OnDestroy {
  @Input() constraintViolations: ConstraintViolation[];
  @Input() drawWidth: number;
  @Input() marginLeft: number;
  @Input() verticalGuides: VerticalGuide[];
  @Input() viewTimeRange: TimeRange | undefined;
  @Input() xScaleMax: ScaleTime<number, number>;
  @Input() xScaleView: ScaleTime<number, number>;
  @Input() xTicksView: XAxisTick[] = [];

  @Output() collapsedVerticalGuides: E<VerticalGuide[]> = new E();
  @Output()
  mouseOverConstraintViolations: E<MouseOverConstraintViolations> = new E();
  @Output() updateViewTimeRange: E<TimeRange> = new E();

  @ViewChild('overlay', { static: true })
  overlay: ElementRef<SVGGElement>;

  mousemove: MouseEvent;
  mousemoveListener: (mousemove: MouseEvent) => void;
  mouseout: MouseEvent;
  mouseoutListener: (mouseout: MouseEvent) => void;

  axisOffset = 55;
  drawHeight = 90;
  verticalGuidesOffset = 35;
  violationsOffset = 20;

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnChanges() {
    // Set spacing based on existence of vertical guides.
    if (this.verticalGuides.length) {
      this.axisOffset = 55;
      this.drawHeight = 90;
      this.verticalGuidesOffset = 35;
    } else {
      this.axisOffset = 35;
      this.drawHeight = 70;
      this.verticalGuidesOffset = 0;
    }
  }

  ngAfterViewInit(): void {
    this.initEventListeners();
  }

  ngOnDestroy(): void {
    this.destroyEventListeners();
  }

  initEventListeners() {
    const overlay = this.overlay.nativeElement;

    // mousemove.
    this.mousemoveListener = (mousemove: MouseEvent) => {
      this.mousemove = mousemove;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('mousemove', this.mousemoveListener);

    // mouseout.
    this.mouseoutListener = (mouseout: MouseEvent) => {
      this.mouseout = mouseout;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('mouseout', this.mouseoutListener);
  }

  destroyEventListeners() {
    const overlay = this.overlay.nativeElement;
    overlay.removeEventListener('mousemove', this.mousemoveListener);
    overlay.removeEventListener('mouseout', this.mouseoutListener);
  }
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
