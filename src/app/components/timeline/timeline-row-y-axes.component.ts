import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgModule,
  OnChanges,
  ViewChild,
} from '@angular/core';
import { axisLeft as d3AxisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { getYScale } from '../../functions';
import { Axis } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-y-axes',
  styles: [
    `
      svg {
        height: 100%;
        position: absolute;
        width: 100%;
      }
    `,
  ],
  template: `
    <svg>
      <g #g [attr.transform]="'translate(' + marginLeft + ',' + -1 + ')'"></g>
    </svg>
  `,
})
export class TimelineRowYAxesComponent implements OnChanges {
  @Input() drawHeight: number;
  @Input() marginLeft: number;
  @Input() yAxes: Axis[] | undefined;

  @ViewChild('g', { static: true }) g: ElementRef<SVGGElement>;

  ngOnChanges() {
    this.draw();
  }

  draw() {
    const gSelection = select(this.g.nativeElement);

    let totalWidth = 0;
    const axisClass = 'y-axis';
    gSelection.selectAll(`.${axisClass}`).remove();

    const yAxes = this.yAxes || [];
    for (let i = 0; i < yAxes.length; ++i) {
      const axis = yAxes[i];

      const axisG = gSelection.append('g').attr('class', axisClass);
      axisG.selectAll('*').remove();
      const domain = axis?.scaleDomain || [];
      const scale = getYScale(domain, this.drawHeight);

      const color = axis?.color || 'black';
      const labelColor = axis?.label?.color || 'black';
      const labelFontFace = axis?.label?.fontFace || 'Helvetica Neue';
      const labelFontSize = axis?.label?.fontSize || 12;
      const labelText = axis?.label?.text || '';
      const tickCount = axis?.tickCount || 5;

      const axisLeft = d3AxisLeft(scale).ticks(tickCount).tickSizeOuter(0);
      const axisMargin = 20;
      const startPosition = -(totalWidth + axisMargin * i);
      axisG.attr('transform', `translate(${startPosition}, 0)`);
      axisG.style('color', color);
      if (domain.length) {
        axisG.call(axisLeft);
      }

      const axisGElement: SVGGElement = axisG.node();
      const axisWidth = axisGElement.getBoundingClientRect().width;
      const axisLabelMargin = 20;
      const y = -(axisWidth + axisLabelMargin);

      axisG
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', y)
        .attr('x', 0 - this.drawHeight / 2)
        .attr('dy', '1em')
        .attr('fill', labelColor)
        .attr('font-family', labelFontFace)
        .attr('font-size', `${labelFontSize}px`)
        .style('text-anchor', 'middle')
        .text(labelText);

      totalWidth += axisGElement.getBoundingClientRect().width;
    }
  }
}

@NgModule({
  declarations: [TimelineRowYAxesComponent],
  exports: [TimelineRowYAxesComponent],
  imports: [CommonModule],
})
export class TimelineRowYAxesModule {}
