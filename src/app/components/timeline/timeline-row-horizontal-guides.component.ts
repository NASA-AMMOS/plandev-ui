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
import { select } from 'd3-selection';
import { getYScale } from '../../functions';
import { Axis, HorizontalGuide } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'g[aerie-timeline-row-horizontal-guides]',
  template: `<svg:g #g />`,
})
export class TimelineRowHorizontalGuidesComponent implements OnChanges {
  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  horizontalGuides: HorizontalGuide[] | undefined;

  @Input()
  showGuideLabels = true;

  @Input()
  yAxes: Axis[];

  @ViewChild('g', { static: true })
  g: ElementRef<SVGGElement>;

  ngOnChanges() {
    this.draw();
  }

  draw() {
    const { nativeElement } = this.g;
    const g = select(nativeElement);
    const horizontalGuideClass = 'horizontal-guide';
    g.selectAll(`.${horizontalGuideClass}`).remove();

    const labelYOffset = 15;
    const horizontalGuides = this.horizontalGuides || [];

    for (const guide of horizontalGuides) {
      const yAxis = this.yAxes.find(axis => axis.id === guide.yAxisId);
      const domain = yAxis?.scaleDomain;

      if (domain && domain.length) {
        const yScale = getYScale(domain, this.drawHeight);
        const y = yScale(guide.y);

        const lineGroup = g.append('g').attr('class', horizontalGuideClass);

        const color = '#adadad';
        const width = 1.0;
        lineGroup
          .append('line')
          .attr('class', `${horizontalGuideClass}-line`)
          .attr('id', guide.id)
          .attr('x1', 0)
          .attr('y1', y)
          .attr('x2', this.drawWidth)
          .attr('y2', y)
          .attr('stroke', color)
          .attr('stroke-width', width);

        const labelVisibility = this.showGuideLabels ? 'visible' : 'hidden';
        const labelColor = guide?.label?.color || color;
        const labelFontFace = guide?.label?.fontFace || 'Helvetica Neue';
        const labelFontSize = guide?.label?.fontSize || 12;
        const labelText = guide?.label?.text || '';
        lineGroup
          .append('text')
          .style('visibility', labelVisibility)
          .attr('class', `${horizontalGuideClass}-text`)
          .attr('x', 5)
          .attr('y', y + labelYOffset)
          .attr('fill', labelColor)
          .attr('font-family', labelFontFace)
          .attr('font-size', `${labelFontSize}px`)
          .text(labelText);
      }
    }
  }
}

@NgModule({
  declarations: [TimelineRowHorizontalGuidesComponent],
  exports: [TimelineRowHorizontalGuidesComponent],
  imports: [CommonModule],
})
export class TimelineRowHorizontalGuidesModule {}
