import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgModule,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import { scaleTime, ScaleTime } from 'd3-scale';
import {
  CreatePoint,
  DeletePoint,
  HorizontalGuide,
  HorizontalGuideEvent,
  Row,
  SavePoint,
  SelectPoint,
  TimeRange,
  UpdatePoint,
  UpdateRow,
  XAxisTick,
} from '../../types';
import { TimelineRowModule } from './timeline-row.component';
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
        [drawWidth]="drawWidth"
        [marginLeft]="marginLeft"
        [viewTimeRange]="viewTimeRange"
        [xScaleMax]="xScaleMax"
        [xScaleView]="xScaleView"
        [xTicksView]="xTicksView"
        (updateViewTimeRange)="updateViewTimeRange.emit($event)"
      ></aerie-timeline-x-axis>
    </div>
    <div #rowContainer class="row-container">
      <aerie-timeline-row
        *ngFor="let row of rows; trackBy: trackByRows"
        [autoAdjustHeight]="row.autoAdjustHeight"
        [drawWidth]="drawWidth"
        [height]="row.height"
        [horizontalGuides]="row.horizontalGuides"
        [id]="row.id"
        [layers]="row.layers"
        [marginLeft]="marginLeft"
        [marginRight]="marginRight"
        [maxTimeRange]="maxTimeRange"
        [viewTimeRange]="viewTimeRange"
        [xScaleView]="xScaleView"
        [xTicksView]="xTicksView"
        [yAxes]="row.yAxes"
        (createHorizontalGuide)="createHorizontalGuide.emit($event)"
        (createPoint)="createPoint.emit($event)"
        (deleteHorizontalGuide)="deleteHorizontalGuide.emit($event)"
        (deletePoint)="deletePoint.emit($event)"
        (savePoint)="savePoint.emit($event)"
        (selectPoint)="selectPoint.emit($event)"
        (updateHorizontalGuide)="updateHorizontalGuide.emit($event)"
        (updatePoint)="updatePoint.emit($event)"
        (updateRow)="updateRow.emit($event)"
      ></aerie-timeline-row>
    </div>
  `,
})
export class TimelineComponent implements OnChanges, AfterViewChecked {
  @Input()
  marginLeft = 100;

  @Input()
  marginRight = 40;

  @Input()
  maxTimeRange: TimeRange = { end: 0, start: 0 };

  @Input()
  rows: Row[] | null | undefined;

  @Input()
  viewTimeRange: TimeRange = { end: 0, start: 0 };

  @Output()
  createHorizontalGuide: EventEmitter<HorizontalGuideEvent> = new EventEmitter<HorizontalGuideEvent>();

  @Output()
  createPoint: EventEmitter<CreatePoint> = new EventEmitter<CreatePoint>();

  @Output()
  deleteHorizontalGuide: EventEmitter<HorizontalGuide> = new EventEmitter<HorizontalGuide>();

  @Output()
  deletePoint: EventEmitter<DeletePoint> = new EventEmitter<DeletePoint>();

  @Output()
  savePoint: EventEmitter<SavePoint> = new EventEmitter<SavePoint>();

  @Output()
  selectPoint: EventEmitter<SelectPoint> = new EventEmitter<SelectPoint>();

  @Output()
  updateHorizontalGuide: EventEmitter<HorizontalGuideEvent> = new EventEmitter<HorizontalGuideEvent>();

  @Output()
  updatePoint: EventEmitter<UpdatePoint> = new EventEmitter<UpdatePoint>();

  @Output()
  updateRow: EventEmitter<UpdateRow> = new EventEmitter<UpdateRow>();

  @Output()
  updateViewTimeRange: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  @ViewChild('rowContainer', { static: true })
  rowContainer: ElementRef<HTMLDivElement>;

  @ViewChild('xAxisContainer', { static: true })
  xAxisContainer: ElementRef<HTMLDivElement>;

  drawWidth: number;
  xDomainMax: [Date, Date];
  xDomainView: [Date, Date];
  xScaleMax: ScaleTime<number, number>;
  xScaleView: ScaleTime<number, number>;
  xTicksView: XAxisTick[];

  constructor(private elRef: ElementRef) {}

  @HostListener('window:resize', ['$event.target'])
  onWindowResize() {
    this.draw();
  }

  ngOnChanges() {
    this.draw();
  }

  ngAfterViewChecked() {
    this.setRowContainerMaxHeight();
  }

  draw() {
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

    this.xScaleMax = scaleTime()
      .domain(this.xDomainMax)
      .range([0, this.drawWidth]);
    this.xScaleView = scaleTime()
      .domain(this.xDomainView)
      .range([0, this.drawWidth]);

    this.xTicksView = this.xScaleView.ticks().map((date: Date) => {
      const doyTimestamp = getDoyTimestamp(date.getTime(), false);
      const [yearDay, time] = doyTimestamp.split('T');
      return { date, time, yearDay };
    });
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
  imports: [CommonModule, TimelineRowModule, TimelineXAxisModule],
})
export class TimelineModule {}
