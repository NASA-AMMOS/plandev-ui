<svelte:options immutable={true} />

<script lang="ts">
  import { select } from 'd3-selection';
  import type { ActivityDirective } from '../../types/activity';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { Span } from '../../types/simulation';
  import type { LinePoint, MouseOver, Point, XRangePoint } from '../../types/timeline';
  import { getDoyTime } from '../../utilities/time';

  export let mouseOver: MouseOver | null;

  let activityDirectives: ActivityDirective[] = [];
  let constraintResults: ConstraintResultWithName[] = [];
  let points: Point[] = [];
  let gaps: Point[] = [];
  let spans: Span[] = [];
  let visible: boolean = false;

  $: if (mouseOver) {
    onMouseOver(mouseOver);
  }

  function onMouseOver(event: MouseOver | undefined) {
    if (event) {
      activityDirectives = event?.activityDirectives ?? [];
      constraintResults = event?.constraintResults ?? [];
      gaps = event?.gaps ?? [];
      points = event?.points ?? [];
      spans = event?.spans ?? [];

      show(event.e);
    }
  }

  export function hide() {
    select('.tooltip').style('opacity', 0).style('z-index', -1).html('');
    visible = false;
  }

  export function isShown() {
    return visible;
  }

  function show(event: MouseEvent): void {
    const showTooltip =
      activityDirectives.length > 0 ||
      constraintResults.length > 0 ||
      points.length > 0 ||
      spans.length > 0 ||
      gaps.length > 0;

    if (showTooltip) {
      const text = tooltipText();
      const tooltipDiv = tooltip();
      tooltipDiv.html(text); // Set html so we can calculate the true tooltip width.

      const { pageX, pageY } = event;
      const pointerOffset = 10;

      let xPosition = pageX + pointerOffset;
      let yPosition = pageY + pointerOffset;
      tooltipDiv.style('opacity', 1.0);
      tooltipDiv.style('left', `${xPosition}px`);
      tooltipDiv.style('top', `${yPosition}px`);
      tooltipDiv.style('z-index', 9);

      const node = tooltipDiv.node() as HTMLElement;
      const { height, width, x, y } = node.getBoundingClientRect();

      if (x + width > window.innerWidth) {
        xPosition -= width;
      }
      if (y + height > window.innerHeight) {
        yPosition -= height;
      }

      tooltipDiv.style('left', `${xPosition}px`);
      tooltipDiv.style('top', `${yPosition}px`);
      visible = true;
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

  function tooltipText(): string {
    let tooltipText = '';

    if (gaps.length) {
      // For now we render a single static "No Value" message for any number of gaps,
      // as long as there aren't other data points to render at the same location
      if (!points.length && !constraintResults.length && !activityDirectives.length && !spans.length) {
        return `
          <div>
            No Value
          </div>
        `;
      }
    }

    activityDirectives.forEach((activityDirective: ActivityDirective, i: number) => {
      const text = textForActivityDirective(activityDirective);
      tooltipText = `${tooltipText} ${text}`;

      if (i !== activityDirectives.length - 1) {
        tooltipText = `${tooltipText}<hr>`;
      }
    });

    if (constraintResults.length && activityDirectives.length) {
      tooltipText = `${tooltipText}<hr>`;
    }

    constraintResults.forEach((constraintResult: ConstraintResultWithName, i: number) => {
      const text = textForConstraintViolation(constraintResult);
      tooltipText = `${tooltipText} ${text}`;

      if (i !== constraintResults.length - 1) {
        tooltipText = `${tooltipText}<hr>`;
      }
    });

    if (points.length && (constraintResults.length || activityDirectives.length)) {
      tooltipText = `${tooltipText}<hr>`;
    }

    points.forEach((point: Point, i: number) => {
      if (point.type === 'line') {
        const text = textForLinePoint(point as LinePoint);
        tooltipText = `${tooltipText} ${text}`;
      }

      if (point.type === 'x-range') {
        const text = textForXRangePoint(point as XRangePoint);
        tooltipText = `${tooltipText} ${text}`;
      }

      if (i !== points.length - 1) {
        tooltipText = `${tooltipText}<hr>`;
      }
    });

    if (spans.length && (points.length || constraintResults.length || activityDirectives.length)) {
      tooltipText = `${tooltipText}<hr>`;
    }

    spans.forEach((span: Span, i: number) => {
      const text = textForSpan(span);
      tooltipText = `${tooltipText} ${text}`;

      if (i !== spans.length - 1) {
        tooltipText = `${tooltipText}<hr>`;
      }
    });

    return tooltipText;
  }

  function textForActivityDirective(activityDirective: ActivityDirective): string {
    const { anchor_id, id, name, start_offset, type } = activityDirective;
    return `
      <div>
        Activity Directive
        <br>
        Id: ${id}
        <br>
        Name: ${name}
        <br>
        Type: ${type}
        <br>
        Start Offset: ${start_offset}
        <br>
        Anchored To ID: ${anchor_id ?? 'None'}
      </div>
    `;
  }

  function textForConstraintViolation(constraintViolation: ConstraintResultWithName): string {
    return `
      <div>
        Constraint Violation
        <br>
        Name: ${constraintViolation.constraintName}
      </div>
    `;
  }

  function textForLinePoint(point: LinePoint): string {
    const { id, x, y } = point;
    return `
      <div>
        Id: ${id}
        <br>
        Resource Name: ${point.name}
        <br>
        Time: ${getDoyTime(new Date(x))}
        <br>
        Value: ${y}
      </div>
    `;
  }

  function textForSpan(span: Span): string {
    const { id, duration, start_offset, type } = span;
    return `
      <div>
        Simulated Activity (Span)
        <br>
        Id: ${id}
        <br>
        Type: ${type}
        <br>
        Start Offset: ${start_offset}
        <br>
        Duration: ${duration}
      </div>
    `;
  }

  function textForXRangePoint(point: XRangePoint): string {
    const { id, x } = point;
    return `
      <div>
        Id: ${id}
        <br>
        Resource Name: ${point.name}
        <br>
        Start: ${getDoyTime(new Date(x))}
        <br>
        Value: ${point.label.text}
      </div>
    `;
  }
</script>
