<svelte:options immutable={true} />

<script lang="ts">
  import { axisLeft as d3AxisLeft } from 'd3-axis';
  import type { Selection } from 'd3-selection';
  import { select } from 'd3-selection';
  import type { Axis } from '../../types/timeline';
  import { getYScale } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let yAxes: Axis[] = [];

  const MAX_ITERATIONS = 5;

  let g: SVGGElement;

  $: if (drawHeight && g && yAxes) {
    draw();
  }

  function fitTextToWidth(
    textSelection: Selection<SVGTextElement, unknown, null, undefined>,
    text: string,
    width: number,
  ) {
    textSelection.text(text);
    let textLength = textSelection?.node()?.getComputedTextLength() ?? 0;

    // If text is longer than total allowed width,
    // split the string in half and reduce the character length of each half by the ratio
    // of how much longer the string is than the width.
    // Iterate this process until "[start]...[end]" fits within the width.
    // (One pass is not necessarily good enough, due to variance in character widths,
    // but this should take at most 2 or 3 iterations)
    if (textLength > width) {
      let start = text.substring(0, text.length * 0.5);
      let end = text.substring(text.length * 0.5);
      let i = 0;
      let reduction: number;

      while (textLength > width && i < MAX_ITERATIONS) {
        i++;
        reduction = 1 - width / textLength;
        start = start.substring(0, start.length * (1 - reduction));
        end = end.substring(Math.ceil(end.length * reduction));
        textSelection.text(start + '...' + end);
        textLength = textSelection?.node()?.getComputedTextLength() ?? 0;
      }
    }
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
        const domain = axis.scaleDomain;
        const scale = getYScale(domain, drawHeight);

        const color = axis.color;
        const labelColor = axis.label?.color || 'black';
        const labelFontFace = axis.label?.fontFace || 'sans-serif';
        const labelFontSize = axis.label?.fontSize || 12;
        const labelText = axis.label.text;
        const tickCount = axis.tickCount;

        const axisLeft = d3AxisLeft(scale).ticks(tickCount).tickSizeOuter(0);
        const axisMargin = 20;
        const startPosition = -(totalWidth + axisMargin * i);
        axisG.attr('transform', `translate(${startPosition}, 0)`);
        axisG.style('color', color);
        if (domain.length === 2) {
          axisG.call(axisLeft);
        }

        const axisGElement: SVGGElement | null = axisG.node();
        if (axisGElement !== null) {
          const axisWidth = axisGElement.getBoundingClientRect().width;
          const axisLabelMargin = 20;
          const y = -(axisWidth + axisLabelMargin);

          const text = axisG
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', y)
            .attr('x', 0 - drawHeight / 2)
            .attr('dy', '1em')
            .attr('fill', labelColor)
            .attr('font-family', labelFontFace)
            .attr('font-size', `${labelFontSize}px`)
            .style('text-anchor', 'middle');

          fitTextToWidth(text, labelText, drawHeight);
          totalWidth += axisGElement.getBoundingClientRect().width;
        }
      }
    }
  }
</script>

<g class="row-y-axes" bind:this={g} />
