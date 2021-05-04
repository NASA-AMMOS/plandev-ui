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
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { ScaleTime } from 'd3-scale';
import {
  Axis,
  ConstraintViolation,
  CreatePoint,
  DeletePoint,
  HorizontalGuide,
  HorizontalGuideEvent,
  Layer,
  LayerEvent,
  MouseOverConstraintViolations,
  MouseOverPoints,
  MouseSelectPoints,
  SavePoint,
  SelectPoint,
  TimeRange,
  UpdatePoint,
  UpdateRow,
  VerticalGuide,
  XAxisTick,
} from '../../types';
import { TimelineRowHorizontalGuidesModule } from './timeline-row-horizontal-guides.component';
import { TimelineRowLayerActivityModule } from './timeline-row-layer-activity.component';
import { TimelineRowLayerLineModule } from './timeline-row-layer-line.component';
import { TimelineRowLayerXRangeModule } from './timeline-row-layer-x-range.component';
import { TimelineRowMenuModule } from './timeline-row-menu.component';
import { TimelineRowVerticalGuidesModule } from './timeline-row-vertical-guides.component';
import { TimelineRowXAxisTicksModule } from './timeline-row-x-axis-ticks.component';
import { TimelineRowYAxesModule } from './timeline-row-y-axes.component';
import { TimelineSharedConstraintViolationsModule } from './timeline-shared-constraint-violations.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row',
  styles: [
    `
      .container {
        background: white;
        border-bottom: 1px solid lightgrey;
        display: block;
        position: relative;
        width: 100%;
        z-index: 0;
      }

      .axis-container,
      .overlay-container,
      .row-container {
        cursor: pointer;
        height: inherit;
        position: absolute;
        width: inherit;
      }

      .axis-container {
        z-index: -1;
      }

      .overlay-container {
        z-index: 2;
      }

      .row-container {
        z-index: 1;
      }
    `,
  ],
  template: `
    <div class="container" [attr.style]="'height:' + drawHeight + 'px;'">
      <svg
        #overlay
        class="overlay-container"
        [ngStyle]="{
          height: drawHeight + 'px',
          transform: 'translate(' + marginLeft + 'px ,' + marginTop + 'px)',
          width: drawWidth + 'px'
        }"
      >
        <g
          aerie-timeline-shared-constraint-violations
          [constraintViolations]="constraintViolations"
          [drawHeight]="drawHeight"
          [drawWidth]="drawWidth"
          [mousemove]="mousemove"
          [mouseout]="mouseout"
          [xScaleView]="xScaleView"
          (mouseOverConstraintViolations)="
            mouseOverConstraintViolations.emit($event)
          "
        ></g>
        <g
          aerie-timeline-row-horizontal-guides
          [drawHeight]="drawHeight"
          [drawWidth]="drawWidth"
          [horizontalGuides]="horizontalGuides"
          [yAxes]="yAxes"
        ></g>
      </svg>

      <div
        class="row-container"
        [ngStyle]="{
          height: drawHeight + 'px',
          transform: 'translate(' + marginLeft + 'px ,' + marginTop + 'px)',
          width: drawWidth + 'px'
        }"
      >
        <ng-container *ngFor="let layer of layers; trackBy: trackByLayers">
          <aerie-timeline-row-layer-activity
            *ngIf="layer.chartType === 'activity'"
            [dragenter]="dragenter"
            [dragleave]="dragleave"
            [dragover]="dragover"
            [drop]="drop"
            [drawHeight]="drawHeight"
            [drawWidth]="drawWidth"
            [id]="layer.id"
            [mousedown]="mousedown"
            [mousemove]="mousemove"
            [mouseout]="mouseout"
            [mouseup]="mouseup"
            [overlay]="overlay"
            [points]="layer.points"
            [rowId]="id"
            [viewTimeRange]="viewTimeRange"
            [xScaleView]="xScaleView"
            (mouseOverPoints)="mouseOverPoints.emit($event)"
            (mouseSelectPoints)="onMouseSelectPoints($event)"
            (createPoint)="createPoint.emit($event)"
            (savePoint)="savePoint.emit($event)"
            (updatePoint)="updatePoint.emit($event)"
            (updateRow)="onUpdateRow($event)"
          ></aerie-timeline-row-layer-activity>
          <aerie-timeline-row-layer-line
            *ngIf="layer.chartType === 'line'"
            [color]="layer.color"
            [curveType]="layer.curveType"
            [drawHeight]="drawHeight"
            [drawWidth]="drawWidth"
            [id]="layer.id"
            [mousemove]="mousemove"
            [mouseout]="mouseout"
            [points]="layer.points"
            [viewTimeRange]="viewTimeRange"
            [xScaleView]="xScaleView"
            [yAxes]="yAxes"
            [yAxisId]="layer.yAxisId"
            (mouseOverPoints)="mouseOverPoints.emit($event)"
          ></aerie-timeline-row-layer-line>
          <aerie-timeline-row-layer-x-range
            *ngIf="layer.chartType === 'x-range'"
            [colorScheme]="layer.colorScheme"
            [domain]="layer.domain"
            [drawHeight]="drawHeight"
            [drawWidth]="drawWidth"
            [id]="layer.id"
            [mousemove]="mousemove"
            [mouseout]="mouseout"
            [opacity]="layer.opacity"
            [points]="layer.points"
            [viewTimeRange]="viewTimeRange"
            [xScaleView]="xScaleView"
            (mouseOverPoints)="mouseOverPoints.emit($event)"
          ></aerie-timeline-row-layer-x-range>
        </ng-container>
      </div>

      <aerie-timeline-row-x-axis-ticks
        [drawHeight]="drawHeight"
        [marginLeft]="marginLeft"
        [xScaleView]="xScaleView"
        [xTicksView]="xTicksView"
      ></aerie-timeline-row-x-axis-ticks>

      <aerie-timeline-row-y-axes
        [drawHeight]="drawHeight"
        [marginLeft]="marginLeft"
        [yAxes]="yAxes"
      ></aerie-timeline-row-y-axes>

      <aerie-timeline-row-vertical-guides
        [drawHeight]="drawHeight"
        [marginLeft]="marginLeft"
        [verticalGuides]="verticalGuides"
        [xScaleView]="xScaleView"
      ></aerie-timeline-row-vertical-guides>

      <aerie-timeline-row-menu
        [horizontalGuides]="horizontalGuides"
        [layers]="layers"
        (createHorizontalGuide)="onCreateHorizontalGuide()"
        (deleteHorizontalGuide)="onDeleteHorizontalGuide($event)"
        (updateHorizontalGuide)="onUpdateHorizontalGuide($event)"
        (updateLayer)="onUpdateLayer($event)"
      ></aerie-timeline-row-menu>
    </div>
  `,
})
export class TimelineRowComponent implements AfterViewInit, OnDestroy {
  @Input() autoAdjustHeight: boolean | undefined;
  @Input() constraintViolations: ConstraintViolation[];
  @Input() drawHeight: number;
  @Input() drawWidth: number;
  @Input() horizontalGuides: HorizontalGuide[] | undefined;
  @Input() id: string;
  @Input() layers: Layer[];
  @Input() marginLeft: number;
  @Input() marginRight: number;
  @Input() maxTimeRange: TimeRange;
  @Input() verticalGuides: VerticalGuide[];
  @Input() viewTimeRange: TimeRange | undefined;
  @Input() xScaleView: ScaleTime<number, number>;
  @Input() xTicksView: XAxisTick[] = [];
  @Input() yAxes: Axis[] | undefined;

