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
import {
  forEachCanvas,
  getXScale,
  rgbColorGenerator,
} from '../../../functions';
import { PointXRange, TimeRange } from '../../../types';
import { SubBandService } from '../sub-band.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-x-range-band',
  styleUrls: ['./x-range-band.component.css'],
  templateUrl: `./x-range-band.component.html`,
})
export class XRangeBandComponent implements AfterViewInit, OnChanges {
  @Input()
  color: string | undefined;

  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  id: string;

  @Input()
  maxTimeRange: TimeRange = { end: 0, start: 0 };

  @Input()
  points: PointXRange[] | undefined;

  @Input()
  viewTimeRange: TimeRange = { end: 0, start: 0 };

  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;

  constructor(private subBandService: SubBandService) {}

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.resize();
  }

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
    const points = this.points || [];

    for (let i = 0, l = points.length; i < l; ++i) {
      const point = points[i];
      const x = Math.floor(xScale(point.x));
      const end = Math.floor(xScale(point.x + point.duration));
      const range = end - x;
      const width = Math.max(10.0, range);
      const rect = new Path2D();
      rect.rect(x, 0, width, this.drawHeight);

      forEachCanvas(canvases, (canvas, ctx) => {
        if (canvas.classList.contains('hidden')) {
          const color = hiddenCanvasColor.next().value;
          this.subBandService.updateColorToPoint(this.id, color, point);
          ctx.fillStyle = color;
        } else {
          ctx.fillStyle = this.color || point?.color || '#798aed';
        }

        // Rect.
        ctx.fill(rect);

        // Label Text.
        ctx.fillStyle = point.label?.color || '#000000';
        const fontSize = point.label?.fontSize || 12;
        const fontFace = point.label?.fontFace || 'Georgia';
        ctx.font = `${fontSize}px ${fontFace}`;
        const labelText = point.label?.text || '';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight =
          textMetrics.actualBoundingBoxAscent +
          textMetrics.actualBoundingBoxDescent;
        ctx.fillText(
          labelText,
          x + width / 2 - textWidth / 2,
          this.drawHeight / 2 + textHeight / 2,
          textWidth,
        );
      });
    }
  }
}

@NgModule({
  declarations: [XRangeBandComponent],
  exports: [XRangeBandComponent],
  imports: [CommonModule],
})
export class XRangeBandModule {}
