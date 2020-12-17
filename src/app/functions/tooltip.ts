import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import { select } from 'd3-selection';
import { ActivityPoint, LinePoint, Point, XRangePoint } from '../types';

export function getTooltipTextForPoints(points: Point[]): string {
  let tooltipText = '';

  points.forEach((point: Point, i: number) => {
    if (point.type === 'activity') {
      tooltipText = `
        ${tooltipText}
        ${getTooltipTextActivityPoint(point as ActivityPoint)}
      `;
    }
    if (point.type === 'line') {
      tooltipText = `
        ${tooltipText}
        ${getTooltipTextLinePoint(point as LinePoint)}
      `;
    }
    if (point.type === 'x-range') {
      tooltipText = `
        ${tooltipText}
        ${getTooltipTextXRangePoint(point as XRangePoint)}
      `;
    }
    if (i !== points.length - 1) {
      tooltipText += `<hr>`;
    }
  });

  return tooltipText;
}

export function getTooltipTextActivityPoint(point: ActivityPoint): string {
  const { id, x } = point;
  const labelText = point.label?.text || '';
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

export function getTooltipTextLinePoint(point: LinePoint): string {
  const { id, x, y } = point;
  return `
    <div>
      <strong>Id:</strong> ${id}
      <br>
      <strong>Time:</strong> ${getDoyTimestamp(x)}
      <br>
      <strong>Value:</strong> ${y}
    </div>
  `;
}

export function getTooltipTextXRangePoint(point: XRangePoint): string {
  const { id, x } = point;
  return `
    <div>
      <strong>Id:</strong> ${id}
      <br>
      <strong>Start:</strong> ${getDoyTimestamp(x)}
      <br>
      <strong>Value:</strong> ${point.label.text}
    </div>
  `;
}

export function hideTooltip() {
  select('app-tooltip').style('opacity', 0).style('z-index', -1).html('');
}

export function showTooltip(
  event: MouseEvent | DragEvent,
  text: string,
  drawWidth: number,
): void {
  const { clientX, clientY } = event;
  const appTooltip = select('app-tooltip');
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
