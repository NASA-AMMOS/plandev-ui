import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { curveLinear, line as d3Line } from 'd3-shape';
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
  styleUrls: ['./line-band.component.css'],
  templateUrl: './line-band.component.html',
})
export class LineBandComponent implements AfterViewInit, OnChanges {
  @Input()
  color: string | undefined;

  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  id: string;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  points: PointLine[] | undefined;

  @Input()
  viewTimeRange: TimeRange;

  @Input()
  yAxes: Axis[] | undefined;

  @Input()
  yAxisId: string;

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

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.resize();
  }

  resize(): void {
    this.subBandService.updateCanvases(
      this.id,
      this.drawHeight,
      this.drawWidth,
    );
    this.redraw();
  }

  /**
   * @note Make sure we `Math.floor` D3 scale values so we don't do sub-pixel rendering.
   */
  redraw(): void {
    const hiddenCanvasColor = rgbColorGenerator();
    const canvases = this.subBandService.getCanvases(this.id);

    forEachCanvas(canvases, (_, ctx) => {
      ctx.clearRect(0, 0, this.drawWidth, this.drawHeight);
    });

    const xScale = getXScale(this.viewTimeRange, this.drawWidth);
    const yAxes = this.yAxes || [];
    const [yAxis] = yAxes.filter(axis => this.yAxisId === axis.id);
    const domain = yAxis?.scaleDomain || [];
    const yScale = getYScale(domain, this.drawHeight);
    const points = this.points || [];

    // Line.
    const line = d3Line<PointLine>()
      .x(d => Math.floor(xScale(d.x)))
      .y(d => Math.floor(yScale(d.y)))
      .curve(curveLinear);
    forEachCanvas(canvases, (_, ctx) => {
      ctx.beginPath();
      line.context(ctx)(points);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = this.color || '#283593';
      ctx.stroke();
    });

    // Points.
    for (let i = 0, l = points.length; i < l; ++i) {
      const point = points[i];

      const x = Math.floor(xScale(point.x));
      const y = Math.floor(yScale(point.y));
      const circle = new Path2D();
      const radius = point.radius || 2.0;
      circle.arc(x, y, radius, 0, 2 * Math.PI);

      forEachCanvas(canvases, (canvas, ctx) => {
        if (canvas.classList.contains('hidden')) {
          const color = hiddenCanvasColor.next().value;
          this.subBandService.updateColorToPoint(this.id, color, point);
          ctx.fillStyle = color;
        } else {
          ctx.fillStyle = this.color || point?.color || '#283593';
        }
        ctx.fill(circle);
      });
    }
  }
}

@NgModule({
  declarations: [LineBandComponent],
  exports: [LineBandComponent],
  imports: [CommonModule],
})
export class LineBandModule {}
