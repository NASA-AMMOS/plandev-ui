<script lang="ts">
  import { axisLeft as d3AxisLeft } from 'd3-axis';
  import { select } from 'd3-selection';
  import type { Axis } from '../../types';
  import { getYScale } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let yAxes: Axis[] = [];

  let g: SVGGElement;

  $: if (drawHeight && g && yAxes) {
    draw();
  }

  function draw() {
    if (g) {
      const gSelection = select(g);

      let totalWidth = 0;
      const axisClass = 'y-axis';
      gSelection.selectAll(`.${axisClass}`).remove();

      for (let i = 0; i < yAxes.length; ++i) {
        const axis = yAxes[i];

        const axisG = gSelection.append('g').attr('class', axisClass);
        axisG.selectAll('*').remove();
        const domain = axis?.scaleDomain || [];
        const scale = getYScale(domain, drawHeight);

        const color = axis?.color || 'black';
        const labelColor = axis?.label?.color || 'black';
        const labelFontFace = axis?.label?.fontFace || 'Helvetica Neue';
        const labelFontSize = axis?.label?.fontSize || 12;
        const labelText = axis?.label?.text || '';
        const tickCount = axis?.tickCount || 5;

        const axisLeft = d3AxisLeft(scale).ticks(tickCount).tickSizeOuter(0);
        const axisMargin = 20;
        const startPosition = -(totalWidth + axisMargin * i);
        axisG.attr('transform', `translate(${startPosition}, 0)`);
        axisG.style('color', color);
        if (domain.length) {
          axisG.call(axisLeft);
        }

        const axisGElement: SVGGElement = axisG.node();
        const axisWidth = axisGElement.getBoundingClientRect().width;
        const axisLabelMargin = 20;
        const y = -(axisWidth + axisLabelMargin);

        axisG
          .append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', y)
          .attr('x', 0 - drawHeight / 2)
          .attr('dy', '1em')
          .attr('fill', labelColor)
          .attr('font-family', labelFontFace)
          .attr('font-size', `${labelFontSize}px`)
          .style('text-anchor', 'middle')
          .text(labelText);

        totalWidth += axisGElement.getBoundingClientRect().width;
      }
    }
  }
</script>

<g class="row-y-axes" bind:this={g} />
