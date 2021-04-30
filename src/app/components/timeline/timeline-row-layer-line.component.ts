import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { quadtree, Quadtree } from 'd3-quadtree';
import { ScaleTime } from 'd3-scale';
import {
  curveLinear,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  line as d3Line,
} from 'd3-shape';
import { getYScale, searchQuadtreePoint, tick } from '../../functions';
import {
  Axis,
  LinePoint,
  MouseOverPoints,
  QuadtreePoint,
  StringTMap,
  TimeRange,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-layer-line',
  styles: [
    `
      canvas {
        position: absolute;
        z-index: -1;
      }
    `,
  ],
  template: `
    <canvas
      #canvas
      [attr.height]="drawHeight * dpr"
      [attr.width]="drawWidth * dpr"
      [ngStyle]="{
        height: drawHeight + 'px',
        width: drawWidth + 'px'
      }"
    ></canvas>
  `,
})
export class TimelineRowLayerLineComponent implements AfterViewInit, OnChanges {
  @Input() color: string | undefined;
  @Input() curveType = 'curveLinear';
  @Input() drawHeight: number;
  @Input() drawWidth: number;
  @Input() id: string;
  @Input() mousemove: MouseEvent;
  @Input() mouseout: MouseEvent;
  @Input() points: LinePoint[] | undefined;
  @Input() viewTimeRange: TimeRange;
  @Input() xScaleView: ScaleTime<number, number>;
  @Input() yAxes: Axis[] | undefined;
  @Input() yAxisId: string;

  @Output() mouseOverPoints: E<MouseOverPoints> = new E();

  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;

  ctx: CanvasRenderingContext2D;
  dpr: number = window.devicePixelRatio;
  quadtree: Quadtree<QuadtreePoint>;
  visiblePointsById: StringTMap<LinePoint> = {};

  async ngOnChanges(changes: SimpleChanges) {
    let shouldDraw = false;

    if (
      changes.drawHeight ||
      changes.drawWidth ||
      changes.points ||
      changes.viewTimeRange ||
      changes.xScaleView ||
      changes.yAxes
    ) {
      shouldDraw = true;
    }

    if (changes.mousemove) {
      this.onMousemove(this.mousemove);
    }

    if (changes.mouseout) {
      this.onMouseout(this.mouseout);
    }

    if (shouldDraw) {
      await this.draw();
    }
  }

  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

  curve() {
    switch (this.curveType) {
      case 'curveLinear':
        return curveLinear;
      case 'curveNatural':
        return curveNatural;
      case 'curveStep':
        return curveStep;
      case 'curveStepAfter':
        return curveStepAfter;
      case 'curveStepBefore':
        return curveStepBefore;
      default:
        return curveStepBefore;
    }
  }

  async draw() {
    if (this.ctx) {
      await tick();
      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.clearRect(0, 0, this.drawWidth, this.drawHeight);

      const yAxes = this.yAxes || [];
      const [yAxis] = yAxes.filter(axis => this.yAxisId === axis.id);
      const domain = yAxis?.scaleDomain || [];
      const yScale = getYScale(domain, this.drawHeight);
      const points = this.points || [];

      this.quadtree = quadtree<QuadtreePoint>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [this.drawWidth, this.drawHeight],
        ]);
      this.visiblePointsById = {};

      this.ctx.fillStyle = this.color || '#283593';
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = this.color || '#283593';

      const line = d3Line<LinePoint>()
        .x(d => Math.floor(this.xScaleView(d.x)))
        .y(d => Math.floor(yScale(d.y)))
        .curve(this.curve());
      this.ctx.beginPath();
      line.context(this.ctx)(points);
      this.ctx.stroke();
      this.ctx.closePath();

      for (let i = 0, l = points.length; i < l; ++i) {
        const point = points[i];
        const { id } = point;

        if (
          point.x >= this.viewTimeRange.start &&
          point.x <= this.viewTimeRange.end
        ) {
          const x = Math.floor(this.xScaleView(point.x));
          const y = Math.floor(yScale(point.y));
          this.quadtree.add({ id, x, y });
          this.visiblePointsById[id] = point;

          const circle = new Path2D();
          const radius = point.radius || 2.0;
          circle.arc(x, y, radius, 0, 2 * Math.PI);
          this.ctx.fill(circle);
        }
      }
    }
  }

  onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x, offsetY: y } = e;
      const points = searchQuadtreePoint<LinePoint>(
        this.quadtree,
        x,
        y,
        2.0, // TODO.
        this.visiblePointsById,
      );
      this.mouseOverPoints.emit({ e, points });
    }
  }

  onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      this.mouseOverPoints.emit({ e, points: [] });
    }
  }
}

@NgModule({
  declarations: [TimelineRowLayerLineComponent],
  exports: [TimelineRowLayerLineComponent],
  imports: [CommonModule],
})
export class TimelineRowLayerLineModule {}
