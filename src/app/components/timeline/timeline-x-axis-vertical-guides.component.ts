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
import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { ScaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { VerticalGuide } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'g[aerie-timeline-x-axis-vertical-guides]',
  template: `<svg:g #g />`,
})
export class TimelineXAxisVerticalGuidesComponent implements OnChanges {
  @Input()
  drawHeight: number;

  @Input()
  drawWidth: number;

  @Input()
  verticalGuides: VerticalGuide[] | undefined;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @Output()
  collapsedVerticalGuides: EventEmitter<VerticalGuide[]> = new EventEmitter<
    VerticalGuide[]
  >();

  @ViewChild('g', { static: true })
  g: ElementRef<SVGGElement>;

  ngOnChanges() {
    this.draw();
  }

  draw() {
    const { nativeElement } = this.g;
    const g = select(nativeElement);
    const verticalGuideClass = 'vertical-guide';
    g.selectAll(`.${verticalGuideClass}`).remove();

    const circleColor = '#283593';
    const circleRadius = 7;
    const labelPadding = 3;

    const verticalGuides = this.verticalGuides || [];
    for (let i = 0, l = verticalGuides.length; i < l; ++i) {
      const guide = verticalGuides[i];
      const x = this.xScaleView(getUnixEpochTime(guide.timestamp));

      const guideGroup = g
        .append('g')
        .attr('class', verticalGuideClass)
        .attr('id', guide.id);

      guideGroup
        .append('circle')
        .attr('cx', x)
        .attr('cy', 0)
        .attr('r', circleRadius)
        .attr('fill', circleColor);

      guideGroup
        .append('line')
        .attr('x1', x)
        .attr('y1', circleRadius)
        .attr('x2', x)
        .attr('y2', this.drawHeight)
        .attr('stroke', 'gray')
        .attr('stroke-dasharray', 2);

      const labelColor = guide?.label?.color || 'black';
      const labelFontFace = guide?.label?.fontFace || 'Helvetica Neue';
      const labelFontSize = guide?.label?.fontSize || 12;
      const labelText = guide?.label?.text || '';

      guideGroup
        .append('text')
        .attr('fill', labelColor)
        .attr('font-family', labelFontFace)
        .attr('font-size', `${labelFontSize}px`)
        .attr('x', x + circleRadius + labelPadding)
        .attr('y', circleRadius / 2)
        .text(labelText);
    }

    this.collapsedVerticalGuides.emit(verticalGuides);
  }
}

@NgModule({
  declarations: [TimelineXAxisVerticalGuidesComponent],
  exports: [TimelineXAxisVerticalGuidesComponent],
  imports: [CommonModule],
})
export class TimelineXAxisVerticalGuidesModule {}
