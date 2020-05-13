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
import * as d3 from 'd3';
import {
  getDoyTimestamp,
  getDoyTimestampFromSvgMousePosition,
  getPointFromCanvasSelection,
  getSvgMousePosition,
  getTooltipTextForPoints,
  getXScale,
  getYScale,
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
  UpdatePoint,
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
  height: number | undefined;

  @Input()
  horizontalGuides: Guide[] | undefined;

  @Input()
  id: string;

  @Input()
  marginBottom = 10;

  @Input()
  marginLeft = 70;

  @Input()
  marginRight = 70;

  @Input()
  marginTop = 10;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  showHorizontalGuideLabels = true;

  @Input()
  showHorizontalGuides = true;

  @Input()
  subBands: SubBand[];

  @Input()
  type: string;

  @Input()
  viewTimeRange: TimeRange;

  @Input()
  yAxes: Axis[] | undefined;

  @Output()
  openGuideDialog: EventEmitter<GuideDialogData> = new EventEmitter<
    GuideDialogData
  >();

  @Output()
  deleteHorizontalGuide: EventEmitter<string> = new EventEmitter<string>();

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

  @ViewChild('axisContainerGroup', { static: true })
  axisContainerGroup: ElementRef<SVGGElement>;

  @ViewChild('horizontalGuideGroup', { static: true })
  horizontalGuideGroup: ElementRef<SVGGElement>;

  @ViewChild('interactionContainerSvg', { static: true })
  interactionContainerSvg: ElementRef<SVGElement>;

  public defaultHeight = 200;
  public drawHeight: number;
  public drawWidth: number;

  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
    private subBandService: SubBandService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    let shouldRedraw = false;
    let shouldResize = false;

    this.setDrawBounds();

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
        const lineGroup = horizontalGuideGroup
          .append('g')
          .attr('class', 'guide--horizontal');
        lineGroup
          .append('line')
          .attr('class', 'guide--horizontal-line')
          .attr('id', guide.id)
          .attr('x1', 0)
          .attr('y1', guide.position)
          .attr('x2', this.drawWidth)
          .attr('y2', guide.position)
          .attr('stroke', guide.color || '#c9c9c9')
          .attr('stroke-width', guide.width || 2.0);
        let labelVisibility = 'visible';
        if (!this.showHorizontalGuideLabels) labelVisibility = 'hidden';
        lineGroup
          .append('text')
          .style('visibility', labelVisibility)
          .attr('class', 'guide--horizontal-text')
          .attr('x', 5)
          .attr('y', guide.position + yOffset)
          .attr('contentEditable', true)
          .text(guide.label.text || '');
        lineGroup.call(
          d3
            .drag()
            .subject(() => d3.event.sourceEvent.target)
            .on('drag', () => {
              const { event } = d3;
              const { y } = event;
              const { subject: line } = event;
              const { nextSibling: text } = line;

              if (text && y >= 0 && y <= this.drawHeight) {
                d3.select(line).attr('y1', y).attr('y2', y);
                d3.select(text).attr('y', y + yOffset);
              }
            })
            .on('end', () => {
              const { event } = d3;
              const { y } = event;
              const { subject: line } = event;
              const partialGuide: Partial<Guide> = {
                id: line.id,
                position: y,
              };
              this.updateHorizontalGuide.emit(partialGuide);
            }),
        );
      }
    }
  }

  onCreateHorizontalGuide() {
    const data: GuideDialogData = {
      bandId: this.id,
      maxPosition: this.drawHeight,
      mode: 'create',
      type: 'horizontal',
    };
    this.openGuideDialog.emit(data);
  }

  onEditHorizontalGuide(guide: Guide): void {
    const data: GuideDialogData = {
      bandId: this.id,
      guide,
      maxPosition: this.drawHeight,
      mode: 'edit',
      type: 'horizontal',
    };
    this.openGuideDialog.emit(data);
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
      const yScale = getYScale(yAxis.scaleDomain, this.drawHeight);
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

  getTimeFromSvgMousePosition(
    event: MouseEvent,
    offsetX: number = 0,
  ): { doyTimestamp: string; unixEpochTime: number } {
    const clickPosition = getSvgMousePosition(
      this.interactionContainerSvg.nativeElement,
      event,
    );
    const x = clickPosition.x - offsetX;
    const xScale = getXScale(this.viewTimeRange, this.drawWidth);
    const unixEpochTime = xScale.invert(x).getTime();
    const doyTimestamp = getDoyTimestamp(unixEpochTime);
    return { doyTimestamp, unixEpochTime };
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

    d3.select(this.interactionContainerSvg.nativeElement).on(
      'contextmenu',
      () => {
        const { event } = d3;
        const points = this.getPointsFromMouseEvent(event);
        hideTooltip();

        if (points.length) {
          // TODO.
        }
      },
    );

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
          const { id, type } = point;
          const {
            doyTimestamp,
            unixEpochTime,
          } = this.getTimeFromSvgMousePosition(sourceEvent, offsetX);
          hideTooltip();

          if (
            id &&
            type &&
            type === 'activity' &&
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
          const { id, type } = point;
          const {
            doyTimestamp,
            unixEpochTime,
          } = this.getTimeFromSvgMousePosition(sourceEvent, offsetX);

          if (id && type && type === 'activity' && point.x !== unixEpochTime) {
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
        if (points.length) {
          const tooltipText = getTooltipTextForPoints(points);
          showTooltip(event, tooltipText, this.drawWidth);
        } else {
          hideTooltip();
        }
      },
    );

    d3.select(this.interactionContainerSvg.nativeElement).on('mouseout', () => {
      hideTooltip();
    });
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();

    if (this.type === 'schedule') {
      const container = this.interactionContainerSvg.nativeElement;
      const { offsetX } = event;
      const xScale = getXScale(this.viewTimeRange, this.drawWidth);
      const doyTimestamp = getDoyTimestampFromSvgMousePosition(
        container,
        event,
        xScale,
      );
      showTooltip(event, doyTimestamp, this.drawWidth);
      d3.select(this.interactionContainerSvg.nativeElement)
        .append('rect')
        .attr('x', offsetX)
        .attr('y', 0)
        .attr('width', 1)
        .attr('height', this.drawHeight)
        .style('pointer-events', 'none');
    }
  }

  onDragLeave(): void {
    if (this.type === 'schedule') {
      const container = this.interactionContainerSvg.nativeElement;
      hideTooltip();
      d3.select(container).select('rect').remove();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (this.type === 'schedule') {
      const container = this.interactionContainerSvg.nativeElement;
      const { offsetX } = event;
      const xScale = getXScale(this.viewTimeRange, this.drawWidth);
      const doyTimestamp = getDoyTimestampFromSvgMousePosition(
        container,
        event,
        xScale,
      );
      showTooltip(event, doyTimestamp, this.drawWidth);
      d3.select(container).select('rect').attr('x', offsetX);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    if (this.type === 'schedule') {
      const container = this.interactionContainerSvg.nativeElement;
      hideTooltip();
      d3.select(container).select('rect').remove();
      const xScale = getXScale(this.viewTimeRange, this.drawWidth);
      const startTimestamp = getDoyTimestampFromSvgMousePosition(
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