  @Output() createHorizontalGuide: E<HorizontalGuideEvent> = new E();
  @Output() createPoint: E<CreatePoint> = new E();
  @Output() deleteHorizontalGuide: E<HorizontalGuideEvent> = new E();
  @Output() deletePoint: E<DeletePoint> = new E();
  @Output()
  mouseOverConstraintViolations: E<MouseOverConstraintViolations> = new E();
  @Output() mouseOverPoints: E<MouseOverPoints> = new E();
  @Output() savePoint: E<SavePoint> = new E();
  @Output() selectPoint: E<SelectPoint> = new E();
  @Output() updateHorizontalGuide: E<HorizontalGuideEvent> = new E();
  @Output() updateLayer: E<LayerEvent> = new E();
  @Output() updatePoint: E<UpdatePoint> = new E();
  @Output() updateRow: E<UpdateRow> = new E();

  @ViewChild('overlay', { static: true }) overlay: ElementRef<SVGElement>;

  dragenter: DragEvent;
  dragenterListener: (dragenter: DragEvent) => void;
  dragleave: DragEvent;
  dragleaveListener: (dragleave: DragEvent) => void;
  dragover: DragEvent;
  dragoverListener: (dragover: DragEvent) => void;
  drop: DragEvent;
  dropListener: (drop: DragEvent) => void;
  mousedown: MouseEvent;
  mousedownListener: (mouseout: MouseEvent) => void;
  mousemove: MouseEvent;
  mousemoveListener: (mousemove: MouseEvent) => void;
  mouseout: MouseEvent;
  mouseoutListener: (mouseout: MouseEvent) => void;
  mouseup: MouseEvent;
  mouseupListener: (mouseout: MouseEvent) => void;

