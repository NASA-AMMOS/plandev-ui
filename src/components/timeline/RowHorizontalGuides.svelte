<script lang="ts">
  import { select } from 'd3-selection';
  import type { Axis, HorizontalGuide } from '../../types';
  import { getYScale } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let horizontalGuides: HorizontalGuide[] = [];
  export let yAxes: Axis[] = [];

  let g: SVGGElement;

  $: if (drawHeight && drawWidth && g && horizontalGuides && yAxes) {
    draw();
  }

  function draw() {
    if (g) {
      const gSelection = select(g);
      const horizontalGuideClass = 'horizontal-guide';
      gSelection.selectAll(`.${horizontalGuideClass}`).remove();

      const labelYOffset = 15;

      for (const guide of horizontalGuides) {
        const yAxis = yAxes.find(axis => axis.id === guide.yAxisId);
        const domain = yAxis?.scaleDomain;

        if (domain && domain.length) {
          const yScale = getYScale(domain, drawHeight);
          const y = yScale(guide.y);

          const lineGroup = gSelection
            .append('g')
            .attr('class', horizontalGuideClass);

          const color = 'gray';
          const dashLength = 2;
          const width = 1.0;
          lineGroup
            .append('line')
            .attr('class', `${horizontalGuideClass}-line`)
            .attr('id', guide.id)
            .attr('x1', 0)
            .attr('y1', y)
            .attr('x2', drawWidth)
            .attr('y2', y)
            .attr('stroke', color)
            .attr('stroke-dasharray', dashLength)
            .attr('stroke-width', width);

          const labelVisibility = 'visible';
          const labelColor = guide?.label?.color || color;
          const labelFontFace = guide?.label?.fontFace || 'Helvetica Neue';
          const labelFontSize = guide?.label?.fontSize || 12;
          const labelText = guide?.label?.text || '';
          lineGroup
            .append('text')
            .style('visibility', labelVisibility)
            .attr('class', `${horizontalGuideClass}-text`)
            .attr('x', 5)
            .attr('y', y + labelYOffset)
            .attr('fill', labelColor)
            .attr('font-family', labelFontFace)
            .attr('font-size', `${labelFontSize}px`)
            .text(labelText);
        }
      }
    }
  }
</script>

<g class="row-horizontal-guides" bind:this={g} />
