<svelte:options immutable={true} />

<script lang="ts">
  import { select } from 'd3-selection';
  import type { ComputedAxis, HorizontalGuide } from '../../types/timeline';
  import { getHorizontalGuideBand, GUIDE_BAND_OPACITY, getYScale } from '../../utilities/timeline';

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
              .attr('fill-opacity', GUIDE_BAND_OPACITY);
          }

          // A band's two edges are told apart rather than drawn alike: solid on the edge the guide's
          // own y sits at, dashed on the edge y2 extends to, matching the vertical bands and agreeing
          // with the editor row, which shows y and nothing else. A single-value guide stays dashed, as
          // it always was. clampGuideBand reports which edges are on scale; a clamped one is skipped
          // rather than drawn at the clamp.
          const bandEndY = band ? band.y + band.height : y;
          const anchorEdgeY = band?.anchorAtStart ? band.y : bandEndY;
          const edgeYs = band
            ? [...(band.showStartEdge ? [band.y] : []), ...(band.showEndEdge ? [bandEndY] : [])]
            : [y];
          for (const edgeY of edgeYs) {
            const isAnchorEdge = band !== null && edgeY === anchorEdgeY;
            const line = lineGroup
              .append('line')
              .attr('class', `${horizontalGuideClass}-line`)
              .attr('id', guide.id)
              .attr('x1', 0)
              .attr('y1', edgeY)
              .attr('x2', drawWidth)
              .attr('y2', edgeY)
              .attr('stroke', dashColor)
              .attr('stroke-width', width);
            if (!isAnchorEdge) {
              line.attr('stroke-dasharray', dashLength);
            }
          }

          const labelVisibility = 'visible';
          const labelColor = guide?.label?.color || color;
          const labelFontFace = guide?.label?.fontFace || 'sans-serif';
          const labelFontSize = guide?.label?.fontSize || 12;
          const labelText = guide?.label?.text || '';
          // Just inside a band's upper edge rather than below one of them, which would read as
          // belonging to whichever edge it happened to land under
          const labelY = band ? band.y + labelYOffset : y + labelYOffset;
          const label = lineGroup
            .append('text')
            .style('visibility', labelVisibility)
            .attr('class', `${horizontalGuideClass}-text`)
            .attr('x', 5)
            .attr('y', labelY)
            .attr('fill', labelColor)
            .attr('font-family', labelFontFace)
            .attr('font-size', `${labelFontSize}px`)
            .text(labelText);

          // The extent, trailing the name, is the horizontal counterpart of a vertical band's duration
          // cap: it saves reading two edges off the axis. Written low-to-high regardless of which value
          // the operator typed first, since a value interval has no direction of its own -- the solid
          // edge above is what says which end is the guide's anchor.
          if (band) {
            const [low, high] = [guide.y, guide.y2 as number].sort((a, b) => a - b);
            lineGroup
              .append('text')
              .attr('class', `${horizontalGuideClass}-extent`)
              .attr('x', 5 + (label.node()?.getComputedTextLength() ?? 0) + 6)
              .attr('y', labelY)
              .attr('fill', labelColor)
              .attr('fill-opacity', 0.7)
              .attr('font-family', labelFontFace)
              .attr('font-size', `${labelFontSize - 1}px`)
              .text(`${low}–${high}`);
          }
        }
      }
    }
  }
</script>

<g class="row-horizontal-guides" bind:this={g} />
