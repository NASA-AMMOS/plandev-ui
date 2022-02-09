<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import type { Selection } from 'd3-selection';
  import { getUnixEpochTime } from '../../utilities/time';

  export let drawHeight: number = 20;
  export let drawWidth: number = 0;
  export let verticalGuides: VerticalGuide[] = [];
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();

  let g: SVGGElement;

  $: if (
    drawWidth &&
    drawHeight &&
    verticalGuides &&
    viewTimeRange &&
    xScaleView
  ) {
    draw();
  }

  /**
   * Calculate the overlap between two SVG element selections.
   * Element a is assumed to be to the left of element b with
   * respect to the horizontal axis.
   */
  function calcBounds(
    a: Selection<SVGElement, unknown, null, undefined>,
    b: Selection<SVGElement, unknown, null, undefined>,
  ) {
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

  function draw() {
    if (g) {
      const gSelection = select(g);
      const verticalGuideClass = 'vertical-guide';
      gSelection.selectAll(`.${verticalGuideClass}`).remove();

      const circleColor = '#283593';
      const circleRadius = 7;
      const labelPadding = 3;

      const collapsedVerticalGuides = [];
      const collapsedVerticalGuideSelections: VerticalGuideSelection[] = [];
      const sortedVerticalGuides = sort(verticalGuides);

      for (let i = 0, l = sortedVerticalGuides.length; i < l; ++i) {
        const guide = sortedVerticalGuides[i];
        const time = getUnixEpochTime(guide.timestamp);

        if (viewTimeRange.start <= time && time <= viewTimeRange.end) {
          const x = xScaleView(time);

          const group = gSelection
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
            .attr('y2', drawHeight)
            .attr('stroke', 'gray')
            .attr('stroke-dasharray', 2);

          const labelColor = guide?.label?.color || 'black';
          const labelFontFace = guide?.label?.fontFace || 'sans-serif';
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

      dispatch('collapsedVerticalGuides', collapsedVerticalGuides);
      updateGuideLabelsWithEllipsis(collapsedVerticalGuideSelections);
    }
  }

  /**
   * Sort vertical guides in time order ascending.
   */
  function sort(verticalGuides: VerticalGuide[]): VerticalGuide[] {
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
  function updateGuideLabelsWithEllipsis(
    verticalGuideSelections: VerticalGuideSelection[],
    ellipsisPadding: number = 15,
  ) {
    for (let i = 0; i < verticalGuideSelections.length; ++i) {
      const curr = verticalGuideSelections[i];
      const next = verticalGuideSelections[i + 1];

      if (next) {
        let bounds = calcBounds(curr.label, next.group);
        if (bounds && bounds.percentage > 0) {
          while (bounds && bounds.overlap + ellipsisPadding > 0) {
            curr.label.text(curr.label.text().slice(0, -1));
            bounds = calcBounds(curr.label, next.group);
          }
          const text = curr.label.text();
          if (text !== '') {
            curr.label.text(`${text}...`);
          }
        }
      }
    }
  }
</script>

<g bind:this={g} />
