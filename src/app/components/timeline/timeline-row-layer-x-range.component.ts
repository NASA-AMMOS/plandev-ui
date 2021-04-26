import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { quadtree, Quadtree } from 'd3-quadtree';
import { scaleOrdinal, ScaleTime } from 'd3-scale';
import {
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
} from 'd3-scale-chromatic';
import { searchQuadtreeRect, tick } from '../../functions';
import {
  MouseOverPoints,
  QuadtreeRect,
  StringTMap,
  TimeRange,
  XRangeLayerColorScheme,
  XRangePoint,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-layer-x-range',
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
export class TimelineRowLayerXRangeComponent
  implements AfterViewInit, OnChanges {
  @Input() colorScheme: XRangeLayerColorScheme | undefined;
  @Input() domain: string[] | undefined;
  @Input() drawHeight: number;
  @Input() drawWidth: number;
  @Input() id: string;
  @Input() maxTimeRange: TimeRange = { end: 0, start: 0 };
  @Input() mousemove: MouseEvent;
  @Input() mouseout: MouseEvent;
  @Input() opacity: number | undefined;
  @Input() points: XRangePoint[] | undefined;
  @Input() viewTimeRange: TimeRange = { end: 0, start: 0 };
  @Input() xScaleView: ScaleTime<number, number>;

  @Output() mouseOverPoints: EventEmitter<MouseOverPoints> = new EventEmitter();

  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;

  ctx: CanvasRenderingContext2D;
  dpr: number = window.devicePixelRatio;
  maxXWidth: number;
  quadtree: Quadtree<QuadtreeRect>;
  visiblePointsById: StringTMap<XRangePoint> = {};

  async ngOnChanges(changes: SimpleChanges) {
    let shouldDraw = false;

    if (
      changes.drawHeight ||
      changes.drawWidth ||
      changes.points ||
      changes.viewTimeRange ||
      changes.xScaleView
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

  clamp(x: number): number {
    return Math.min(Math.max(x, 0), this.drawWidth);
  }

  colorScale() {
    const domain = this.domain || [];

    if (this.colorSchemeIsArray()) {
      return scaleOrdinal(this.colorScheme).domain(domain);
    }

    switch (this.colorScheme) {
      case 'schemeAccent':
        return scaleOrdinal(schemeAccent).domain(domain);
      case 'schemeCategory10':
        return scaleOrdinal(schemeCategory10).domain(domain);
      case 'schemeDark2':
        return scaleOrdinal(schemeDark2).domain(domain);
      case 'schemePaired':
        return scaleOrdinal(schemePaired).domain(domain);
      case 'schemePastel1':
        return scaleOrdinal(schemePastel1).domain(domain);
      case 'schemePastel2':
        return scaleOrdinal(schemePastel2).domain(domain);
      case 'schemeSet1':
        return scaleOrdinal(schemeSet1).domain(domain);
      case 'schemeSet2':
        return scaleOrdinal(schemeSet2).domain(domain);
      case 'schemeSet3':
        return scaleOrdinal(schemeSet3).domain(domain);
      case 'schemeTableau10':
        return scaleOrdinal(schemeTableau10).domain(domain);
      default:
        return scaleOrdinal(schemeTableau10).domain(domain);
    }
  }

  colorSchemeIsArray() {
    if (Array.isArray(this.colorScheme)) {
      return this.colorScheme.every(i => typeof i === 'string');
    }
    return false;
  }

  async draw() {
    if (this.ctx) {
      await tick();
      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.clearRect(0, 0, this.drawWidth, this.drawHeight);
      this.ctx.globalAlpha = this.opacity || 1.0;

      this.quadtree = quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [this.drawWidth, this.drawHeight],
        ]);
      this.visiblePointsById = {};

      this.maxXWidth = Number.MIN_SAFE_INTEGER;
      const colorScale = this.colorScale();

      for (let i = 0; i < this.points.length; ++i) {
        const point = this.points[i];

        // Scan to the next point with a different label than the current point.
        let j = i + 1;
        let nextPoint = this.points[j];
        while (nextPoint && nextPoint.label.text === point.label.text) {
          j = j + 1;
          nextPoint = this.points[j];
        }
        i = j - 1; // Minus since the loop auto increments i at the end of the block.

        const xStart = this.clamp(Math.floor(this.xScaleView(point.x)));
        const xEnd = nextPoint
          ? this.clamp(Math.floor(this.xScaleView(nextPoint.x)))
          : this.drawWidth;
        const xWidth = xEnd - xStart;
        const y = 0;

        if (xWidth > 0) {
          const { id } = point;
          this.visiblePointsById[id] = point;

          const labelText = this.getLabelText(point);
          this.ctx.fillStyle = colorScale(labelText);
          const rect = new Path2D();
          rect.rect(xStart, y, xWidth, this.drawHeight);
          this.ctx.fill(rect);

          this.quadtree.add({
            height: this.drawHeight,
            id,
            width: xWidth,
            x: xStart,
            y,
          });

          if (xWidth > this.maxXWidth) {
            this.maxXWidth = xWidth;
          }

          const { textHeight, textWidth } = this.setLabelContext(point);
          if (textWidth < xWidth) {
            this.ctx.fillText(
              labelText,
              xStart + xWidth / 2 - textWidth / 2,
              this.drawHeight / 2 + textHeight / 2,
              textWidth,
            );
          } else {
            const extraLabelPadding = 10;
            let newLabelText = labelText;
            let newTextWidth = textWidth;

            // Remove characters from label until it is small enough to fit in x-range point.
            while (
              newTextWidth > 0 &&
              newTextWidth > xWidth - extraLabelPadding
            ) {
              newLabelText = newLabelText.slice(0, -1);
              const textMeasurement = this.measureText(newLabelText);
              newTextWidth = textMeasurement.textWidth;
            }

            this.ctx.fillText(
              `${newLabelText}...`,
              xStart + xWidth / 2 - newTextWidth / 2,
              this.drawHeight / 2 + textHeight / 2,
              newTextWidth,
            );
          }
        }
      }
    }
  }

  getLabelText(point: XRangePoint) {
    return point.label?.text || '';
  }

  measureText(text: string) {
    const textMetrics = this.ctx.measureText(text);
    const textHeight =
      textMetrics.actualBoundingBoxAscent +
      textMetrics.actualBoundingBoxDescent;
    const textWidth = textMetrics.width;
    return { textHeight, textWidth };
  }

  onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x, offsetY: y } = e;
      const { points, pointsById } = searchQuadtreeRect<XRangePoint>(
        this.quadtree,
        x,
        y,
        this.drawHeight,
        this.maxXWidth,
        this.visiblePointsById,
      );
      this.mouseOverPoints.emit({ e, points, pointsById });
    }
  }

  onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      this.mouseOverPoints.emit({ e, points: [] });
    }
  }

  setLabelContext(
    point: XRangePoint,
  ): { labelText: string; textHeight: number; textWidth: number } {
    const fontSize = point.label?.fontSize || 10;
    const fontFace = point.label?.fontFace || 'Helvetica Neue';
    this.ctx.fillStyle = point.label?.color || '#000000';
    this.ctx.font = `${fontSize}px ${fontFace}`;
    const labelText = this.getLabelText(point);
    const { textHeight, textWidth } = this.measureText(labelText);
    return { labelText, textHeight, textWidth };
  }
}

@NgModule({
  declarations: [TimelineRowLayerXRangeComponent],
  exports: [TimelineRowLayerXRangeComponent],
  imports: [CommonModule],
})
export class TimelineRowLayerXRangeModule {}
