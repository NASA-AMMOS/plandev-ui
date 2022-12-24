<svelte:options immutable={true} />

<script lang="ts">
  import { select } from 'd3-selection';
  import type { ConstraintViolation, MouseOverViolations } from '../../types/constraint';
  import type { ActivityPoint, LinePoint, MouseOver, Point, XRangePoint } from '../../types/timeline';
  import { getDoyTime } from '../../utilities/time';

  export let mouseOver: MouseOver;
  export let mouseOverViolations: MouseOverViolations;

  let points: Point[] = [];
  let violations: ConstraintViolation[] = [];

  $: onMouseOver(mouseOver);
  $: onMouseOverViolations(mouseOverViolations);

  function onMouseOver(event: MouseOver | undefined) {
    if (event) {
      points = event.points;
      show(event.e);
    }
  }

  function onMouseOverViolations(event: MouseOverViolations | undefined) {
    if (event) {
      violations = event.violations;
      show(event.e);
    }
  }

  function hide() {
    select('.tooltip').style('opacity', 0).style('z-index', -1).html('');
  }

  function show(event: MouseEvent): void {
    if (violations.length || points.length) {
      const text = tooltipText();
      const tooltipDiv = tooltip();
      tooltipDiv.html(text); // Set html so we can calculate the true tooltip width.

      const { pageX, pageY } = event;
      const pointerOffset = 10;

      let xPosition = pageX + pointerOffset;
      let yPosition = pageY + pointerOffset;
      tooltipDiv
        .style('opacity', 1.0)
        .style('left', `${xPosition}px`)
        .style('top', `${yPosition}px`)
        .style('z-index', 5);

      const node = tooltipDiv.node() as HTMLElement;
      const { height, width, x, y } = node.getBoundingClientRect();

      if (x + width > window.innerWidth) {
        xPosition -= width;
      }
      if (y + height > window.innerHeight) {
        yPosition -= height;
      }

      tooltipDiv.style('left', `${xPosition}px`).style('top', `${yPosition}px`);
    } else {
      hide();
    }
  }

  function tooltip() {
    const tooltipDiv = select(`.tooltip`);
    if (tooltipDiv.empty()) {
      const body = select('body');
      return body.append('div').attr('class', 'tooltip');
    } else {
      return tooltipDiv;
    }
  }

  function tooltipText() {
    let text = '';
    if (points.length) {
      text += tooltipTextForPoints();
    }
    if (violations.length) {
      if (points.length) {
        text += '<hr>';
      }
      text += tooltipTextForViolations();
    }
    return text;
  }

  function tooltipTextForActivityPoint(point: ActivityPoint): string {
    const { id, x } = point;
    const labelText = point.label?.text || '';
    return `
      <div>
        Id: ${id}
        <br>
        Name: ${labelText}
        <br>
        Start: ${getDoyTime(new Date(x))}
      </div>
    `;
  }

  function tooltipTextForLinePoint(point: LinePoint): string {
    const { id, x, y } = point;
    return `
      <div>
        Id: ${id}
        <br>
        Time: ${getDoyTime(new Date(x))}
        <br>
        Value: ${y}
      </div>
    `;
  }

  function tooltipTextForPoints(): string {
    let tooltipText = '';

    points.forEach((point: Point, i: number) => {
      if (point.type === 'activity') {
        tooltipText = `
          ${tooltipText}
          ${tooltipTextForActivityPoint(point as ActivityPoint)}
        `;
      }
      if (point.type === 'line') {
        tooltipText = `
          ${tooltipText}
          ${tooltipTextForLinePoint(point as LinePoint)}
        `;
      }
      if (point.type === 'x-range') {
        tooltipText = `
          ${tooltipText}
          ${tooltipTextForXRangePoint(point as XRangePoint)}
        `;
      }
      if (i !== points.length - 1) {
        tooltipText += `<hr>`;
      }
    });

    return tooltipText;
  }

  function tooltipTextForViolations(): string {
    let tooltipText = '';

    violations.forEach((violation: ConstraintViolation, i: number) => {
      const text = `
        <div>
          Constraint Violation
          <br>
          Name: ${violation.constraintName}
        </div>
      `;
      tooltipText = `${tooltipText} ${text}`;
      if (i !== violations.length - 1) {
        tooltipText += `<hr>`;
      }
    });

    return tooltipText;
  }

  function tooltipTextForXRangePoint(point: XRangePoint): string {
    const { id, x } = point;
    return `
      <div>
        Id: ${id}
        <br>
        Start: ${getDoyTime(new Date(x))}
        <br>
        Value: ${point.label.text}
      </div>
    `;
  }
</script>
