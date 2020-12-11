import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import type { D3BrushEvent } from 'd3-brush';
import { brushX } from 'd3-brush';
import type { ScaleTime } from 'd3-scale';
import { scaleTime } from 'd3-scale';
import type { Selection } from 'd3-selection';
import { select } from 'd3-selection';
import {
  getTimeFromSvgMousePosition,
  hideTooltip,
  showTooltip,
} from '../../functions';
import { TimeRange } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-time-axis-global',
  styleUrls: ['./time-axis-global.component.css'],
  templateUrl: `./time-axis-global.component.html`,
})
export class TimeAxisGlobalComponent implements AfterViewInit, OnChanges {
  @Input()
  height = 20;

  @Input()
  marginLeft = 70;

  @Input()
  marginRight = 70;

  @Input()
  marginTop = 10;

  @Input()
  maxTimeRange: TimeRange = { end: 0, start: 0 };

  @Input()
  viewTimeRange: TimeRange = { end: 0, start: 0 };

  @Output()
  updateViewTimeRange: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  @ViewChild('brush', { static: true })
  brush: ElementRef<SVGGElement>;

  public drawHeight: number = this.height;
  public drawWidth: number;
  public gBrush: Selection<SVGGElement, unknown, null, undefined>;
  public marginBottom = 0;

  constructor(private elRef: ElementRef) {
    this.elRef.nativeElement.style.setProperty('--height', `${this.height}px`);
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.resize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    let shouldRedraw = false;
    this.setDrawBounds();

    if (changes.maxTimeRange && !changes.maxTimeRange.isFirstChange()) {
      shouldRedraw = true;
    }

    if (changes.viewTimeRange && !changes.viewTimeRange.isFirstChange()) {
      shouldRedraw = true;
    }

    if (shouldRedraw) {
      this.redraw();
    }
  }

  ngAfterViewInit(): void {
    select(this.brush.nativeElement).on('mousemove', (event: MouseEvent) => {
      this.showTooltip(event);
    });

    select(this.brush.nativeElement).on('mouseleave', () => {
      hideTooltip();
    });

    this.redraw();
  }

  drawBrush(): void {
    const xBrush = brushX()
      .extent([
        [0, 0],
        [this.drawWidth, this.drawHeight],
      ])
      .on('start', (event: D3BrushEvent<number[]>) => {
        const selection = event.selection as number[];
        this.setBrushStyles(selection);
        this.showTooltip(event.sourceEvent);
      })
      .on('brush', (event: D3BrushEvent<number[]>) => {
        const selection = event.selection as number[];
        this.setBrushStyles(selection);
        this.showTooltip(event.sourceEvent);
      })
      .on('end', (event: D3BrushEvent<number[]>) => {
        const selection = event.selection as number[];
        this.setBrushStyles(selection);
        this.brushEnd(event);
        hideTooltip();
      });

    const xScale = this.getXScale();
    const extent = [
      new Date(this.viewTimeRange.start),
      new Date(this.viewTimeRange.end),
    ].map(xScale);

    this.gBrush = select(this.brush.nativeElement).call(xBrush);
    this.gBrush.call(xBrush.move, extent).call(g =>
      g
        .select('.overlay')
        .datum({ type: 'selection' })
        // Disables click on overlay.
        .on('mousedown touchstart', () => {}),
    );
  }

  getDomain(): Date[] {
    return [new Date(this.maxTimeRange.start), new Date(this.maxTimeRange.end)];
  }

  getXScale(): ScaleTime<number, number> {
    return scaleTime().domain(this.getDomain()).rangeRound([0, this.drawWidth]);
  }

  resize(): void {
    this.redraw();
  }

  redraw(): void {
    this.setDrawBounds();
    this.drawBrush();
  }

  setBrushStyles(selection: number[] | null): void {
    this.gBrush.select('.overlay').attr('fill', '#E8EAF6');
    this.gBrush.select('.selection').attr('fill', '#7986cb');
    const handleWidth = 6;
    this.gBrush
      .selectAll('.handle--custom')
      .data([{ type: 'w' }, { type: 'e' }])
      .join(enter =>
        enter
          .append('rect')
          .attr('class', 'handle--custom')
          .attr('fill', '#0D1667')
          .attr('width', handleWidth)
          .attr('height', 9)
          .attr('y', 0.5)
          .attr('cursor', 'ew-resize'),
      )
      .attr('display', selection === null ? 'none' : null)
      .attr(
        'transform',
        selection === null
          ? null
          : ({ type }, i) => {
              if (type === 'w') {
                return `translate(${selection[i]}, 0)`;
              } else {
                return `translate(${selection[i] - handleWidth}, 0)`;
              }
            },
      );
  }

  setDrawBounds(): void {
    this.drawHeight = this.height - this.marginTop - this.marginBottom;
    this.drawWidth =
      this.elRef.nativeElement.clientWidth - this.marginLeft - this.marginRight;
  }

  showTooltip(event: MouseEvent | null): void {
    if (event) {
      const xScale = this.getXScale();
      const { doyTimestamp } = getTimeFromSvgMousePosition(
        this.brush.nativeElement,
        event,
        xScale,
      );
      showTooltip(event, doyTimestamp, this.drawWidth); // Not recursive!
    }
  }

  brushEnd(event: D3BrushEvent<number[]>): void {
    if (!event.sourceEvent) {
      return;
    }
    if (!event.selection) {
      return;
    }

    const x = this.getXScale();
    const selection = event.selection as number[];
    const [start, end] = selection.map(x.invert);

    this.updateViewTimeRange.emit({
      end: end.getTime(),
      start: start.getTime(),
    });
  }
}

@NgModule({
  declarations: [TimeAxisGlobalComponent],
  exports: [TimeAxisGlobalComponent],
})
export class TimeAxisGlobalModule {}
