import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import * as d3 from 'd3';
import { SvgConstraintViolationCollection } from '../../classes';
import {
  getPointFromCanvasSelection,
  getSvgMousePosition,
  getTimeFromSvgMousePosition,
  getTooltipTextForPoints,
  getXScale,
  getYScale,
  hasSubBandOfType,
  hideTooltip,
  showTooltip,
} from '../../functions';
import { MaterialModule } from '../../material';
import {
  Axis,
  CreatePoint,
  DeletePoint,
  Guide,
  GuideDialogData,
  Point,
  SavePoint,
  SelectPoint,
  SubBand,
  TimeRange,
  UpdateBand,
  UpdatePoint,
  Violation,
} from '../../types';
import { ActivityBandModule } from './activity-band/activity-band.component';
import { LineBandModule } from './line-band/line-band.component';
import { SubBandService } from './sub-band.service';
import { XRangeBandModule } from './x-range-band/x-range-band.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SubBandService],
  selector: 'app-band',
  styleUrls: [`./band.component.css`],
  templateUrl: './band.component.html',
})
export class BandComponent implements AfterViewInit, OnChanges {
  @Input()
  constraintViolations: Violation[] | undefined = [];

  @Input()
  height: number | undefined;

  @Input()
  horizontalGuides: Guide[] | undefined;

  @Input()
  id: string;

  @Input()
  marginLeft = 70;

  @Input()
  marginRight = 70;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  showHorizontalGuideLabels = true;

  @Input()
  showHorizontalGuides = true;

  @Input()
  subBands: SubBand[];

  @Input()
  viewTimeRange: TimeRange;

  @Input()
  yAxes: Axis[] | undefined;

  @Output()
  openGuideDialog: EventEmitter<GuideDialogData> = new EventEmitter<
    GuideDialogData
  >();

  @Output()
  deleteHorizontalGuide: EventEmitter<Guide> = new EventEmitter<Guide>();

  @Output()
  updateHorizontalGuide: EventEmitter<Partial<Guide>> = new EventEmitter<
    Partial<Guide>
  >();

  @Output()
  createPoint: EventEmitter<CreatePoint> = new EventEmitter<CreatePoint>();

  @Output()
  deletePoint: EventEmitter<DeletePoint> = new EventEmitter<DeletePoint>();

  @Output()
  savePoint: EventEmitter<SavePoint> = new EventEmitter<SavePoint>();

  @Output()
  selectPoint: EventEmitter<SelectPoint> = new EventEmitter<SelectPoint>();

  @Output()
  updatePoint: EventEmitter<UpdatePoint> = new EventEmitter<UpdatePoint>();

  @Output()
  updateBand: EventEmitter<UpdateBand> = new EventEmitter<UpdateBand>();

  @ViewChild('axisContainerGroup', { static: true })
  axisContainerGroup: ElementRef<SVGGElement>;

  @ViewChild('constraintViolationsGroup', { static: true })
  constraintViolationsGroup: ElementRef<SVGGElement>;

  @ViewChild('horizontalGuideGroup', { static: true })
  horizontalGuideGroup: ElementRef<SVGGElement>;

  @ViewChild('interactionContainerSvg', { static: true })
  interactionContainerSvg: ElementRef<SVGElement>;

  @ViewChild('verticalGuideGroup', { static: true })
  verticalGuideGroup: ElementRef<SVGGElement>;

  public defaultHeight = 200;
  public drawHeight: number;
  public drawWidth: number;
  public marginBottom = 1;
  public marginTop = 1;
  public violationCollection: SvgConstraintViolationCollection;

  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
    private subBandService: SubBandService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    let shouldRedraw = false;
    let shouldResize = false;

    this.setDrawBounds();

    if (changes.constraintViolations) {
      shouldRedraw = true;
    }

    if (changes.height) {
      this.setHeight(this.height);
    }

    if (changes.horizontalGuides) {
      shouldRedraw = true;
    }

    if (changes.viewTimeRange && !changes.viewTimeRange.isFirstChange()) {
      shouldRedraw = true;
    }

