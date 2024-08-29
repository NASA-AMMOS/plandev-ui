<svelte:options immutable={true} />

<script lang="ts">
  import { axisLeft as d3AxisLeft, type AxisScale } from 'd3-axis';
  import { format as d3Format } from 'd3-format';
  import { select, type Selection } from 'd3-selection';
  import { createEventDispatcher, tick } from 'svelte';
  import type { Resource } from '../../types/simulation';
  import type { Axis, Layer, LineLayer, XRangeLayer } from '../../types/timeline';
  import { filterResourcesByLayer, getOrdinalYScale, getYScale } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let resources: Resource[];
  export let layers: Layer[] = [];
  export let yAxes: Axis[] = [];

  const dispatch = createEventDispatcher<{
    updateYAxesWidth: number;
  }>();

  let g: SVGGElement;

  $: if (drawHeight && g && yAxes && resources && layers) {
    draw();
  }

  async function draw() {
    if (g) {
      await tick();

      const gSelection = select(g);

      let totalWidth = 0;
      const axisClass = 'y-axis';
      gSelection.selectAll(`.${axisClass}`).remove();

      /**
       * TODO: This is a temporary solution to showing state mode changes as a line chart.
       * The correct way to do this would be generating a Y axes when the user toggles the line chart,
       * but for now we're just setting the Y axes dynamically based on the data.
       */
      const xRangeLayers = layers.filter(layer => layer.chartType === 'x-range');
      let i = 0;

      for (const layer of xRangeLayers) {
        const layerResources = filterResourcesByLayer(layer, resources) as Resource[];
        const xRangeAxisG = gSelection.append('g').attr('class', axisClass);
        xRangeAxisG.selectAll('*').remove();

        if ((layer as XRangeLayer).showAsLinePlot && layerResources && layerResources.length > 0) {
          let domain: string[] = [];

          // Get all the unique ordinal values of the chart.
          for (const value of layerResources[0].values) {
            if (domain.indexOf(value.y as string) === -1) {
              domain.push(value.y as string);
            }
          }

          const scale = getOrdinalYScale(domain, drawHeight);
          // Don't do any special formatting here because we're dealing with strings.
          const axisLeft = d3AxisLeft(scale as AxisScale<string>)
            .tickSizeInner(0)
            .tickSizeOuter(0)
            .ticks(domain.length)
            .tickPadding(2);
          const axisMargin = 2;
          const startPosition = -(totalWidth + axisMargin * i);
          xRangeAxisG.attr('transform', `translate(${startPosition}, 0)`);
          xRangeAxisG.style('color', 'black');
          xRangeAxisG.call(axisLeft);
          xRangeAxisG.call(g => g.select('.domain').remove());

          totalWidth += getBoundingClientRectWidth(xRangeAxisG.node());
        }

        drawSeparator(xRangeAxisG);
        i++;
      }

      let j = 0;
      for (let i = 0; i < yAxes.length; ++i) {
        const axis = yAxes[i];
        const tickCount = axis.tickCount ?? 1;
        if (tickCount < 1) {
          continue;
        }

        const axisG = gSelection.append('g').attr('class', axisClass);
        axisG.selectAll('*').remove();

        // Get color for axis by examining associated layers. If more than one layer is associated,
        // use the default axis color, otherwise use the color from the layer.
        // TODO we don't expose y-axis color and this refactor would elimate need to store it in view.
        // That is unless we want to allow user override of this behavior?
        let color = axis.color;
        const yAxisLayers = layers.filter(layer => layer.yAxisId === axis.id && layer.chartType === 'line');
        if (yAxisLayers.length === 1) {
          color = (yAxisLayers[0] as LineLayer).lineColor;
        }

        // TODO deprecate these view properties?
        // const labelColor = axis.label?.color || 'black';
        // const labelFontFace = axis.label?.fontFace || 'sans-serif';
        // const labelFontSize = axis.label?.fontSize || 12;
        // const labelText = axis.label.text;
        if (
          axis.scaleDomain &&
          axis.scaleDomain.length === 2 &&
          typeof axis.scaleDomain[0] === 'number' &&
          typeof axis.scaleDomain[1] === 'number'
        ) {
          const domain = axis.scaleDomain;
          const scale = getYScale(domain, drawHeight);
          const axisLeft = d3AxisLeft(scale)
            .tickSizeInner(0)
            .tickSizeOuter(0)
            .ticks(tickCount)
            .tickFormat(n => {
              // Format -1 to 1 as normal numbers instead of <number>m (milli) which d3
              // does out of the box to align with various standards but which can be
              // commonly confused for M (million).
              const number = n as number;
              if (number > -1 && number < 1) {
                return d3Format('.2r')(n);
              }
              return d3Format('~s')(n);
            })
            .tickPadding(2);

          const axisMargin = 2;
          const startPosition = -(totalWidth + axisMargin * j);
          axisG.attr('transform', `translate(${startPosition}, 0)`);
          axisG.style('color', color);
          if (domain.length === 2 && domain[0] !== null && domain[1] !== null) {
            axisG.call(axisLeft);
            axisG.call(g => g.select('.domain').remove());
          }
          drawSeparator(axisG);
          totalWidth += getBoundingClientRectWidth(axisG.node());
          j++;
        }
      }

      // Dispatch the width so the RowHeader can recalculate the label width.
      dispatch('updateYAxesWidth', totalWidth);
    }
  }

  function drawSeparator(axisG: Selection<SVGGElement, unknown, null, undefined>): void {
    axisG
      .append('line')
      .attr('x1', 2)
      .attr('y1', 0)
      .attr('x2', 2)
      .attr('y2', drawHeight)
      .style('stroke', '#EBECEC')
      .style('stroke-width', 2);
  }

  function getBoundingClientRectWidth(axisG: SVGGElement | null): number {
    if (axisG !== null) {
      return axisG.getBoundingClientRect().width + 4;
    }

    return 0;
  }
</script>

<svg class="row-y-axes">
  <g transform="translate({drawWidth}, 0)">
    <g bind:this={g} />
  </g>
</svg>

<style>
  .row-y-axes {
    height: 100%;
    width: 100%;
  }

  :global(.y-axis) {
    font-family: Inter;
    font-size: 10px;
    font-style: normal;
    font-weight: 500;
    letter-spacing: 0.2px;
    line-height: 16px;
    user-select: none;
  }

  /* :global(.y-axis .tick line) {
    color: red;
  } */
</style>
