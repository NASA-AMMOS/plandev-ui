import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatMenuTrigger } from '@angular/material';
import * as d3 from 'd3';
import { ContextMenu } from '../../classes';
import {
  getDoyTimestamp,
  getPointFromCanvasSelection,
  getSvgMousePosition,
  getTooltipTextForPoints,
  getXScale,
  getYScale,
  hideTooltip,
  showTooltip,
} from '../../functions';
import {
  Axis,
  DeletePoint,
  Point,
  SubBand,
  TimeRange,
  UpdatePoint,
} from '../../types';
import { SubBandService } from './sub-band.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SubBandService],
  selector: 'app-band',
  styleUrls: [`./band.component.css`],
  templateUrl: './band.component.html',
})
export class BandComponent extends ContextMenu
  implements AfterViewInit, OnChanges {
  @Input()
  height: number;

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
  subBands: SubBand[];

  @Input()
  viewTimeRange: TimeRange;

  @Input()
  yAxis: Axis;

  @Output()
  deletePoint: EventEmitter<DeletePoint> = new EventEmitter<DeletePoint>();

  @Output()
  savePoint: EventEmitter<UpdatePoint> = new EventEmitter<UpdatePoint>();

  @Output()
  selectPoint: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  updatePoint: EventEmitter<UpdatePoint> = new EventEmitter<UpdatePoint>();

  @ViewChild('activityBandContextMenuTrigger', { static: true })
  activityBandContextMenuTrigger: MatMenuTrigger;

  @ViewChild('axisContainerGroup', { static: true })
  axisContainerGroup: ElementRef;

  @ViewChild('interactionContainerSvg', { static: true })
  interactionContainerSvg: ElementRef;

  public drawHeight: number;
  public drawWidth: number;

  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
    private subBandService: SubBandService,
  ) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    let shouldRedraw = false;
    let shouldResize = false;

    this.setDrawBounds();

    if (changes.height) {
      this.setHeight(this.height);
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

  drawXAxis(): void {
    const xScale = getXScale(this.viewTimeRange, this.drawWidth);
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
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
    const yScale = getYScale(this.yAxis.scaleDomain, this.drawHeight);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    const axisContainerGroup = d3.select(this.axisContainerGroup.nativeElement);
    axisContainerGroup.selectAll('.axis--y').remove();
    const axisG = axisContainerGroup.append('g').attr('class', `axis--y`);
    axisG.call(yAxis);
    axisG
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', 0 - this.drawHeight / 2)
      .attr('dy', this.yAxis.labelOffset)
      .attr('fill', this.yAxis.labelFillColor)
      .attr('font-size', `${this.yAxis.labelFontSize}px`)
      .style('text-anchor', 'middle')
      .text(this.yAxis.labelText);
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
          const [point] = points;

          if (point.type === 'activity') {
            this.onContextMenu(
              event,
              this.activityBandContextMenuTrigger,
              point,
            );
          }
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
            this.selectPoint.emit(point.id);
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
    this.cdRef.detectChanges();
  }

  setDrawBounds(): void {
    this.drawHeight = this.height - this.marginTop - this.marginBottom;
    this.drawWidth =
      this.elRef.nativeElement.clientWidth - this.marginLeft - this.marginRight;
  }

  setHeight(height: number = 200): void {
    this.elRef.nativeElement.style.setProperty('--height', `${height}px`);
  }

  trackBySubBands(_: number, subBand: SubBand): string {
    return subBand.id;
  }
}
