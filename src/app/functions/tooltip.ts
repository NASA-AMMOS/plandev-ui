import * as d3 from 'd3';
import { Point, PointActivity } from '../types';
import { getDoyTimestamp } from './time';

export function getTooltipTextForPoints(points: Point[]): string {
  let tooltipText = '';

  points.forEach((point: Point) => {
    if (point.type === 'activity') {
      tooltipText = `
        ${tooltipText}
        ${getTooltipTextPointActivity(point as PointActivity)}
      `;
    }
  });

  return tooltipText;
}

export function getTooltipTextPointActivity(point: PointActivity): string {
  const { id, labelText, x } = point;
  return `
    <div>
      <strong>Id:</strong> ${id}
      <br>
      <strong>Activity Type:</strong> ${labelText}
      <br>
      <strong>Start:</strong> ${getDoyTimestamp(x)}
    </div>
  `;
}

export function hideTooltip() {
  d3.select('app-tooltip')
    .style('opacity', 0)
    .style('z-index', -1)
    .html('');
}

export function showTooltip(
  event: MouseEvent,
  text: string,
  drawWidth: number,
): void {
  const { clientX, clientY } = event;
  const appTooltip = d3.select('app-tooltip');
  appTooltip.html(text); // Set html first so we can calculate the true width.

  const node = appTooltip.node() as HTMLElement;
  const { height, width } = node.getBoundingClientRect();
  let xPosition = clientX;
  if (drawWidth - xPosition < 0) {
    xPosition = clientX - width;
  }
  const yPosition = clientY - height;

  appTooltip
    .style('opacity', 0.9)
    .style('left', `${xPosition}px`)
    .style('top', `${yPosition}px`)
    .style('z-index', 5);
}
