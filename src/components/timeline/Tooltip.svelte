<svelte:options immutable={true} />

<script lang="ts">
  import { select } from 'd3-selection';
  import type { ActivityDirective } from '../../types/activity';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { Resource, Span } from '../../types/simulation';
  import type { LineLayer, LinePoint, MouseOver, Point, Row, XRangePoint } from '../../types/timeline';
  import { getDoyTime } from '../../utilities/time';

  export let mouseOver: MouseOver | null;
  export let interpolateHoverValue: boolean = false;
  export let resourcesByViewLayerId: Record<number, Resource[]> = {};
  export let hidden: boolean = false;

  let activityDirectives: ActivityDirective[] = [];
  let constraintResults: ConstraintResultWithName[] = [];
  let points: Point[] = [];
  let gaps: Point[] = [];
  let spans: Span[] = [];
  let row: Row | null = null;
  let visible: boolean = false;

  $: if (mouseOver) {
    onMouseOver(mouseOver);
  }

  function onMouseOver(event: MouseOver | undefined) {
    if (event && !hidden) {
      activityDirectives = event?.activityDirectivesByLayer
        ? Object.values(event.activityDirectivesByLayer).flat()
        : [];
      constraintResults = event?.constraintResults ?? [];
      gaps = event?.gapsByLayer ? Object.values(event.gapsByLayer).flat() : [];
      points = event?.pointsByLayer ? Object.values(event.pointsByLayer).flat() : [];
      row = event?.row ?? null;
      spans = event?.spansByLayer ? Object.values(event.spansByLayer).flat() : [];

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

    const flatPointsByLayer = Object.entries(mouseOver?.pointsByLayer || {})
      .map(([layerId, points]) => {
        return points.map(point => ({ layerId, point }));
      })
      .flat();

    flatPointsByLayer.forEach(({ point, layerId }, i) => {
      const layerIdAsNumber = parseInt(layerId);
      if (point.type === 'line') {
        const text = textForLinePoint(point as LinePoint, layerIdAsNumber);
        tooltipText = `${tooltipText} ${text}`;
      }

      if (point.type === 'x-range') {
        const text = textForXRangePoint(point as XRangePoint, layerIdAsNumber);
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
      <div class='tooltip-row-container'>
        <div class='st-typography-bold' style='color: var(--st-gray-10)'>Activity Directive</div>
        <div class='tooltip-row'>
          <span>Name:</span>
          <span class='tooltip-value-row'>
            <span class='tooltip-value-highlight st-typography-medium'>${name}</span>
          </span>
        </div>
        <div class='tooltip-row'>
          <span>Id:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${id}</span>
        </div>
        <div class='tooltip-row'>
          <span>Type:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${type}</span>
        </div>
        <div class='tooltip-row'>
          <span>Start Offset:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${start_offset}</span>
        </div>
        <div class='tooltip-row'>
          <span>Anchored To ID:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${anchor_id ?? 'None'}</span>
        </div>
      </div>
    `;
  }

  function textForConstraintViolation(constraintViolation: ConstraintResultWithName): string {
    return `
      <div class='tooltip-row-container'>
        <div class='st-typography-bold' style='color: var(--st-gray-10)'>Constraint Violation</div>
        <div class='tooltip-row'>
          <span>Name:</span>
          <span class='tooltip-value-row'>
            <span class='tooltip-value-highlight st-typography-medium'>${constraintViolation.constraintName}</span>
          </span>
        </div>
      </div>
    `;
  }

  function textForLinePoint(point: LinePoint, layerId: number): string {
    const { x, y } = point;
    const layer = row ? row.layers.find(l => l.id === layerId) : null;
    let color = '#FFFFFF';
    let unit = '';
    let name = point.name;
    if (layer && layer.chartType === 'line') {
      const resources = resourcesByViewLayerId[layerId] || [];
      if (resources.length > 0) {
        // Only consider a single resource since multiple resources on a single layer is
        // supported in config but not valid
        unit = resources[0].schema.metadata?.unit?.value || '';
        name = layer.name ? layer.name : point.name;
      }
      color = (layer as LineLayer).lineColor;
    }

    return `
      <div class='tooltip-row-container'>
        <div class='tooltip-row'>
          <span>Resource Name:</span>
          <span class='tooltip-value-row'>
            <span style='background: ${color}' class='tooltip-color-box'></span>
            <span class='tooltip-value-highlight st-typography-medium'>${name}</span>
          </span>
        </div>
        <div class='tooltip-row'>
          <span>Time:</span>
          <span class='tooltip-value-highlight st-typography-medium'>
            ${getDoyTime(new Date(x))} UTC
          </span>
        </div>
        <div class='tooltip-row'>
          <span>${interpolateHoverValue ? 'Interpolated' : 'Nearest'} Value:</span>
          <span class='tooltip-value-highlight st-typography-medium'>
            ${y}${unit ? ` (${unit})` : ''}
          </span>
        </div>
      </div>
    `;
  }

  function textForSpan(span: Span): string {
    const { id, duration, start_offset, type } = span;
    return `
      <div class='tooltip-row-container'>
        <div class='st-typography-bold' style='color: var(--st-gray-10)'>Simulated Activity (Span)</div>
        <div class='tooltip-row'>
          <span>Id:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${id}</span>
        </div>
        <div class='tooltip-row'>
          <span>Type:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${type}</span>
        </div>
        <div class='tooltip-row'>
          <span>Start Offset:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${start_offset}</span>
        </div>
        <div class='tooltip-row'>
          <span>Duration:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${duration}</span>
        </div>
      </div>
    `;
  }

  function textForXRangePoint(point: XRangePoint, layerId: number): string {
    const { x } = point;

    const layer = row ? row.layers.find(l => l.id === layerId) : null;
    let color = '#FFFFFF';
    let name = '';
    if (layer && layer.chartType === 'x-range') {
      const resources = resourcesByViewLayerId[layerId] || [];
      if (resources.length > 0) {
        // Only consider a single resource since multiple resources on a single layer is
        // supported in config but not valid
        name = layer.name ? layer.name : point.name;
      }
      color = (layer as LineLayer).lineColor;
    }

    return `
      <div class='tooltip-row-container'>
        <div class='tooltip-row'>
          <span>Resource Name:</span>
          <span class='tooltip-value-row'>
            <span style='background: ${color}' class='tooltip-color-box'></span>
            <span class='tooltip-value-highlight st-typography-medium'>${name}</span>
          </span>
        </div>
        <div class='tooltip-row'>
          <span>Start:</span>
          <span class='tooltip-value-highlight st-typography-medium'>
            ${getDoyTime(new Date(x))} UTC
          </span>
        </div>
        <div class='tooltip-row'>
          <span>Value:</span>
          <span class='tooltip-value-highlight st-typography-medium'>
            ${point.label.text}
          </span>
        </div>
      </div>
    `;
  }
</script>
