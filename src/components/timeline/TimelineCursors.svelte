<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { getDoyTime } from '../../utilities/time';

  export let cursorEnabled: boolean = true;
  export let cursorHeaderHeight: number = 20;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let mouseOver: MouseOver;
  export let histogramCursorTime: Date | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;

  $: onCursorEnableChange(cursorEnabled);
  $: onMouseOver(mouseOver);
  $: onHistogramCursorTime(histogramCursorTime);
  $: if (xScaleView) {
    hideCursor();
  }

  let cursorDiv: HTMLElement = null;
  let cursorLabelDiv: HTMLElement = null;
  let offsetX: number = -1;
  let raf: number = null;

  function onMouseOver(event: MouseOver | undefined) {
    if (event && xScaleView && cursorDiv && cursorLabelDiv) {
      offsetX = event.e.offsetX;
      updateCursor();
    } else {
      hideCursor();
    }
  }

  function onHistogramCursorTime(date: Date | undefined) {
    if (!cursorEnabled) {
      return;
    }

    let dateWithinView = true;
    if (!xScaleView) {
      dateWithinView = false;
    }

    const viewStart = xScaleView.domain()[0];
    const viewEnd = xScaleView.domain()[1];

    if (date < viewStart || date > viewEnd) {
      dateWithinView = false;
    }

    if (dateWithinView) {
      updateCursor();
    } else {
      hideCursor();
    }
  }

  function onCursorEnableChange(cursorEnabled: boolean) {
    if (cursorEnabled) {
      updateCursor();
    } else {
      hideCursor();
    }
  }

  function updateCursor() {
    if ((cursorEnabled && offsetX >= 0 && offsetX <= drawWidth) || histogramCursorTime) {
      let unixEpochTime = 0;
      let doyTime = '';
      let x = 0;
      if (histogramCursorTime) {
        unixEpochTime = histogramCursorTime.getTime();
        doyTime = getDoyTime(new Date(unixEpochTime));
        x = xScaleView(unixEpochTime);
      } else {
        unixEpochTime = xScaleView.invert(offsetX).getTime();
        doyTime = getDoyTime(new Date(unixEpochTime));
        x = offsetX;
      }

      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        cursorLabelDiv.textContent = doyTime;
        const cursorLabelWidth = cursorLabelDiv.getBoundingClientRect().width;
        if (x + cursorLabelWidth + 10 > drawWidth) {
          cursorLabelDiv.style.transform = 'translateX(calc(-100% - 10px))';
        } else {
          cursorLabelDiv.style.transform = 'translateX(10px)';
        }
        cursorDiv.style.opacity = '1.0';
        cursorDiv.style.transform = `translateX(${x + marginLeft - 1}px)`;
      });
    } else {
      hideCursor();
    }
  }

  function hideCursor() {
    if (!cursorDiv) {
      return;
    }

    cancelAnimationFrame(raf);
    raf = window.requestAnimationFrame(() => {
      cursorDiv.style.opacity = '0';
    });
  }
</script>

<div class="timeline-cursor-margin" style="height: {cursorHeaderHeight}px" />
<div class="timeline-cursor-container">
  <div class="timeline-cursor-header" />
  <div bind:this={cursorDiv} class="timeline-cursor">
    <div bind:this={cursorLabelDiv} class="timeline-cursor-label" />
  </div>
</div>

<style>
  .timeline-cursor-margin {
    position: relative;
  }

  .timeline-cursor-container {
    height: 100%;
    pointer-events: none;
    position: absolute;
    width: 100%;
  }

  .timeline-cursor-header {
    height: 1rem;
    position: relative;
  }

  .timeline-cursor {
    height: calc(100% + 0.5rem);
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: -10px;
    transform: translateX(0);
  }

  .timeline-cursor::before {
    background-color: var(--st-gray-50);
    border-radius: 100%;
    content: '';
    display: block;
    height: 9px;
    left: -4px;
    position: absolute;
    top: -0.5rem;
    width: 9px;
  }

  .timeline-cursor::after {
    background-color: var(--st-gray-50);
    content: '';
    display: block;
    height: 100%;
    left: 0;
    position: absolute;
    top: -0.5rem;
    width: 1px;
  }

  .timeline-cursor-label {
    font-size: 10px;
    left: 0;
    position: relative;
    top: -11px;
    white-space: nowrap;
  }
</style>
