import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { brushX, D3BrushEvent } from 'd3-brush';
import { ScaleTime } from 'd3-scale';
import { select, Selection } from 'd3-selection';
import { TimeRange } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'g[aerie-timeline-x-axis-brush]',
  template: `<svg:g #g />`,
})
export class TimelineXAxisBrushComponent implements OnChanges {
  @Input()
  brushOverlayColor = '#E8EAF6';

  @Input()
  brushSelectionColor = '#7986cb';

  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  handleColor = '#0D1667';

  @Input()
  handleWidth = 2;

  @Input()
  type: 'max' | 'view' = 'view';

  @Input()
  viewTimeRange: TimeRange = { end: 0, start: 0 };

  @Input()
  xScaleMax: ScaleTime<number, number>;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @Input()
  yOffset = 0;

  @Output()
  updateViewTimeRange: EventEmitter<TimeRange> = new EventEmitter();

  @ViewChild('g', { static: true })
  g: ElementRef<SVGGElement>;

  brush: Selection<SVGGElement, unknown, null, undefined>;

  ngOnChanges() {
    this.draw();
  }

  brushEnd(event: D3BrushEvent<number[]>): void {
    if (!event.sourceEvent) {
      return;
    }
    if (!event.selection) {
      return;
    }

    let scale = this.xScaleView;
    if (this.type === 'max') {
      scale = this.xScaleMax;
    }

    const selection = event.selection as number[];
    const [start, end] = selection.map(scale.invert);

    this.updateViewTimeRange.emit({
      end: end.getTime(),
      start: start.getTime(),
    });
  }

  disableBrushOverlayMouseEvents(
    g: Selection<SVGGElement, unknown, null, undefined>,
  ) {
    g.select('.overlay')
      .datum({ type: 'selection' })
      .on('mousedown touchstart', () => {});
  }

  draw() {
    const xBrush = brushX()
      .extent([
        [0, this.yOffset],
        [this.drawWidth, this.drawHeight],
      ])
      .on('start', (event: D3BrushEvent<number[]>) => {
        this.styleBrush(event);
      })
      .on('brush', (event: D3BrushEvent<number[]>) => {
        this.styleBrush(event);
      })
      .on('end', (event: D3BrushEvent<number[]>) => {
        this.styleBrush(event);
        this.brushEnd(event);
      });

    this.brush = select(this.g.nativeElement).call(xBrush);

    if (this.type === 'max') {
      const extent = [
        new Date(this.viewTimeRange.start),
        new Date(this.viewTimeRange.end),
      ].map(this.xScaleMax);
      this.brush
        .call(xBrush.move, extent)
        .call(this.disableBrushOverlayMouseEvents);
    } else {
      this.brush.call(xBrush.move, null);
    }
  }

  styleBrush(event: D3BrushEvent<number[]>) {
    if (this.type === 'max') {
      const selection = event.selection as number[];
      this.brush.select('.overlay').attr('fill', this.brushOverlayColor);
      this.brush.select('.selection').attr('fill', this.brushSelectionColor);
      this.brush
        .selectAll('.handle--custom')
        .data([{ type: 'w' }, { type: 'e' }])
        .join(enter =>
          enter
            .append('rect')
            .attr('class', 'handle--custom')
            .attr('fill', this.handleColor)
            .attr('width', this.handleWidth)
            .attr('height', this.drawHeight - this.yOffset)
            .attr('y', this.yOffset)
            .attr('cursor', 'ew-resize'),
        )
        .attr(
          'transform',
          selection === null
            ? null
            : ({ type }, i) => {
                if (type === 'w') {
                  return `translate(${selection[i]}, 0)`;
                } else {
                  return `translate(${selection[i] - this.handleWidth}, 0)`;
                }
              },
        );
    }
  }
}

@NgModule({
  declarations: [TimelineXAxisBrushComponent],
  exports: [TimelineXAxisBrushComponent],
  imports: [CommonModule],
})
export class TimelineXAxisBrushModule {}
