import * as d3 from 'd3';
import { hideTooltip, showTooltip } from '../functions';
import { Guide, Selection } from '../types';

export class SvgVerticalGuideOptions {
  circleColor: string;
  circleGroupOffset: number;
  circleGroupRadius: number;
  circleRadius: number;
  containerHeight: number;
  containerWidth: number;
  ellipsisPadding: number;
  labelPadding: number;
}

/**
 * Calculate the overlap between two SVG element selections.
 * Element a is assumed to be to the left of element b with
 * respect to the horizontal axis.
 */
export function calcBounds(a: Selection<SVGElement>, b: Selection<SVGElement>) {
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

export class SvgVerticalGuide {
  public circle: Selection<SVGCircleElement>;
  public circleGroup: Selection<SVGGElement>;
  public circleGroup0: Selection<SVGCircleElement>;
  public circleGroup1: Selection<SVGCircleElement>;
  public circleGroup2: Selection<SVGCircleElement>;
  public collapsedCount: number;
  public container: Selection<SVGGElement>;
  public group: Selection<SVGGElement>;
  public guide: Guide;
  public id: string;
  public label: Selection<SVGTextElement>;
  public line: Selection<SVGLineElement>;
  public options: SvgVerticalGuideOptions;
  public tooltipText: string;

  constructor(
    container: SVGGElement,
    containerHeight: number,
    containerWidth: number,
    guide: Guide,
  ) {
    this.collapsedCount = 1;
    this.container = d3.select(container);
    this.group = this.container.select<SVGGElement>(`#${guide.id}`);
    this.guide = guide;
    this.id = guide.id;
    this.options = {
      circleColor: '#283593',
      circleGroupOffset: 2.3,
      circleGroupRadius: 2.0,
      circleRadius: 7,
      containerHeight,
      containerWidth,
      ellipsisPadding: 15,
      labelPadding: 3,
    };
    this.tooltipText = `${guide.label.text} (${guide.timestamp})`;
  }

  /**
   * Append guide group to the container group.
   */
  draw(visible = true) {
    const { id, label, x } = this.guide;
    const {
      circleColor,
      circleGroupOffset,
      circleGroupRadius,
      circleRadius,
      containerHeight,
      labelPadding,
    } = this.options;

    this.group.remove();

    this.group = this.container
      .append('g')
      .attr('class', 'guide-group')
      .attr('id', id)
      .style('visibility', visible ? 'visible' : 'hidden');
    this.circle = this.group
      .append('circle')
      .attr('class', 'guide-circle')
      .attr('cx', x)
      .attr('cy', 0)
      .attr('r', circleRadius)
      .attr('fill', circleColor);
    this.circle
      .on('mousemove', () =>
        showTooltip(d3.event, this.tooltipText, this.options.containerWidth),
      )
      .on('mouseleave', () => {
        hideTooltip();
      });
    this.circleGroup = this.group
      .append('g')
      .attr('class', 'guide-circle-group')
      .style('display', 'none');
    this.circleGroup0 = this.circleGroup
      .append('circle')
      .attr('class', 'guide-circle-group-0')
      .attr('cx', x)
      .attr('cy', circleGroupOffset)
      .attr('r', circleGroupRadius)
      .attr('fill', '#ffffff');
    this.circleGroup1 = this.circleGroup
      .append('circle')
      .attr('class', 'guide-circle-group-1')
      .attr('cx', x - circleGroupOffset)
      .attr('cy', -circleGroupOffset)
      .attr('r', circleGroupRadius)
      .attr('fill', '#ffffff');
    this.circleGroup2 = this.circleGroup
      .append('circle')
      .attr('class', 'guide-circle-group-2')
      .attr('cx', x + circleGroupOffset)
      .attr('cy', -circleGroupOffset)
      .attr('r', circleGroupRadius)
      .attr('fill', '#ffffff');
    this.line = this.group
      .append('line')
      .attr('class', 'guide-line')
      .attr('x1', x)
      .attr('y1', circleRadius)
      .attr('x2', x)
      .attr('y2', containerHeight)
      .attr('stroke', 'gray')
      .attr('stroke-dasharray', 2);
    this.label = this.group
      .append('text')
      .attr('class', 'guide-label')
      .attr('x', x + circleRadius + labelPadding)
      .attr('y', circleRadius / 2)
      .text(label.text);

    if (this.collapsedCount > 1) {
      this.circleGroup.style('display', 'block');
      this.label.text(this.collapsedCount);
    }
  }

  /**
   * Calculate overlap with this guide's label and it's immediate right
   * neighbor. If there is overlap then add ellipsis to the label.
   * If we go past the overlap threshold, then we hide the label.
   */
  updateLabelWithEllipsis(rightNeighbor?: SvgVerticalGuide) {
    if (rightNeighbor) {
      let bounds = calcBounds(this.label, rightNeighbor.group);
      if (bounds && bounds.percentage > 0) {
        while (bounds && bounds.overlap + this.options.ellipsisPadding > 0) {
          this.label.text(this.label.text().slice(0, -1));
          bounds = calcBounds(this.label, rightNeighbor.group);
        }
        const text = this.label.text();
        if (text !== '') {
          this.label.text(`${text}...`);
        }
      }
    }
  }
}
