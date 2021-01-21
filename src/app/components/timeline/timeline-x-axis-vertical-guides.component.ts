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
import { Selection, TimeRange, VerticalGuide } from '../../types';

type VerticalGuideSelection = {
  group: Selection<SVGGElement>;
  label: Selection<SVGTextElement>;
};

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
  viewTimeRange: TimeRange | undefined;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @Output()
  collapsedVerticalGuides: EventEmitter<VerticalGuide[]> = new EventEmitter<
    VerticalGuide[]
  >();

  @ViewChild('g', { static: true })
  g: ElementRef<SVGGElement>;

  ngOnChanges() {
    if (this.viewTimeRange) {
      this.draw();
    }
  }

  /**
   * Calculate the overlap between two SVG element selections.
   * Element a is assumed to be to the left of element b with
   * respect to the horizontal axis.
   */
  calcBounds(a: Selection<SVGElement>, b: Selection<SVGElement>) {
    if (a && b && !a.empty() && !b.empty()) {
      const { right, width } = a.node().getBoundingClientRect();
      const { left } = b.node().getBoundingClientRect();
      if (width > 0) {
        const overlap = right - left;
        const percentage = (overlap / width) * 100;
        return { overlap, percentage };
      } else {
        return null;
      }
    }
    return null;
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
    const collapsedVerticalGuides = [];
    const collapsedVerticalGuideSelections: VerticalGuideSelection[] = [];
    const sortedVerticalGuides = this.sort(verticalGuides);

    for (let i = 0, l = sortedVerticalGuides.length; i < l; ++i) {
      const guide = sortedVerticalGuides[i];
      const time = getUnixEpochTime(guide.timestamp);

      if (this.viewTimeRange.start <= time && time <= this.viewTimeRange.end) {
        const x = this.xScaleView(time);

        const group = g
          .append('g')
          .attr('class', verticalGuideClass)
          .attr('id', guide.id);

        group
          .append('circle')
          .attr('cx', x)
          .attr('cy', 0)
          .attr('r', circleRadius)
          .attr('fill', circleColor);

        group
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

        const label = group
          .append('text')
          .attr('fill', labelColor)
          .attr('font-family', labelFontFace)
          .attr('font-size', `${labelFontSize}px`)
          .attr('x', x + circleRadius + labelPadding)
          .attr('y', circleRadius / 2)
          .text(labelText);

        collapsedVerticalGuides.push(guide);
        collapsedVerticalGuideSelections.push({ group, label });
      }
    }

    this.collapsedVerticalGuides.emit(collapsedVerticalGuides);
    this.updateGuideLabelsWithEllipsis(collapsedVerticalGuideSelections);
  }

  /**
   * Sort vertical guides in time order ascending.
   */
  sort(verticalGuides: VerticalGuide[]): VerticalGuide[] {
    return [...verticalGuides].sort((a: VerticalGuide, b: VerticalGuide) => {
      const aTime = getUnixEpochTime(a.timestamp);
      const bTime = getUnixEpochTime(b.timestamp);
      if (aTime < bTime) {
        return -1;
      }
      if (aTime > bTime) {
        return 1;
      }
      return 0;
    });
  }

  /**
   * Calculate overlap with this guide's label and it's immediate right
   * neighbor. If there is overlap then add ellipsis to the label.
   * If we go past the overlap threshold, then we hide the label.
   */
  updateGuideLabelsWithEllipsis(
    verticalGuideSelections: VerticalGuideSelection[],
    ellipsisPadding: number = 15,
  ) {
    for (let i = 0; i < verticalGuideSelections.length; ++i) {
      const curr = verticalGuideSelections[i];
      const next = verticalGuideSelections[i + 1];

      if (next) {
        let bounds = this.calcBounds(curr.label, next.group);
        if (bounds && bounds.percentage > 0) {
          while (bounds && bounds.overlap + ellipsisPadding > 0) {
            curr.label.text(curr.label.text().slice(0, -1));
            bounds = this.calcBounds(curr.label, next.group);
          }
          const text = curr.label.text();
          if (text !== '') {
            curr.label.text(`${text}...`);
          }
        }
      }
    }
  }
}

@NgModule({
  declarations: [TimelineXAxisVerticalGuidesComponent],
  exports: [TimelineXAxisVerticalGuidesComponent],
  imports: [CommonModule],
})
export class TimelineXAxisVerticalGuidesModule {}