    if (changes.yAxes && !changes.yAxes.isFirstChange()) {
      shouldResize = true;
    }

    if (shouldResize) {
      this.resize();
    } else if (shouldRedraw) {
      this.redraw();
    }
  }

  ngAfterViewInit(): void {
    this.setDrawBounds();
    this.initEvents();
    this.redraw();
  }

  drawHorizontalGuides(): void {
    const { nativeElement } = this.horizontalGuideGroup;
    const horizontalGuideGroup = d3.select(nativeElement);
    horizontalGuideGroup.selectAll('.guide--horizontal').remove();

    const yOffset = 15;
    const horizontalGuides = this.horizontalGuides || [];
    for (const guide of horizontalGuides) {
      if (this.showHorizontalGuides) {
        const yAxis = this.yAxes.find(axis => axis.id === guide.yAxisId);
        const domain = yAxis?.scaleDomain;
        if (domain && domain.length) {
          const yScale = getYScale(domain, this.drawHeight);
          const y = yScale(guide.y);
          const lineGroup = horizontalGuideGroup
            .append('g')
            .attr('class', 'guide--horizontal');
          lineGroup
            .append('line')
            .attr('class', 'guide--horizontal-line')
            .attr('id', guide.id)
            .attr('x1', 0)
            .attr('y1', y)
            .attr('x2', this.drawWidth)
            .attr('y2', y)
            .attr('stroke', '#c9c9c9')
            .attr('stroke-width', 2.0);
          let labelVisibility = 'visible';
          if (!this.showHorizontalGuideLabels) {
            labelVisibility = 'hidden';
          }
          lineGroup
            .append('text')
            .style('visibility', labelVisibility)
            .attr('class', 'guide--horizontal-text')
            .attr('x', 5)
            .attr('y', y + yOffset)
            .attr('contentEditable', true)
            .text(guide.label.text || '');
        }
      }
    }
  }

  onCreateHorizontalGuide() {
    const data: GuideDialogData = {
      bandId: this.id,
      mode: 'create',
      type: 'horizontal',
      yAxes: this.yAxes,
    };
    this.openGuideDialog.emit(data);
  }

  onEditHorizontalGuide(guide: Guide): void {
    const data: GuideDialogData = {
      bandId: this.id,
      guide,
      mode: 'edit',
      type: 'horizontal',
      yAxes: this.yAxes,
    };
    this.openGuideDialog.emit(data);
  }

  drawConstraintViolations(): void {
    const constraintViolations = this.constraintViolations || [];
    const xScale = getXScale(this.viewTimeRange, this.drawWidth);
    this.violationCollection = new SvgConstraintViolationCollection(
      this.constraintViolationsGroup.nativeElement,
      this.id,
      this.drawHeight,
      this.drawWidth,
      this.marginTop,
      this.viewTimeRange,
      constraintViolations,
      xScale,
    );
    this.violationCollection.drawAll();
  }

  drawXAxis(): void {
    const xScale = getXScale(this.viewTimeRange, this.drawWidth);
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((date: Date) => getDoyTimestamp(date.getTime(), false))
      .tickSizeInner(-this.drawHeight);
    const axisContainerGroup = d3.select(this.axisContainerGroup.nativeElement);
    axisContainerGroup.selectAll('.axis--x').remove();
    const axisG = axisContainerGroup
      .append('g')
      .attr('class', `axis--x`)
      .attr('transform', `translate(0, ${this.drawHeight})`);
    axisG.call(xAxis);
  }

  drawYAxis(): void {
    let totalWidth = 0;
    const axisContainerGroup = d3.select(this.axisContainerGroup.nativeElement);
    axisContainerGroup.selectAll('.axis--y').remove();

    const yAxes = this.yAxes || [];
    for (let i = 0; i < yAxes.length; ++i) {
      const axisG = axisContainerGroup.append('g').attr('class', `axis--y`);
      axisG.selectAll('*').remove();

      const yAxis = yAxes[i];
      const domain = yAxis?.scaleDomain || [];
      const yScale = getYScale(domain, this.drawHeight);
      const axis = d3.axisLeft(yScale).ticks(yAxis.tickCount || 5);

      const axisMargin = 20;
      const startPosition = -(totalWidth + axisMargin * i);
      axisG.attr('transform', `translate(${startPosition}, 0)`);
      axisG.style('color', yAxis.color || '#000000');
      axisG.call(axis);

      const axisGElement: SVGGElement = axisG.node();
      const axisWidth = axisGElement.getBoundingClientRect().width;
      const axisLabelMargin = 20;
      const y = -(axisWidth + axisLabelMargin);

      axisG
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', y)
        .attr('x', 0 - this.drawHeight / 2)
        .attr('dy', '1em')
        .attr('fill', yAxis.label?.color || '#000000')
        .attr('font-size', `${yAxis.label?.fontSize || 12}px`)
        .style('text-anchor', 'middle')
        .text(yAxis.label?.text || '');

      // Calculate new width after text has been added.
      totalWidth += axisGElement.getBoundingClientRect().width;
    }
  }

  getPointsFromMouseEvent(event: MouseEvent): Point[] {
    const points: Point[] = [];
    const subBands = Object.values(this.subBands);

    for (let i = 0, l = subBands.length; i < l; ++i) {
      const { id } = subBands[i];
      const hiddenCanvas = this.subBandService.getHiddenCanvas(id);
      const colorToPoint = this.subBandService.getColorToPoint(id);

      const point = getPointFromCanvasSelection(
        event,
        hiddenCanvas,
        colorToPoint,
      );

      if (point) {
        points.push(point);
      }
    }

    return points;
  }

  initEvents(): void {
    let offsetX = 0;

    d3.select(this.interactionContainerSvg.nativeElement).call(
      d3
        .drag()
        .subject(() => {
          const { event } = d3;
          const { sourceEvent } = event;
          const points = this.getPointsFromMouseEvent(sourceEvent);

          if (points.length) {
            const [point] = points;
            this.selectPoint.emit({ id: point.id, type: point.type });
            return point;
          }

          return {};
        })
        .on('start', () => {
          const { event } = d3;
          const { sourceEvent, subject: point } = event;
          const { x } = getSvgMousePosition(
            this.interactionContainerSvg.nativeElement,
            sourceEvent,
          );
          const xScale = getXScale(this.viewTimeRange, this.drawWidth);
          offsetX = x - xScale(point.x);
        })
        .on('drag', () => {
          const { event } = d3;
          const { sourceEvent, subject: point } = event;
          const { id, parent, type } = point;
          const xScale = getXScale(this.viewTimeRange, this.drawWidth);
          const { doyTimestamp, unixEpochTime } = getTimeFromSvgMousePosition(
            this.interactionContainerSvg.nativeElement,
            sourceEvent,
            xScale,
            offsetX,
          );
          hideTooltip();

          if (
            id &&
            type &&
            type === 'activity' &&
            parent === null &&
            unixEpochTime >= this.maxTimeRange.start &&
            unixEpochTime <= this.maxTimeRange.end
          ) {
            const newPoint = { ...point, x: unixEpochTime };
            const tooltipText = getTooltipTextForPoints([newPoint]);
            showTooltip(sourceEvent, tooltipText, this.drawWidth);

            this.updatePoint.emit({
              id,
              type,
              value: { startTimestamp: doyTimestamp },
            });
          }
        })
        .on('end', () => {
          const { event } = d3;
          const { sourceEvent, subject: point } = event;
          const { id, parent, type } = point;
          const xScale = getXScale(this.viewTimeRange, this.drawWidth);
          const { doyTimestamp, unixEpochTime } = getTimeFromSvgMousePosition(
            this.interactionContainerSvg.nativeElement,
            sourceEvent,
            xScale,
            offsetX,
          );

          if (
            id &&
            type &&
            type === 'activity' &&
            parent === null &&
            point.x !== unixEpochTime
          ) {
            this.savePoint.emit({
              id,
              type,
              value: { startTimestamp: doyTimestamp },
            });
          }
        }),
    );

    d3.select(this.interactionContainerSvg.nativeElement).on(
      'mousemove',
      () => {
        const event = d3.event as MouseEvent;
        const points = this.getPointsFromMouseEvent(event);
        const xScale = getXScale(this.viewTimeRange, this.drawWidth);
        const { doyTimestamp, unixEpochTime } = getTimeFromSvgMousePosition(
          this.interactionContainerSvg.nativeElement,
          event,
          xScale,
        );
        let tooltipText = `${doyTimestamp}<br>`;
        if (points.length) {
          tooltipText += getTooltipTextForPoints(points);
        }
        if (this.violationCollection) {
          tooltipText += this.violationCollection.getTooltipText(unixEpochTime);
        }
        showTooltip(event, tooltipText, this.drawWidth);
      },
    );

    d3.select(this.interactionContainerSvg.nativeElement).on('mouseout', () => {
      hideTooltip();
    });
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (hasSubBandOfType(this.subBands, 'activity')) {
      const container = this.interactionContainerSvg.nativeElement;
      const { offsetX } = event;
      const xScale = getXScale(this.viewTimeRange, this.drawWidth);
      const { doyTimestamp } = getTimeFromSvgMousePosition(
        container,
        event,
        xScale,
      );
      showTooltip(event, doyTimestamp, this.drawWidth);
      d3.select(this.interactionContainerSvg.nativeElement)
        .append('rect')
        .attr('class', 'activity-drag-guide')
        .attr('x', offsetX)
        .attr('y', 0)
        .attr('width', 1)
        .attr('height', this.drawHeight)
        .style('pointer-events', 'none');
    }
  }

  onDragLeave(): void {
    if (hasSubBandOfType(this.subBands, 'activity')) {
      const container = this.interactionContainerSvg.nativeElement;
      hideTooltip();
      d3.select(container).select('.activity-drag-guide').remove();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (hasSubBandOfType(this.subBands, 'activity')) {
      const container = this.interactionContainerSvg.nativeElement;
      const { offsetX } = event;
      const xScale = getXScale(this.viewTimeRange, this.drawWidth);
      const { doyTimestamp } = getTimeFromSvgMousePosition(
        container,
        event,
        xScale,
      );
      showTooltip(event, doyTimestamp, this.drawWidth);
      d3.select(container).select('.activity-drag-guide').attr('x', offsetX);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (hasSubBandOfType(this.subBands, 'activity')) {
      const container = this.interactionContainerSvg.nativeElement;
      hideTooltip();
      d3.select(container).select('.activity-drag-guide').remove();
      const xScale = getXScale(this.viewTimeRange, this.drawWidth);
      const { doyTimestamp: startTimestamp } = getTimeFromSvgMousePosition(
        container,
        event,
        xScale,
      );
      const activityType = JSON.parse(
        event.dataTransfer.getData('activityType'),
      );
      this.createPoint.emit({ activityType, startTimestamp, type: 'activity' });
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.resize();
  }

  resize(): void {
    this.redraw();
  }

  redraw(): void {
    this.setDrawBounds();
    this.drawXAxis();
    this.drawYAxis();
    this.drawHorizontalGuides();
    this.drawConstraintViolations();
    this.cdRef.detectChanges();
  }

  setDrawBounds(): void {
    const height = this.height || this.defaultHeight;
    this.drawHeight = height - this.marginTop - this.marginBottom;
    this.drawWidth =
      this.elRef.nativeElement.clientWidth - this.marginLeft - this.marginRight;
  }

  setHeight(height: number = this.defaultHeight): void {
    this.elRef.nativeElement.style.setProperty('--height', `${height}px`);
  }
}

@NgModule({
  declarations: [BandComponent],
  exports: [BandComponent],
  imports: [
    ActivityBandModule,
    CommonModule,
    LineBandModule,
    MaterialModule,
    XRangeBandModule,
  ],
})
export class BandModule {}
