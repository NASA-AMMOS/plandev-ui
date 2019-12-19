import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as d3 from 'd3';
import {
  forEachCanvas,
  getXScale,
  getYScale,
  rgbColorGenerator,
} from '../../../functions';
import { Axis, PointLine, TimeRange } from '../../../types';
import { SubBandService } from '../sub-band.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-line-band',
  templateUrl: './line-band.component.html',
})
export class LineBandComponent implements AfterViewInit, OnChanges {
  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  id: string;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  points: PointLine[];

  @Input()
  viewTimeRange: TimeRange;

  @Input()
  yAxis: Axis;

  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;

  constructor(private subBandService: SubBandService) {}

  ngOnChanges(changes: SimpleChanges): void {
    let shouldRedraw = false;
    let shouldResize = false;

    if (changes.drawHeight && !changes.drawHeight.isFirstChange()) {
      shouldResize = true;
    }

    if (changes.drawWidth && !changes.drawWidth.isFirstChange()) {
      shouldResize = true;
    }

    if (changes.points && !changes.points.isFirstChange()) {
      shouldRedraw = true;
    }

    if (changes.viewTimeRange && !changes.viewTimeRange.isFirstChange()) {
      shouldRedraw = true;
    }

    if (changes.yAxes && !changes.yAxes.isFirstChange()) {
      shouldRedraw = true;
    }

    // Only resize OR redraw once to maintain performance.
    if (shouldResize) {
      this.resize();
    } else if (shouldRedraw) {
      this.redraw();
    }
  }

  ngAfterViewInit(): void {
    this.subBandService.setCanvases(
      this.id,
      this.canvas.nativeElement,
      this.drawHeight,
      this.drawWidth,
    );
    this.redraw();
  }

  /**
   * Global Event Listener. Called on window resize.
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.resize();
  }

  /**
   * Called to resize the timeline.
   */
  resize(): void {
    this.subBandService.updateCanvases(
      this.id,
      this.drawHeight,
      this.drawWidth,
    );
    this.redraw();
  }

  /**
   * Called to redraw the band.
   * Make sure we `Math.floor` D3 scale values so we don't do sub-pixel rendering.
   */
  redraw(): void {
    const hiddenCanvasColor = rgbColorGenerator();
    const canvases = this.subBandService.getCanvases(this.id);

    forEachCanvas(canvases, (_, ctx) => {
      ctx.clearRect(0, 0, this.drawWidth, this.drawHeight);
    });

    const xScale = getXScale(this.viewTimeRange, this.drawWidth);
    const yScale = getYScale(this.yAxis.scaleDomain, this.drawHeight);

    // Line.
    const line = d3
      .line<PointLine>()
      .x(d => Math.floor(xScale(d.x)))
      .y(d => Math.floor(yScale(d.y)))
      .curve(d3.curveLinear);
    forEachCanvas(canvases, (_, ctx) => {
      ctx.beginPath();
      line.context(ctx)(this.points);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#2aba3b';
      ctx.stroke();
    });

    // Points.
    for (let i = 0, l = this.points.length; i < l; ++i) {
      const point = this.points[i];

      const x = Math.floor(xScale(point.x));
      const y = Math.floor(yScale(point.y));
      const circle = new Path2D();
      circle.arc(x, y, point.radius, 0, 2 * Math.PI);

      forEachCanvas(canvases, (canvas, ctx) => {
        if (canvas.classList.contains('hidden')) {
          const color = hiddenCanvasColor.next().value;
          this.subBandService.updateColorToPoint(this.id, color, point);
          ctx.fillStyle = color;
        } else {
          ctx.fillStyle = point.color;
        }
        ctx.fill(circle);
      });
    }
  }
}
