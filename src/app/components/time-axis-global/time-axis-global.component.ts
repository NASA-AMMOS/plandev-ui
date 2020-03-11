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
import * as d3 from 'd3';
import {
  getDoyTimestampFromSvgMousePosition,
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
  maxTimeRange: TimeRange = { start: 0, end: 0 };

  @Input()
  viewTimeRange: TimeRange = { start: 0, end: 0 };

  @Output()
  updateViewTimeRange: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  @ViewChild('brush', { static: true })
  brush: ElementRef<SVGGElement>;

  public drawHeight: number = this.height;
  public drawWidth: number;
  public gBrush: d3.Selection<SVGGElement, unknown, null, undefined>;
  public marginBottom = 0;

  constructor(private elRef: ElementRef) {
    this.elRef.nativeElement.style.setProperty('--height', `${this.height}px`);
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
    d3.select(this.brush.nativeElement).on('mousemove', () => {
      this.showTooltip(d3.event);
    });

    d3.select(this.brush.nativeElement).on('mouseleave', () => {
      hideTooltip();
    });

    this.redraw();
  }

  drawXBrush(): void {
    const xBrush = d3
      .brushX()
      .extent([
        [0, 0],
        [this.drawWidth, this.drawHeight],
      ])
      .on('start', () => {
        this.setBrushStyles(d3.event.selection);
        this.showTooltip(d3.event.sourceEvent);
      })
      .on('brush', () => {
        this.setBrushStyles(d3.event.selection);
        this.showTooltip(d3.event.sourceEvent);
      })
      .on('end', () => {
        this.setBrushStyles(d3.event.selection);
        this.xBrushEnd();
        hideTooltip();
      });

    const xScale = this.getXScale();
    const extent = [
      new Date(this.viewTimeRange.start),
      new Date(this.viewTimeRange.end),
    ].map(xScale);

    this.gBrush = d3.select(this.brush.nativeElement).call(xBrush);
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

  getXScale(): d3.ScaleTime<number, number> {
    return d3
      .scaleTime()
      .domain(this.getDomain())
      .rangeRound([0, this.drawWidth]);
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
    this.drawXBrush();
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
      const doyTimestamp = getDoyTimestampFromSvgMousePosition(
        this.brush.nativeElement,
        event,
        xScale,
      );
      showTooltip(event, doyTimestamp, this.drawWidth); // Not recursive!
    }
  }

  xBrushEnd(): void {
    if (!d3.event.sourceEvent) {
      return;
    }
    if (!d3.event.selection) {
      return;
    }

    const x = this.getXScale();
    const [start, end] = d3.event.selection.map(x.invert);

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
