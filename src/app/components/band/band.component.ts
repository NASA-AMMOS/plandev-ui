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
import * as d3 from 'd3';
import {
  getDoyTimestamp,
  getPointFromCanvasSelection,
  getTooltipTextForPoints,
  getXScale,
  hideTooltip,
  showTooltip,
} from '../../functions';
import { Axis, Point, SubBand, TimeRange } from '../../types';
import { SubBandService } from './sub-band.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SubBandService],
  selector: 'app-band',
  styleUrls: [`./band.component.css`],
  templateUrl: './band.component.html',
})
export class BandComponent implements AfterViewInit, OnChanges {
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
  selectPoint: EventEmitter<string> = new EventEmitter<string>();

  @ViewChild('axisContainerGroup', { static: true })
  axisContainerGroup: ElementRef;

  @ViewChild('interactionContainer', { static: true })
  interactionContainer: ElementRef;

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
    const axisContainerGroup = d3.select(this.axisContainerGroup.nativeElement);
    axisContainerGroup.selectAll('.axis--y').remove();
    const axisG = axisContainerGroup.append('g').attr('class', `axis--y`);
    axisG.selectAll('text').remove();
    axisG
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', 0 - this.drawHeight / 2)
      .attr('dy', '-2em')
      .attr('fill', this.yAxis.labelFillColor)
      .attr('font-size', `${this.yAxis.labelFontSize}px`)
      .style('text-anchor', 'middle')
      .text(this.yAxis.labelText);
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
    d3.select(this.interactionContainer.nativeElement).on('mousedown', () => {
      const event = d3.event as MouseEvent;
      const points = this.getPointsFromMouseEvent(event);

      if (points.length) {
        const [{ id }] = points;
        this.selectPoint.emit(id);
      }
    });

    d3.select(this.interactionContainer.nativeElement).call(
      d3
        .drag()
        .subject((): {} => {
          const event = d3.event.sourceEvent as MouseEvent;
          const points = this.getPointsFromMouseEvent(event);

          if (points.length) {
            return points[0];
          }

          return {};
        })
        .on('start', () => {})
        .on('drag', () => {})
        .on('end', () => {})
        .on('start.render drag.render end.render', () => {}),
    );

    d3.select(this.interactionContainer.nativeElement).on('mousemove', () => {
      const event = d3.event as MouseEvent;
      const points = this.getPointsFromMouseEvent(event);

      if (points.length) {
        const tooltipText = getTooltipTextForPoints(points);
        showTooltip(event, tooltipText, this.drawWidth);
      } else {
        hideTooltip();
      }
    });

    d3.select(this.interactionContainer.nativeElement).on('mouseout', () => {
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
