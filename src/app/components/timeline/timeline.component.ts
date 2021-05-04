import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter as E,
  HostListener,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import { ScaleTime } from 'd3-scale';
import { getXScale } from '../../functions';
import {
  ActivityLayer,
  ConstraintViolation,
  CreatePoint,
  DeletePoint,
  HorizontalGuideEvent,
  LayerEvent,
  LineLayer,
  MouseOverConstraintViolations,
  MouseOverPoints,
  Row,
  SavePoint,
  SelectPoint,
  StringTMap,
  TimeRange,
  UpdatePoint,
  UpdateRow,
  VerticalGuide,
  XAxisTick,
  XRangeLayer,
} from '../../types';
import { TimelineRowModule } from './timeline-row.component';
import { TimelineSharedTooltipModule } from './timeline-shared-tooltip.component';
import { TimelineXAxisModule } from './timeline-x-axis.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .row-container {
        background: white;
        max-height: var(--max-height, 600px);
        overflow-x: hidden;
        overflow-y: scroll;
      }

      .x-axis-container {
        background: white;
        border-bottom: 1px solid lightgrey;
        overflow-x: hidden;
        overflow-y: hidden;
      }
    `,
  ],
  template: `
    <div #xAxisContainer class="x-axis-container">
      <aerie-timeline-x-axis
        [constraintViolations]="xAxisConstraintViolations"
        [drawWidth]="drawWidth"
        [marginLeft]="marginLeft"
        [verticalGuides]="verticalGuides"
        [viewTimeRange]="viewTimeRange"
        [xScaleMax]="xScaleMax"
        [xScaleView]="xScaleView"
        [xTicksView]="xTicksView"
        (collapsedVerticalGuides)="onCollapsedVerticalGuides($event)"
        (mouseOverConstraintViolations)="
          onMouseOverConstraintViolations($event)
        "
        (updateViewTimeRange)="updateViewTimeRange.emit($event)"
      ></aerie-timeline-x-axis>
    </div>
    <div #rowContainer class="row-container">
      <aerie-timeline-row
        *ngFor="let row of rows; trackBy: trackByRows"
        [autoAdjustHeight]="row.autoAdjustHeight"
        [constraintViolations]="constraintViolationByRowId[row.id]"
        [drawHeight]="row.height"
        [drawWidth]="drawWidth"
        [horizontalGuides]="row.horizontalGuides"
        [id]="row.id"
        [layers]="row.layers"
        [marginLeft]="marginLeft"
        [marginRight]="marginRight"
        [maxTimeRange]="maxTimeRange"
        [verticalGuides]="collapsedVerticalGuides"
        [viewTimeRange]="viewTimeRange"
        [xScaleView]="xScaleView"
        [xTicksView]="xTicksView"
        [yAxes]="row.yAxes"
        (createHorizontalGuide)="createHorizontalGuide.emit($event)"
        (createPoint)="createPoint.emit($event)"
        (deleteHorizontalGuide)="deleteHorizontalGuide.emit($event)"
        (deletePoint)="deletePoint.emit($event)"
        (mouseOverConstraintViolations)="
          onMouseOverConstraintViolations($event)
        "
        (mouseOverPoints)="onMouseOverPoints($event)"
        (savePoint)="savePoint.emit($event)"
        (selectPoint)="selectPoint.emit($event)"
        (updateHorizontalGuide)="updateHorizontalGuide.emit($event)"
        (updateLayer)="updateLayer.emit($event)"
        (updatePoint)="updatePoint.emit($event)"
        (updateRow)="updateRow.emit($event)"
      ></aerie-timeline-row>
    </div>

    <aerie-timeline-shared-tooltip
      [mouseOverConstraintViolations]="mouseOverConstraintViolations"
      [mouseOverPoints]="mouseOverPoints"
    ></aerie-timeline-shared-tooltip>
  `,
})
export class TimelineComponent implements OnChanges, AfterViewChecked {
  @Input() constraintViolations: ConstraintViolation[] = [];
  @Input() id: string;
  @Input() marginLeft = 50;
  @Input() marginRight = 40;
  @Input() maxTimeRange: TimeRange;
  @Input() rows: Row[] | null | undefined;
  @Input() verticalGuides: VerticalGuide[];
  @Input() viewTimeRange: TimeRange | undefined;

  @Output() createHorizontalGuide: E<HorizontalGuideEvent> = new E();
  @Output() createPoint: E<CreatePoint> = new E();
  @Output() deleteHorizontalGuide: E<HorizontalGuideEvent> = new E();
  @Output() deletePoint: E<DeletePoint> = new E();
  @Output() savePoint: E<SavePoint> = new E();
  @Output() selectPoint: E<SelectPoint> = new E();
  @Output() updateHorizontalGuide: E<HorizontalGuideEvent> = new E();
  @Output() updateLayer: E<LayerEvent> = new E();
  @Output() updatePoint: E<UpdatePoint> = new E();
  @Output() updateRow: E<UpdateRow> = new E();
  @Output() updateViewTimeRange: E<TimeRange> = new E();

  @ViewChild('rowContainer', { static: true })
  rowContainer: ElementRef<HTMLDivElement>;
  @ViewChild('xAxisContainer', { static: true })
  xAxisContainer: ElementRef<HTMLDivElement>;

  collapsedVerticalGuides: VerticalGuide[];
  constraintViolationByRowId: StringTMap<ConstraintViolation[]> = {};
  drawWidth: number;
  mouseOverConstraintViolations: MouseOverConstraintViolations;
  mouseOverPoints: MouseOverPoints;
  xAxisConstraintViolations: ConstraintViolation[] = [];
  xDomainMax: [Date, Date];
  xDomainView: [Date, Date];
  xScaleMax: ScaleTime<number, number>;
  xScaleView: ScaleTime<number, number>;
  xTicksView: XAxisTick[];

  constructor(private cdRef: ChangeDetectorRef, private elRef: ElementRef) {}

  @HostListener('window:resize', ['$event.target'])
  onWindowResize() {
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges) {
    let shouldDraw = false;

    if (
      changes.marginLeft ||
      changes.marginRight ||
      changes.maxTimeRange ||
      changes.rows ||
      changes.viewTimeRange
    ) {
      shouldDraw = true;
    }

    if (changes.constraintViolations || changes.rows) {
      this.collectViolations();
      shouldDraw = true;
    }

    if (shouldDraw) {
      this.draw();
    }
  }

  ngAfterViewChecked() {
    this.setRowContainerMaxHeight();
  }

  collectViolations() {
    if (this.constraintViolations.length) {
      this.constraintViolationByRowId = {};
      this.xAxisConstraintViolations = [];

      const timelineActivityInstanceIds: StringTMap<StringTMap<string>> = {};
      const timelineResourceIds: StringTMap<StringTMap<string>> = {};

      // Collect all activity and resource ids in the timeline by row.
      for (const row of this.rows) {
        for (const layer of row.layers) {
          if (layer.type === 'activity') {
            const activityLayer = layer as ActivityLayer;
            for (const point of activityLayer.points) {
              timelineActivityInstanceIds[point.id] = {
                ...timelineActivityInstanceIds[point.id],
                [row.id]: row.id,
              };
            }
          } else if (layer.type === 'resource') {
            const resourceLayer = layer as LineLayer | XRangeLayer;
            for (const point of resourceLayer.points) {
              timelineResourceIds[point.id] = {
                ...timelineResourceIds[point.id],
                [row.id]: row.id,
              };
            }
          }
        }
      }

      // Assign violations to their proper row.
      for (const violation of this.constraintViolations) {
        const { associations } = violation;
        const { activityInstanceIds, resourceIds } = associations;

        if (!activityInstanceIds.length && !resourceIds.length) {
          for (const { id: rowId } of this.rows) {
            if (this.constraintViolationByRowId[rowId] === undefined) {
              this.constraintViolationByRowId[rowId] = [violation];
            } else {
              this.constraintViolationByRowId[rowId].push(violation);
            }
          }
          this.xAxisConstraintViolations.push(violation);
        } else if (activityInstanceIds.length) {
          for (const activityInstanceId of activityInstanceIds) {
            if (timelineActivityInstanceIds[activityInstanceId]) {
              const rowIds = Object.keys(
                timelineActivityInstanceIds[activityInstanceId],
              );
              for (const rowId of rowIds) {
                if (this.constraintViolationByRowId[rowId] === undefined) {
                  this.constraintViolationByRowId[rowId] = [violation];
                } else {
                  this.constraintViolationByRowId[rowId].push(violation);
                }
              }
              this.xAxisConstraintViolations.push(violation);
            }
          }
        } else {
          for (const resourceId of resourceIds) {
            if (timelineResourceIds[resourceId]) {
              const rowIds = Object.keys(timelineResourceIds[resourceId]);
              for (const rowId of rowIds) {
                if (this.constraintViolationByRowId[rowId] === undefined) {
                  this.constraintViolationByRowId[rowId] = [violation];
                } else {
                  this.constraintViolationByRowId[rowId].push(violation);
                }
              }
              this.xAxisConstraintViolations.push(violation);
            }
          }
        }
      }
    }
  }

  draw() {
    if (this.maxTimeRange && this.viewTimeRange) {
      const { clientWidth } = this.elRef.nativeElement;
      this.drawWidth =
        clientWidth > 0 ? clientWidth - this.marginLeft - this.marginRight : 0;

      this.xDomainMax = [
        new Date(this.maxTimeRange.start),
        new Date(this.maxTimeRange.end),
      ];
      this.xDomainView = [
        new Date(this.viewTimeRange.start),
        new Date(this.viewTimeRange.end),
      ];

      this.xScaleMax = getXScale(this.xDomainMax, this.drawWidth);
      this.xScaleView = getXScale(this.xDomainView, this.drawWidth);

      this.xTicksView = this.xScaleView.ticks().map((date: Date) => {
        const doyTimestamp = getDoyTimestamp(date.getTime(), false);
        const [yearDay, time] = doyTimestamp.split('T');
        return { date, time, yearDay };
      });
    }
  }

  onCollapsedVerticalGuides(collapsedVerticalGuides: VerticalGuide[]) {
    this.collapsedVerticalGuides = collapsedVerticalGuides;
    this.cdRef.detectChanges();
  }

  onMouseOverConstraintViolations(event: MouseOverConstraintViolations) {
    this.mouseOverConstraintViolations = event;
  }

  onMouseOverPoints(event: MouseOverPoints) {
    this.mouseOverPoints = event;
  }

  setRowContainerMaxHeight() {
    const cssStyle = getComputedStyle(document.documentElement);
    const toolbarHeightProperty = cssStyle.getPropertyValue('--toolbar-height');
    const toolbarHeight = parseInt(toolbarHeightProperty, 10);

    const { clientHeight: height } = this.elRef.nativeElement.parentElement;
    const { nativeElement: xAxisContainer } = this.xAxisContainer;
    const { nativeElement: rowContainer } = this.rowContainer;
    const offsetTop = toolbarHeight + xAxisContainer.clientHeight;
    const maxHeight = `${height - offsetTop}px`;

    rowContainer.style.setProperty('--max-height', maxHeight);
  }

  trackByRows(_: number, row: Row): string {
    return row.id;
  }
}

@NgModule({
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  imports: [
    CommonModule,
    TimelineRowModule,
    TimelineSharedTooltipModule,
    TimelineXAxisModule,
  ],
})
export class TimelineModule {}
