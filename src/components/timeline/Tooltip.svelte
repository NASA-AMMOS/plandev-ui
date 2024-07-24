<svelte:options immutable={true} />

<script lang="ts">
  import { select } from 'd3-selection';
  import { groupBy } from 'lodash-es';
  import { onMount } from 'svelte';
  import DirectiveIcon from '../../assets/timeline-directive.svg?raw';
  import SpanIcon from '../../assets/timeline-span.svg?raw';
  import { plugins } from '../../stores/plugins';
  import type { ActivityDirective } from '../../types/activity';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { ResourceType, Span } from '../../types/simulation';
  import type { LineLayer, LinePoint, MouseOver, Point, Row, XRangePoint } from '../../types/timeline';
  import { addPageFocusListener } from '../../utilities/generic';
  import { formatDate } from '../../utilities/time';
  import { filterResourcesByLayer } from '../../utilities/timeline';

  export let interpolateHoverValue: boolean = false;
  export let hidden: boolean = false;
  export let mouseOver: MouseOver | null;
  export let resourceTypes: ResourceType[] = [];

  let activityDirectives: ActivityDirective[] = [];
  let constraintResults: ConstraintResultWithName[] = [];
  let points: Point[] = [];
  let gaps: Point[] = [];
  let spans: Span[] = [];
  let showAdditionalTimes: boolean = false;
  let row: Row | null = null;
  let visible: boolean = false;

  $: if (mouseOver && typeof showAdditionalTimes === 'boolean') {
    onMouseOver(mouseOver);
  }

  $: primaryTimeLabel = $plugins.time.primary.label;

  onMount(() => {
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keyup', onKeyup);

    // Add page focus listener to handle command + tab events that
    // can cause the mode change to be stuck in Navigation mode on Macs.
    const removeDocumentFocusListener = addPageFocusListener(e => {
      if (e === 'out') {
        showAdditionalTimes = false;
      }
    });

    return () => {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('keyup', onKeyup);
      removeDocumentFocusListener();
    };
  });

  function onKeydown(e: KeyboardEvent) {
    // If user holds meta/control while not focused on an input then activate navigation mode
    if (e.key === 'Shift') {
      showAdditionalTimes = true;
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (e.key === 'Shift') {
      showAdditionalTimes = false;
    }
  }

  function onMouseOver(event: MouseOver | undefined) {
    if (event && !hidden) {
      activityDirectives = event.activityDirectives || [];
      constraintResults = event?.constraintResults ?? [];
      gaps = event?.gapsByLayer ? Object.values(event.gapsByLayer).flat() : [];
      points = event?.pointsByLayer ? Object.values(event.pointsByLayer).flat() : [];
      row = event?.row ?? null;
      spans = event.spans || [];

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

    // Limit total number of directives and spans displayed to 2 to prevent visual overflow
    // Aggregate the remaining items by directive vs span and then by type
    const activityDisplayLimit = 2;
    let count = 0;
    const activityDirectivesToDisplay: ActivityDirective[] = [];
    const overflowingActivityDirectives: ActivityDirective[] = [];
    const spansToDisplay: Span[] = [];
    const overflowingSpans: Span[] = [];
    activityDirectives.forEach(directive => {
      if (count < activityDisplayLimit) {
        activityDirectivesToDisplay.push(directive);
        count++;
      } else {
        overflowingActivityDirectives.push(directive);
      }
    });
    spans.forEach(span => {
      if (count < activityDisplayLimit) {
        spansToDisplay.push(span);
        count++;
      } else {
        overflowingSpans.push(span);
      }
    });

    activityDirectivesToDisplay.forEach((activityDirective: ActivityDirective, i: number) => {
      const text = textForActivityDirective(activityDirective);
      tooltipText = `${tooltipText} ${text}`;

      if (i !== activityDirectives.length - 1) {
        tooltipText = `${tooltipText}<hr>`;
      }
    });

    if (spansToDisplay.length && activityDirectivesToDisplay.length) {
      tooltipText = `${tooltipText}<hr>`;
    }
    spansToDisplay.forEach((span: Span, i: number) => {
      const text = textForSpan(span);
      tooltipText = `${tooltipText} ${text}`;

      if (i !== spans.length - 1) {
        tooltipText = `${tooltipText}<hr>`;
      }
    });

    if (overflowingActivityDirectives.length) {
      const groups = groupBy(overflowingActivityDirectives, 'type');
      tooltipText += `<div class='tooltip-row-container'>
        ${Object.entries(groups)
          .map(([key, members]) => {
            return `<div class='st-typography-bold' style='color: var(--st-gray-10); display: flex; gap: 4px;'>${DirectiveIcon} +${members.length} ${key}</div>`;
          })
          .join('')}
      </div>`;
    }

    if (overflowingSpans.length) {
      if (overflowingActivityDirectives.length) {
        tooltipText += '<hr>';
      }
      const groups = groupBy(overflowingSpans, 'type');
      tooltipText += `<div class='tooltip-row-container'>
        ${Object.entries(groups)
          .map(([key, members]) => {
            return `<div class='st-typography-bold' style='color: var(--st-gray-10); display: flex; gap: 4px;'>${SpanIcon} +${members.length} ${key}</div>`;
          })
          .join('')}
      </div>`;
    }

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

    if (points.length && (constraintResults.length || activityDirectives.length || spans.length)) {
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

    return tooltipText;
  }

  function textForActivityDirective(activityDirective: ActivityDirective): string {
    const { anchor_id, id, name, start_time_ms, type } = activityDirective;
    const directiveStartTime =
      typeof start_time_ms === 'number' ? formatDate(new Date(start_time_ms), $plugins.time.primary.format) : 'Unknown';
    return `
      <div class='tooltip-row-container'>
        <div class='st-typography-bold' style='color: var(--st-gray-10); display: flex; gap: 4px;'>${DirectiveIcon} Activity Directive</div>
        <div class='tooltip-row'>
          <span>Name:</span>
          <span class='tooltip-value-row'>
            <span class='tooltip-value-highlight st-typography-medium'>${name}</span>
          </span>
        </div>
        <div class='tooltip-row'>
          <span>Type:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${type}</span>
        </div>
        <div class='tooltip-row'>
          <span>Start Time (${primaryTimeLabel}):</span>
          <span class='tooltip-value-highlight st-typography-medium'>${directiveStartTime}</span>
        </div>
        ${
          showAdditionalTimes
            ? $plugins.time.additional
                .map(
                  f =>
                    `<div class='tooltip-row'>
                      <span>Start Time (${f.label}):</span>
                      <span class='tooltip-value-highlight st-typography-medium'>
                        ${typeof start_time_ms === 'number' ? f.format(new Date(start_time_ms)) : 'Unknown'}
                      </span>
                  </div>`,
                )
                .join('')
            : ''
        }
        <div class='tooltip-row'>
          <span>Id:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${id}</span>
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
      name = layer.name ? layer.name : point.name;
      const layerResources = filterResourcesByLayer(layer, resourceTypes);
      if (layerResources.length > 0) {
        // Only consider a single resource since multiple resources on a single layer is
        // supported in config but not valid
        unit = layerResources[0].schema.metadata?.unit?.value || '';
      }
      color = (layer as LineLayer).lineColor;
    }

    const pointTime = formatDate(new Date(x), $plugins.time.primary.format);

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
          <span>Time (${primaryTimeLabel}):</span>
          <span class='tooltip-value-highlight st-typography-medium'>
            ${pointTime}
          </span>
        </div>
        ${
          showAdditionalTimes
            ? $plugins.time.additional
                .map(
                  f =>
                    `<div class='tooltip-row'>
                      <span>Time (${f.label}):</span>
                      <span class='tooltip-value-highlight st-typography-medium'>
                        ${formatDate(new Date(x), f.format)}
                      </span>
                  </div>`,
                )
                .join('')
            : ''
        }
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
    const { span_id, duration, startMs, endMs, type } = span;
    const spanStartTime = formatDate(new Date(startMs), $plugins.time.primary.format);
    const spanEndTime = formatDate(new Date(endMs), $plugins.time.primary.format);
    return `
      <div class='tooltip-row-container'>
        <div class='st-typography-bold' style='color: var(--st-gray-10); display: flex; gap: 4px;'>${SpanIcon} Simulated Activity (Span)</div>
        <div class='tooltip-row'>
          <span>Type:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${type}</span>
        </div>
        <div class='tooltip-row'>
          <span>Start Time (${primaryTimeLabel}):</span>
          <span class='tooltip-value-highlight st-typography-medium'>${spanStartTime}</span>
        </div>
        ${
          showAdditionalTimes
            ? $plugins.time.additional
                .map(
                  f =>
                    `<div class='tooltip-row'>
                      <span>Start Time (${f.label}):</span>
                      <span class='tooltip-value-highlight st-typography-medium'>
                        ${f.format(new Date(startMs))}
                      </span>
                  </div>`,
                )
                .join('')
            : ''
        }
        <div class='tooltip-row'>
          <span>End Time (${primaryTimeLabel}):</span>
          <span class='tooltip-value-highlight st-typography-medium'>${spanEndTime}</span>
        </div>
        ${
          showAdditionalTimes
            ? $plugins.time.additional
                .map(
                  f =>
                    `<div class='tooltip-row'>
                      <span>End Time (${f.label}):</span>
                      <span class='tooltip-value-highlight st-typography-medium'>
                        ${f.format(new Date(endMs))}
                      </span>
                  </div>`,
                )
                .join('')
            : ''
        }
        <div class='tooltip-row'>
          <span>Duration:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${duration}</span>
        </div>
        <div class='tooltip-row'>
          <span>Id:</span>
          <span class='tooltip-value-highlight st-typography-medium'>${span_id}</span>
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
      name = layer.name ? layer.name : point.name;
      color = (layer as LineLayer).lineColor;
    }
    const pointTime = formatDate(new Date(x), $plugins.time.primary.format);

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
          <span>Start Time (${primaryTimeLabel}):</span>
          <span class='tooltip-value-highlight st-typography-medium'>
            ${pointTime}
          </span>
        </div>
        ${
          showAdditionalTimes
            ? $plugins.time.additional
                .map(
                  f =>
                    `<div class='tooltip-row'>
                      <span>Start Time (${f.label}):</span>
                      <span class='tooltip-value-highlight st-typography-medium'>
                        ${f.format(new Date(x))}
                      </span>
                  </div>`,
                )
                .join('')
            : ''
        }
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
