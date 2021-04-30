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
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import { Quadtree, quadtree } from 'd3-quadtree';
import { ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { searchQuadtreeRect, tick } from '../../functions';
import {
  ActivityPoint,
  CreatePoint,
  MouseOverPoints,
  MouseSelectPoints,
  QuadtreeRect,
  SavePoint,
  StringTMap,
  TimeRange,
  UpdatePoint,
  UpdateRow,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-layer-activity',
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
export class TimelineRowLayerActivityComponent
  implements AfterViewInit, OnChanges {
  @Input() activityDefaultColor = '#283593';
  @Input() activityHeight = 20;
  @Input() activityRowPadding = 20;
  @Input() activitySelectedColor = '#81D4FA';
  @Input() dragenter: DragEvent;
  @Input() dragleave: DragEvent;
  @Input() dragover: DragEvent;
  @Input() drop: DragEvent;
  @Input() drawHeight: number;
  @Input() drawWidth: number;
  @Input() id: string;
  @Input() mousedown: MouseEvent;
  @Input() mousemove: MouseEvent;
  @Input() mouseout: MouseEvent;
  @Input() mouseup: MouseEvent;
  @Input() overlay: SVGElement;
  @Input() points: ActivityPoint[] | undefined;
  @Input() rowId: string;
  @Input() showChildren = true;
  @Input() viewTimeRange: TimeRange;
  @Input() xScaleView: ScaleTime<number, number>;

  @Output() createPoint: E<CreatePoint> = new E();
  @Output() mouseOverPoints: E<MouseOverPoints> = new E();
  @Output() mouseSelectPoints: E<MouseSelectPoints> = new E();
  @Output() savePoint: E<SavePoint> = new E();
  @Output() updatePoint: E<UpdatePoint> = new E();
  @Output() updateRow: E<UpdateRow> = new E();

  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;

  ctx: CanvasRenderingContext2D;
  dpr: number = window.devicePixelRatio;
  dragOffsetX: number | null = null;
  dragPoint: ActivityPoint | null = null;
  maxActivityWidth: number;
  quadtree: Quadtree<QuadtreeRect>;
  rowHeight: number = this.activityHeight + this.activityRowPadding;
  visiblePointsById: StringTMap<ActivityPoint> = {};

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

    if (changes.dragenter) {
      this.onDragenter(this.dragenter);
    }

    if (changes.dragleave) {
      this.onDragleave(this.dragleave);
    }

    if (changes.dragover) {
      this.onDragover(this.dragover);
    }

    if (changes.drop) {
      this.onDrop(this.drop);
    }

    if (changes.mousedown) {
      this.onMousedown(this.mousedown);
    }

    if (changes.mousemove) {
      this.onMousemove(this.mousemove);
    }

    if (changes.mouseout) {
      this.onMouseout(this.mouseout);
    }

    if (changes.mouseup) {
      this.onMouseup(this.mouseup);
    }

    if (changes.activityHeight || changes.activityRowPadding) {
      this.rowHeight = this.activityHeight + this.activityRowPadding;
    }

    if (shouldDraw) {
      await this.draw();
    }
  }

  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

  /**
   * @note We only allow dragging parent activities.
   */
  dragActivityStart(points: ActivityPoint[], offsetX: number) {
    if (points.length) {
      const [point] = points;
      if (point.parent === null) {
        this.dragOffsetX = offsetX - this.xScaleView(point.x);
        this.dragPoint = point;
      }
    }
  }

  dragActivity(offsetX: number) {
    if (this.dragOffsetX && this.dragPoint) {
      const x = offsetX - this.dragOffsetX;
      const unixEpochTime = this.xScaleView.invert(x).getTime();
      const startTimestamp = getDoyTimestamp(unixEpochTime);
      if (unixEpochTime !== this.dragPoint.x) {
        this.updatePoint.emit({
          id: this.dragPoint.id,
          type: 'activity',
          value: { startTimestamp },
        });
      }
    }
  }

  dragActivityEnd(offsetX: number) {
    if (this.dragOffsetX && this.dragPoint) {
      const x = offsetX - this.dragOffsetX;
      const unixEpochTime = this.xScaleView.invert(x).getTime();
      const startTimestamp = getDoyTimestamp(unixEpochTime);
      if (unixEpochTime !== this.dragPoint.x) {
        this.savePoint.emit({
          id: this.dragPoint.id,
          type: 'activity',
          value: { startTimestamp },
        });
      }
      this.dragOffsetX = null;
      this.dragPoint = null;
    }
  }

  onDragenter(e: DragEvent | undefined) {
    if (e) {
      const { offsetX } = e;
      select(this.overlay)
        .append('line')
        .attr('class', 'activity-drag-guide')
        .attr('x1', offsetX)
        .attr('y1', 0)
        .attr('x2', offsetX)
        .attr('y2', this.drawHeight)
        .attr('stroke', 'black')
        .style('pointer-events', 'none');
    }
  }

  onDragleave(e: DragEvent | undefined) {
    if (e) {
      select(this.overlay).select('.activity-drag-guide').remove();
    }
  }

  onDragover(e: DragEvent | undefined) {
    if (e) {
      const { offsetX } = e;
      select(this.overlay)
        .select('.activity-drag-guide')
        .attr('x1', offsetX)
        .attr('x2', offsetX);
    }
  }

  onDrop(e: DragEvent | undefined) {
    if (e) {
      const { offsetX } = e;
      select(this.overlay).select('.activity-drag-guide').remove();
      const unixEpochTime = this.xScaleView.invert(offsetX).getTime();
      const startTimestamp = getDoyTimestamp(unixEpochTime);
      const activityType = JSON.parse(e.dataTransfer.getData('activityType'));
      this.createPoint.emit({ activityType, startTimestamp, type: 'activity' });
    }
  }

  onMousedown(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      const { points, pointsById } = searchQuadtreeRect<ActivityPoint>(
        this.quadtree,
        offsetX,
        offsetY,
        this.activityHeight,
        this.maxActivityWidth,
        this.visiblePointsById,
      );
      this.mouseSelectPoints.emit({ e, points, pointsById });
      this.dragActivityStart(points, offsetX);
    }
  }

  onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      const { points, pointsById } = searchQuadtreeRect<ActivityPoint>(
        this.quadtree,
        offsetX,
        offsetY,
        this.activityHeight,
        this.maxActivityWidth,
        this.visiblePointsById,
      );
      this.mouseOverPoints.emit({ e, points, pointsById });
      this.dragActivity(offsetX);
    }
  }

  onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      this.mouseOverPoints.emit({ e, points: [], pointsById: {} });
    }
  }

  onMouseup(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      this.dragActivityEnd(offsetX);
    }
  }

  async draw() {
    if (this.ctx && this.xScaleView) {
      await tick();
      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.clearRect(0, 0, this.drawWidth, this.drawHeight);

      this.quadtree = quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [this.drawWidth, this.drawHeight],
        ]);
      this.visiblePointsById = {};

      this.maxActivityWidth = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;
      const coords = [];

      for (const point of this.points) {
        if (
          point.x + point.duration >= this.viewTimeRange.start &&
          point.x <= this.viewTimeRange.end
        ) {
          let largestXEnd = Number.MIN_SAFE_INTEGER;
          let largestY = Number.MIN_SAFE_INTEGER;
          const x = Math.floor(this.xScaleView(point.x));
          const end = Math.floor(this.xScaleView(point.x + point.duration));
          const { textWidth } = this.setLabelContext(point);
          const xEnd = end + textWidth;
          let y = this.rowHeight;

          for (const coord of coords) {
            if (x <= coord.xEnd) {
              y = coord.y + this.rowHeight;
            }
          }

          this.drawActivityBar(point, x, y, end);

          if (xEnd > largestXEnd) {
            largestXEnd = xEnd;
          }
          if (y > largestY) {
            largestY = y;
          }

          const childCoords = this.drawChildren(point, y);

          if (childCoords) {
            if (childCoords.xEnd > largestXEnd) {
              largestXEnd = childCoords.xEnd;
            }
            if (childCoords.y > largestY) {
              largestY = childCoords.y;
            }
          }

          coords.push({ xEnd: largestXEnd, y: largestY });

          if (largestY > maxY) {
            maxY = largestY;
          }
        }
      }

      const newHeight = maxY + this.rowHeight;
      if (newHeight > 0 && this.drawHeight !== newHeight) {
        this.updateRow.emit({
          rowId: this.rowId,
          update: { height: newHeight },
        });
      }
    }
  }

  drawActivityBar(point: ActivityPoint, x: number, y: number, end: number) {
    const { id } = point;
    const activityWidth = Math.max(5.0, end - x);
    const rect = new Path2D();
    rect.rect(x, y, activityWidth, this.activityHeight);

    this.quadtree.add({
      height: this.activityHeight,
      id,
      width: activityWidth,
      x,
      y,
    });
    this.visiblePointsById[id] = point;

    if (activityWidth > this.maxActivityWidth) {
      this.maxActivityWidth = activityWidth;
    }

    const selected = point?.selected || false;
    if (selected) {
      this.ctx.fillStyle = this.activitySelectedColor;
    } else {
      this.ctx.fillStyle = point?.color || this.activityDefaultColor;
    }

    this.ctx.fill(rect);
    const hideLabel = point.label?.hidden || false;
    if (!hideLabel) {
      const { labelText, textMetrics } = this.setLabelContext(point);
      this.ctx.fillText(labelText, x, y, textMetrics.width);
    }
  }

  drawChildren(parent: ActivityPoint, parentY: number) {
    if (this.showChildren && parent?.children?.length) {
      let largestXEnd = Number.MIN_SAFE_INTEGER;
      let largestY = Number.MIN_SAFE_INTEGER;
      let y = parentY;

      for (const point of parent.children) {
        const x = Math.floor(this.xScaleView(point.x));
        const end = Math.floor(this.xScaleView(point.x + point.duration));
        const { textWidth } = this.setLabelContext(point);
        const xEnd = end + textWidth;
        y = y + this.rowHeight;

        this.drawActivityBar(point, x, y, end);

        if (xEnd > largestXEnd) {
          largestXEnd = xEnd;
        }
        if (y > largestY) {
          largestY = y;
        }

        const childCoords = this.drawChildren(point, y);

        if (childCoords) {
          if (childCoords.xEnd > largestXEnd) {
            largestXEnd = childCoords.xEnd;
          }
          if (childCoords.y > largestY) {
            largestY = childCoords.y;
          }
        }
      }

      return { xEnd: largestXEnd, y: largestY };
    }

    return null;
  }

  setLabelContext(point: ActivityPoint) {
    const fontSize = point.label?.fontSize || 12;
    const fontFace = point.label?.fontFace || 'Helvetica Neue';
    this.ctx.fillStyle = point.label?.color || '#000000';
    this.ctx.font = `${fontSize}px ${fontFace}`;
    this.ctx.textAlign = point.label?.align || 'start';
    this.ctx.textBaseline = point.label?.baseline || 'alphabetic';
    const labelText = point.label?.text || '';
    const textMetrics = this.ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const textHeight =
      textMetrics.actualBoundingBoxAscent +
      textMetrics.actualBoundingBoxDescent;
    return { labelText, textHeight, textMetrics, textWidth };
  }
}

@NgModule({
  declarations: [TimelineRowLayerActivityComponent],
  exports: [TimelineRowLayerActivityComponent],
  imports: [CommonModule],
})
export class TimelineRowLayerActivityModule {}
