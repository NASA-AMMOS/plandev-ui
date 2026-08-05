<svelte:options immutable={true} />

<script lang="ts">
  import { select } from 'd3-selection';
  import type { ComputedAxis, HorizontalGuide } from '../../types/timeline';
  import { getHorizontalGuideBand, getYScale, HORIZONTAL_GUIDE_BAND_OPACITY } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let horizontalGuides: HorizontalGuide[] = [];
  export let yAxes: ComputedAxis[] = [];

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
          const yScale = getYScale(domain, drawHeight, yAxis?.scaleType, yAxis?.logConstant);
          const y = yScale(guide.y);

          const lineGroup = gSelection.append('g').attr('class', horizontalGuideClass);

          const color = 'gray';
          const dashColor = guide?.label?.color || color;
          const dashLength = 2;
          const width = 1.0;
          const band = getHorizontalGuideBand(guide.y, guide.y2, yScale, drawHeight);

          // Behind the edge lines, so the lines stay crisp on top of their own shading
          if (band) {
            lineGroup
              .append('rect')
              .attr('class', `${horizontalGuideClass}-band`)
              .attr('x', 0)
              .attr('y', band.y)
              .attr('width', drawWidth)
              .attr('height', band.height)
              .attr('fill', dashColor)
              .attr('fill-opacity', HORIZONTAL_GUIDE_BAND_OPACITY);
          }

          // Both edges are drawn the same way a single-value guide is, so a band still reads as the
          // same kind of annotation rather than as a differently-shaped one. An edge whose value is off
          // scale is skipped: the band is clamped and continues past the row, so drawing a line at the
          // clamp would assert a boundary that is not where the operator put it.
          const edgeYs = (band ? [y, yScale(guide.y2 as number)] : [y]).filter(
            edgeY => Number.isFinite(edgeY) && edgeY >= 0 && edgeY <= drawHeight,
          );
          for (const edgeY of edgeYs) {
            lineGroup
              .append('line')
              .attr('class', `${horizontalGuideClass}-line`)
              .attr('id', guide.id)
              .attr('x1', 0)
              .attr('y1', edgeY)
              .attr('x2', drawWidth)
              .attr('y2', edgeY)
              .attr('stroke', dashColor)
              .attr('stroke-dasharray', dashLength)
              .attr('stroke-width', width);
          }

          const labelVisibility = 'visible';
          const labelColor = guide?.label?.color || color;
          const labelFontFace = guide?.label?.fontFace || 'sans-serif';
          const labelFontSize = guide?.label?.fontSize || 12;
          const labelText = guide?.label?.text || '';
          // Just inside a band's upper edge rather than below one of them, which would read as
          // belonging to whichever edge it happened to land under
          const labelY = band ? band.y + labelYOffset : y + labelYOffset;
          lineGroup
            .append('text')
            .style('visibility', labelVisibility)
            .attr('class', `${horizontalGuideClass}-text`)
            .attr('x', 5)
            .attr('y', labelY)
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