  marginTop = 0;

  constructor(private cdRef: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.initEventListeners();
  }

  ngOnDestroy(): void {
    this.destroyEventListeners();
  }

  destroyEventListeners() {
    const overlay = this.overlay.nativeElement;
    overlay.removeEventListener('dragenter', this.dragenterListener);
    overlay.removeEventListener('dragleave', this.dragleaveListener);
    overlay.removeEventListener('dragover', this.dragoverListener);
    overlay.removeEventListener('drop', this.dropListener);
    overlay.removeEventListener('mousedown', this.mousedownListener);
    overlay.removeEventListener('mousemove', this.mousemoveListener);
    overlay.removeEventListener('mouseout', this.mouseoutListener);
    overlay.removeEventListener('mouseup', this.mouseupListener);
  }

  initEventListeners() {
    const { nativeElement: overlay } = this.overlay;

    // dragenter
    this.dragenterListener = (dragenter: DragEvent) => {
      dragenter.preventDefault();
      this.dragenter = dragenter;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('dragenter', this.dragenterListener);

    // dragleave
    this.dragleaveListener = (dragleave: DragEvent) => {
      this.dragleave = dragleave;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('dragleave', this.dragleaveListener);

    // dragover
    this.dragoverListener = (dragover: DragEvent) => {
      dragover.preventDefault();
      this.dragover = dragover;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('dragover', this.dragoverListener);

    // drop.
    this.dropListener = (drop: DragEvent) => {
      drop.preventDefault();
      this.drop = drop;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('drop', this.dropListener);

    // mousedown.
    this.mousedownListener = (mousedown: MouseEvent) => {
      this.mousedown = mousedown;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('mousedown', this.mousedownListener);

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

    // mouseup.
    this.mouseupListener = (mouseup: MouseEvent) => {
      this.mouseup = mouseup;
      this.cdRef.detectChanges();
    };
    overlay.addEventListener('mouseup', this.mouseupListener);
  }

  onCreateHorizontalGuide() {
    const event: HorizontalGuideEvent = {
      mode: 'create',
      rowId: this.id,
      yAxes: this.yAxes,
    };
    this.createHorizontalGuide.emit(event);
  }

  onDeleteHorizontalGuide(guide: HorizontalGuide) {
    const event: HorizontalGuideEvent = {
      guide,
      mode: 'delete',
      rowId: this.id,
    };
    this.deleteHorizontalGuide.emit(event);
  }

  onMouseSelectPoints(event: MouseSelectPoints) {
    if (event.points.length) {
      const [point] = event.points;
      this.selectPoint.emit({ id: point.id, type: point.type });
    }
  }

  onUpdateHorizontalGuide(guide: HorizontalGuide) {
    const event: HorizontalGuideEvent = {
      guide,
      mode: 'edit',
      rowId: this.id,
      yAxes: this.yAxes,
    };
    this.updateHorizontalGuide.emit(event);
  }

  onUpdateLayer(layer: Layer) {
    const event: LayerEvent = {
      layer,
      mode: 'edit',
      rowId: this.id,
    };
    this.updateLayer.emit(event);
  }

  onUpdateRow(event: UpdateRow) {
    if (this.autoAdjustHeight === undefined || this.autoAdjustHeight === true) {
      this.updateRow.emit(event);
    }
  }

  trackByLayers(_: number, layer: Layer) {
    return layer.id;
  }
}

@NgModule({
  declarations: [TimelineRowComponent],
  exports: [TimelineRowComponent],
  imports: [
    CommonModule,
    TimelineRowHorizontalGuidesModule,
    TimelineRowLayerActivityModule,
    TimelineRowLayerLineModule,
    TimelineRowLayerXRangeModule,
    TimelineRowMenuModule,
    TimelineRowVerticalGuidesModule,
    TimelineRowXAxisTicksModule,
    TimelineRowYAxesModule,
    TimelineSharedConstraintViolationsModule,
  ],
})
export class TimelineRowModule {}
